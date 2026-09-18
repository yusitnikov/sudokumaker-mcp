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

  /** Parses `source`, returning the file only if it has no syntax errors. */
  private parseSource(source: string) {
    const file = ts.createSourceFile("signature.ts", source, ts.ScriptTarget.ESNext, true);
    const { parseDiagnostics } = file as ts.SourceFile & { parseDiagnostics: ts.Diagnostic[] };

    return parseDiagnostics.length === 0 ? file : undefined;
  }

  /** Unwraps `(<expression>)` back to the expression it parenthesizes. */
  private getParenthesizedExpression(file: ts.SourceFile | undefined) {
    const statement = file?.statements[0];

    return statement && ts.isExpressionStatement(statement) && ts.isParenthesizedExpression(statement.expression)
      ? statement.expression.expression
      : undefined;
  }

  /**
   * Finds the node carrying the parameter list of a function whose source came from
   * `Function.prototype.toString()`.
   *
   * What that returns isn't a statement on its own: a standalone function or arrow needs
   * parenthesizing to become an expression, and a method shorthand or accessor (`getX(a) {}`) is
   * only valid as a member of an object literal.
   */
  private parseSignatureDeclaration(code: string): ts.SignatureDeclaration | undefined {
    const expression = this.getParenthesizedExpression(this.parseSource(`(${code})`));
    if (expression && (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression))) {
      return expression;
    }

    const literal = this.getParenthesizedExpression(this.parseSource(`({${code}})`));
    if (literal && ts.isObjectLiteralExpression(literal) && literal.properties.length === 1) {
      const property = literal.properties[0];
      if (ts.isMethodDeclaration(property) || ts.isAccessor(property)) {
        return property;
      }
    }

    return undefined;
  }

  /** Recovers how many arguments a scanned function takes, by parsing its source. */
  private parseFunctionSignature(code: string): IndexFunctionSignature {
    const declaration = this.parseSignatureDeclaration(code);
    if (!declaration) {
      throw new Error(`Failed to parse the signature of a scanned function:\n${code}`);
    }

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

    return {
      requiredArgs: requiredArgs || undefined,
      optionalArgs: optionalArgs || undefined,
      hasRestArg: hasRestArg || undefined,
    };
  }
}
