import { describe, expect, test } from "vitest";
import { formatSnippetProblems, getSnippetProblems, typecheckSnippet } from "./typecheckSnippet";
import { backendResources } from "../../backendResourcesImpl";

/*
 * These cases are about the checker itself - the program shape, the host, and how a diagnostic is
 * rendered - so they are written against one scope but hold for any. The initialization scope is
 * the one used, because it is the one that ships today; its own behaviour is tested next door in
 * `editInitializationCodeTool.test.ts`.
 */
const scope = { globals: backendResources.declarations.initialCodeGlobals };

const typecheck = (code: string) => typecheckSnippet(backendResources, scope, code, "initialization code");

describe("what the worker environment provides", () => {
  test("console is available", () => {
    expect(typecheck(`console.log("hi");`)).toBeUndefined();
  });

  test("reports DOM globals, which the worker does not have", () => {
    expect(typecheck(`document.querySelector("div");`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 1: Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.
  document.querySelector("div");`,
    );
  });

  test("reports top-level await exactly once", () => {
    expect(typecheck("const x = await Promise.resolve(1);")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 1: 'await' expressions are only allowed at the top level of a file when that file is a module, but this file has no imports or exports. Consider adding an empty 'export {}' to make this file a module.
  const x = await Promise.resolve(1);`,
    );
  });

  test("reports top-level return", () => {
    expect(typecheck("return 5;")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 1: A 'return' statement can only be used within a function body.
  return 5;`,
    );
  });

  test("constructing a scanned class is not a false positive", () => {
    expect(typecheck("const set = DigitSet.from([1, 2, 3]);")).toBeUndefined();
  });
});

describe("how a problem is reported", () => {
  test("reports a syntax error rather than throwing", () => {
    expect(typecheck("const x = ;")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 1: Expression expected.
  const x = ;`,
    );
  });

  test("reports an unclosed brace at the end of the snippet", () => {
    expect(typecheck("if (true) {\n  const x = 1;\n")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 3: '}' expected.
  `,
    );
  });

  test("reports a stray closing brace", () => {
    expect(typecheck("const x = 1;\n}\n")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 2: Declaration or statement expected.
  }`,
    );
  });

  /* Checking continues past a parse error, so both are reported, in line order. */
  test("a syntax error is reported ahead of a type error further down", () => {
    expect(typecheck("const x = ;\nnoSuchName();\n")).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new initialization code. The change WAS applied.
line 1: Expression expected.
  const x = ;
line 2: Cannot find name 'noSuchName'.
  noSuchName();`,
    );
  });

  test("reports the author's own line number, and echoes that line", () => {
    expect(typecheck("const a = 1;\nconst b = 2;\nnoSuchName();\n")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 3: Cannot find name 'noSuchName'.
  noSuchName();`,
    );
  });

  test("names whatever the caller says was edited", () => {
    expect(typecheckSnippet(backendResources, scope, "noSuchName();", "left-handed widget")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new left-handed widget. The change WAS applied.
line 1: Cannot find name 'noSuchName'.
  noSuchName();`,
    );
  });
});

/*
 * A scope that annotates the snippet before compiling it maps every line back, so both the reported
 * number and the echoed line come from what the author actually wrote.
 */
describe("mapping lines back to the author's", () => {
  test("the reported line and the echoed source are the author's", () => {
    const authorCode = "noSuchName();";
    const annotated = `// generated\n${authorCode}`;

    const problems = getSnippetProblems(backendResources, scope, authorCode, {
      compiled: annotated,
      toAuthorLine: (line) => Math.max(line - 1, 0),
    });

    expect(formatSnippetProblems(problems, authorCode, "initialization code")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 1: Cannot find name 'noSuchName'.
  noSuchName();`,
    );
  });
});

/*
 * The worker runs the snippet as JavaScript, so it is checked as JavaScript. Several of these were
 * reported while it was checked as `.ts`; what a JS author still owes the checker is a type for a
 * variable that holds more than its initializer suggests.
 */
describe("checked as JavaScript", () => {
  test("growing an object past the shape it was created with is clean", () => {
    expect(typecheck("const o = {};\no.newProp = 1;")).toBeUndefined();
  });

  test("redeclaring a function at top level is clean", () => {
    expect(typecheck("function f() {\n  return 1;\n}\nfunction f() {\n  return 2;\n}")).toBeUndefined();
  });

  test("a parameter with no annotation is not an implicit-any error", () => {
    expect(typecheck("function f(a, b) {\n  return a + b;\n}\nf(1, 2);")).toBeUndefined();
  });

  /*
   * A variable's type is inferred from its initializer, so reassigning it to another type is
   * reported. That is the author's cue to say what the variable actually holds, which a JSDoc
   * `@type` does - and the annotation is then enforced in turn.
   */
  test("reassigning a variable to another type is reported", () => {
    expect(typecheck(`var v = 1;\nv = "two";`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 2: Type 'string' is not assignable to type 'number'.
  v = "two";`,
    );
  });

  test("a JSDoc type covering both types makes the reassignment clean", () => {
    expect(typecheck(`/** @type {number | string} */\nvar v = 1;\nv = "two";`)).toBeUndefined();
  });

  test("a value outside the JSDoc type is still reported", () => {
    expect(typecheck(`/** @type {number | string} */\nvar v = 1;\nv = true;`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.
line 3: Type 'boolean' is not assignable to type 'string | number'.
  v = true;`,
    );
  });
});

/*
 * A snippet with no statements is the one case where the file could be mistaken for a module and
 * lose every ambient global, turning every later snippet into a flood of "cannot find name".
 */
describe("code that does nothing", () => {
  test("an empty snippet is clean", () => {
    expect(typecheck("")).toBeUndefined();
  });

  test("a whitespace-only snippet is clean", () => {
    expect(typecheck("   \n\n  ")).toBeUndefined();
  });

  test("a comment-only snippet is clean", () => {
    expect(typecheck("// nothing here")).toBeUndefined();
  });
});
