import * as ts from "typescript";
import { SmCodeMapper } from "./SmCodeMapper";
import type {
  ConvertReferencable,
  ConvertValue,
  IndexClass,
  IndexFunction,
  IndexFunctionSignature,
  IndexReferencable,
  IndexValue,
} from "./types";

/**
 * Completes the raw index with everything the scanner couldn't work out for itself - it runs in
 * the page, stringified, so it can import nothing and captures only what plain JavaScript reveals.
 */
export class SmCodeEnricher extends SmCodeMapper<false> {
  protected mapValue<T extends IndexValue<false>>(value: T): ConvertValue<false, false, T> {
    type ResultT = ConvertValue<false, false, T>;

    if (value.type === "function") {
      // All the scanner could take of a function is its source text.
      return {
        ...value,
        ...this.parseFunctionSignature(value.code),
      } satisfies IndexFunction as ResultT;
    }

    return super.mapValue(value);
  }

  protected mapReferencable<T extends IndexReferencable<false>>(value: T): ConvertReferencable<false, false, T> {
    type ResultT = ConvertReferencable<false, false, T>;

    value = super.mapReferencable(value);

    if (value.type === "class") {
      // index.json doesn't need the class code
      return {
        ...value,
        code: undefined,
      } satisfies IndexClass<false> as ResultT;
    }

    return value as ResultT;
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
  private parseFunctionSignature(code: string): IndexFunctionSignature {
    const parsed = this.parseSignatureDeclaration(code);
    if (!parsed) {
      throw new Error(`Failed to parse the signature of a scanned function:\n${code}`);
    }
    const { declaration, checker } = parsed;

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

    return {
      requiredArgs: requiredArgs || undefined,
      optionalArgs: optionalArgs || undefined,
      hasRestArg: hasRestArg || undefined,
      returnType,
    };
  }
}
