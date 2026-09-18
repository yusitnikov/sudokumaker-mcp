import * as ts from "typescript";
import { SmCodeMapper, type SmCodeMapperParentInfo } from "./SmCodeMapper";
import type { IndexClass, IndexFunction, IndexFunctionSignature } from "./types";

/** A scanned class compiled on its own, so its members can be looked up and typed. */
interface ParsedClass {
  members: Map<string, ts.SignatureDeclaration>;
  checker: ts.TypeChecker;
}

/**
 * Completes the raw index with everything the scanner couldn't work out for itself - it runs in
 * the page, stringified, so it can import nothing and captures only what plain JavaScript reveals.
 */
export class SmCodeEnricher extends SmCodeMapper<false> {
  private classCache = new Map<IndexClass<false>, ParsedClass>();

  protected mapFunction(value: IndexFunction, parentInfo?: SmCodeMapperParentInfo): IndexFunction {
    /*
     * A method typed as part of its class knows what `this` is, so anything it reads off a sibling
     * member resolves - which is most of what the checker needs. On its own it would know nothing
     * but its own body.
     */
    if (parentInfo?.parent.type === "class") {
      const { parent, name } = parentInfo;

      let parsedClass = this.classCache.get(parent);
      if (!parsedClass) {
        parsedClass = this.parseClass(parent.code!.replace(/^\s*class\s+\w+\s*\{/, `class ${parent.reference.id} {`));
        this.classCache.set(parent, parsedClass);
      }

      const declaration = parsedClass.members.get(name);
      if (declaration) {
        return {
          ...value,
          ...this.getSignatureInfo(declaration, parsedClass.checker, value.isGenerator),
          code: undefined,
        };
      }
    }

    return {
      ...value,
      ...this.parseFunctionSignature(value.code!, value.isGenerator),
      code: undefined,
    };
  }

  /** Compiles one scanned class, indexing the members that carry a parameter list by name. */
  private parseClass(code: string): ParsedClass {
    const parsed = this.parseSource(`(${code})`);
    const expression = parsed && this.getParenthesizedExpression(parsed.file);
    if (!parsed || !expression || !ts.isClassExpression(expression)) {
      throw new Error("Failed to parse class");
    }

    const members = new Map<string, ts.SignatureDeclaration>();
    for (const member of expression.members) {
      // A computed name (`[Symbol.iterator]`) has no name the index could refer to it by.
      if ((ts.isMethodDeclaration(member) || ts.isAccessor(member)) && ts.isIdentifier(member.name)) {
        members.set(member.name.text, member);
      }
    }

    return { members, checker: parsed.checker };
  }

  protected mapClass(value: IndexClass<false>): IndexClass<false> {
    // index.json doesn't need the class code
    return {
      ...super.mapClass(value),
      code: undefined,
    };
  }

  private static readonly sourceFileName = "/signature.ts";

  /**
   * Compiles `source` as a one-file program, returning it only if it has no syntax errors.
   *
   * It's a whole program rather than a detached source file because the return type has to be
   * inferred: the code carries no annotations, so only a checker can say what a function returns.
   */
  private parseSource(source: string) {
    const options: ts.CompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      lib: ["lib.esnext.d.ts"],
      allowJs: true,
      noResolve: true,
      noLib: false,
      types: [],
    };

    const host = ts.createCompilerHost(options);
    const readDiskFile = host.getSourceFile.bind(host);
    host.getSourceFile = (fileName, languageVersion, ...rest) =>
      fileName === SmCodeEnricher.sourceFileName
        ? ts.createSourceFile(fileName, source, languageVersion, true)
        : readDiskFile(fileName, languageVersion, ...rest);
    host.fileExists = (fileName) => fileName === SmCodeEnricher.sourceFileName || ts.sys.fileExists(fileName);
    host.readFile = (fileName) => (fileName === SmCodeEnricher.sourceFileName ? source : ts.sys.readFile(fileName));

    const program = ts.createProgram([SmCodeEnricher.sourceFileName], options, host);
    const file = program.getSourceFile(SmCodeEnricher.sourceFileName);
    if (!file || program.getSyntacticDiagnostics(file).length !== 0) {
      return undefined;
    }

    return { file, checker: program.getTypeChecker() };
  }

  /** Unwraps `(<expression>)` back to the expression it parenthesizes. */
  private getParenthesizedExpression(file: ts.SourceFile) {
    const statement = file.statements[0];

    return statement && ts.isExpressionStatement(statement) && ts.isParenthesizedExpression(statement.expression)
      ? statement.expression.expression
      : undefined;
  }

  /**
   * Finds the node carrying the parameter list of a function whose source came from
   * `Function.prototype.toString()`, along with the checker that can type it.
   *
   * What that returns isn't a statement on its own: a standalone function or arrow needs
   * parenthesizing to become an expression, and a method shorthand or accessor (`getX(a) {}`) is
   * only valid as a member of an object literal.
   */
  private parseSignatureDeclaration(code: string) {
    const parsedExpression = this.parseSource(`(${code})`);
    if (parsedExpression) {
      const expression = this.getParenthesizedExpression(parsedExpression.file);
      if (expression && (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression))) {
        return { declaration: expression as ts.SignatureDeclaration, checker: parsedExpression.checker };
      }
    }

    const parsedMember = this.parseSource(`({${code}})`);
    if (parsedMember) {
      const literal = this.getParenthesizedExpression(parsedMember.file);
      if (literal && ts.isObjectLiteralExpression(literal) && literal.properties.length === 1) {
        const property = literal.properties[0];
        if (ts.isMethodDeclaration(property) || ts.isAccessor(property)) {
          return { declaration: property as ts.SignatureDeclaration, checker: parsedMember.checker };
        }
      }
    }

    return undefined;
  }

  /** Recovers how many arguments a scanned function takes, by parsing its source. */
  private parseFunctionSignature(code: string, isGenerator?: boolean): IndexFunctionSignature {
    const parsed = this.parseSignatureDeclaration(code);
    if (!parsed) {
      throw new Error(`Failed to parse the signature of a scanned function:\n${code}`);
    }

    return this.getSignatureInfo(parsed.declaration, parsed.checker, isGenerator);
  }

  /** Reads the argument counts off a parsed declaration, and the return type the checker infers. */
  private getSignatureInfo(
    declaration: ts.SignatureDeclaration,
    checker: ts.TypeChecker,
    isGenerator?: boolean,
  ): IndexFunctionSignature {
    let requiredArgs = 0;
    let optionalArgs = 0;
    let hasRestArg = false;

    for (const parameter of declaration.parameters) {
      if (parameter.dotDotDotToken) {
        // A rest parameter is always last, and isn't one of the counted positional ones.
        hasRestArg = true;
      } else if (parameter.initializer || parameter.questionToken || optionalArgs > 0) {
        // Everything following a defaulted parameter can be omitted too, whatever it looks like.
        optionalArgs++;
      } else {
        requiredArgs++;
      }
    }

    /*
     * The code has no type annotations, so this is what the checker infers from the body. Most of
     * it resolves to nothing - a minified body calls minified internals that were never part of
     * the scan - and those come back as `any`, which the emitter treats as "unknown" anyway.
     */
    let returnType: string | undefined;
    try {
      const signature = checker.getSignatureFromDeclaration(declaration);
      const inferred = signature && checker.getReturnTypeOfSignature(signature);
      if (inferred) {
        const text = checker.typeToString(inferred, undefined, ts.TypeFormatFlags.NoTruncation);
        // An unresolved internal infers as `any` or `error`, which says nothing worth recording.
        if (text !== "any" && text !== "error") {
          returnType = text;
        }
      }
    } catch {
      // The checker throws on some shapes it can't resolve at all - no return type, then.
    }

    if (returnType && isGenerator) {
      returnType = returnType.replace(/,\s*(any|unknown|boolean)>$/, ", undefined>");
    }

    return {
      requiredArgs: requiredArgs || undefined,
      optionalArgs: optionalArgs || undefined,
      hasRestArg: hasRestArg || undefined,
      returnType,
    };
  }
}
