import { describe, expect, test } from "vitest";
import { type SnippetProblem, SnippetTypescript, type SnippetTypescriptAnnotatorResult } from "./typecheckSnippet";
import { backendResources } from "../../backendResourcesImpl";

const checker = new SnippetTypescript(backendResources, "generic code");

describe("what the worker environment provides", () => {
  test("console is available", () => {
    expect(checker.typecheck(`console.log("hi");`)).toBeUndefined();
  });

  test("reports DOM globals, which the worker does not have", () => {
    expect(checker.typecheck(`document.querySelector("div");`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 1 - error TS2584: Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.

1 document.querySelector("div");
  ~~~~~~~~`,
    );
  });

  test("reports top-level await exactly once", () => {
    expect(checker.typecheck("const x = await Promise.resolve(1);")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 1 - error TS1375: 'await' expressions are only allowed at the top level of a file when that file is a module, but this file has no imports or exports. Consider adding an empty 'export {}' to make this file a module.

1 const x = await Promise.resolve(1);
            ~~~~~`,
    );
  });

  test("reports top-level return", () => {
    expect(checker.typecheck("return 5;")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 1 - error TS1108: A 'return' statement can only be used within a function body.

1 return 5;
  ~~~~~~`,
    );
  });

  test("constructing a scanned class is not a false positive", () => {
    expect(checker.typecheck("const set = DigitSet.from([1, 2, 3]);")).toBeUndefined();
  });
});

describe("how a problem is reported", () => {
  test("reports a syntax error rather than throwing", () => {
    expect(checker.typecheck("const x = ;")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 1 - error TS1109: Expression expected.

1 const x = ;
            ~`,
    );
  });

  test("reports an unclosed brace at the end of the snippet", () => {
    expect(checker.typecheck("if (true) {\n  const x = 1;\n")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 3 - error TS1005: '}' expected.

3 
  ~`,
    );
  });

  test("reports a stray closing brace", () => {
    expect(checker.typecheck("const x = 1;\n}\n")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 2 - error TS1128: Declaration or statement expected.

2 }
  ~`,
    );
  });

  /* Checking continues past a parse error, so both are reported, in line order. */
  test("a syntax error is reported ahead of a type error further down", () => {
    expect(checker.typecheck("const x = ;\nnoSuchName();\n")).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new generic code. The change WAS applied.

line 1 - error TS1109: Expression expected.

1 const x = ;
            ~

line 2 - error TS2304: Cannot find name 'noSuchName'.

2 noSuchName();
  ~~~~~~~~~~`,
    );
  });

  test("reports the author's own line number, and echoes that line", () => {
    expect(checker.typecheck("const a = 1;\nconst b = 2;\nnoSuchName();\n")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 3 - error TS2304: Cannot find name 'noSuchName'.

3 noSuchName();
  ~~~~~~~~~~`,
    );
  });
});

/*
 * A scope that annotates the snippet before compiling it maps every line back, so both the reported
 * number and the echoed line come from what the author actually wrote.
 */
describe("mapping lines back to the author's", () => {
  test("the reported line and the echoed source are the author's", () => {
    class CheckerWithAnnotator extends SnippetTypescript {
      protected annotate(code: string): SnippetTypescriptAnnotatorResult {
        return {
          annotated: `// generated\n${code}`,
          toAuthorSpan: ({ start, end }) => ({
            start: { ...start, line: Math.max(start.line - 1, 0) },
            end: { ...end, line: Math.max(end.line - 1, 0) },
          }),
        };
      }
    }

    expect(new CheckerWithAnnotator(backendResources, "generic code").typecheck("noSuchName();")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 1 - error TS2304: Cannot find name 'noSuchName'.

1 noSuchName();
  ~~~~~~~~~~`,
    );
  });
});

/*
 * A problem spanning many lines is echoed only so far - past that the reader learns nothing from
 * more underlined source, and a long one would bury every problem after it. These are written
 * against `formatSnippetProblems` directly, with the span given rather than provoked: what is under
 * test is the rendering, and a compiler message would only add a sentence to predict.
 */
describe("how much of a long problem is echoed", () => {
  /** A snippet of `count` lines, each `aaa`, for a span to cover. */
  const sourceOf = (count: number) => Array.from({ length: count }, () => "aaa").join("\n");

  /** One problem covering whole lines `1` through `count`. */
  const spanning = (count: number): SnippetProblem => ({
    start: { line: 0, character: 0 },
    end: { line: count - 1, character: 3 },
    message: "Something is wrong.",
    code: 9999,
  });

  test("a span of ten lines is echoed whole", () => {
    expect(checker.formatProblems([spanning(10)], sourceOf(10))).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

lines 1-10 - error TS9999: Something is wrong.

 1 aaa
   ~~~
 2 aaa
   ~~~
 3 aaa
   ~~~
 4 aaa
   ~~~
 5 aaa
   ~~~
 6 aaa
   ~~~
 7 aaa
   ~~~
 8 aaa
   ~~~
 9 aaa
   ~~~
10 aaa
   ~~~`,
    );
  });

  /* The header still names the whole span - only the echo is cut. */
  test("a longer span is cut after ten lines, with the rest counted", () => {
    expect(checker.formatProblems([spanning(13)], sourceOf(13))).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

lines 1-13 - error TS9999: Something is wrong.

 1 aaa
   ~~~
 2 aaa
   ~~~
 3 aaa
   ~~~
 4 aaa
   ~~~
 5 aaa
   ~~~
 6 aaa
   ~~~
 7 aaa
   ~~~
 8 aaa
   ~~~
 9 aaa
   ~~~
10 aaa
   ~~~
   ... 3 more line(s)`,
    );
  });

  /* The gutter is as wide as the widest line number shown, so single digits are padded to match. */
  test("a span of nine lines needs no gutter padding", () => {
    expect(checker.formatProblems([spanning(9)], sourceOf(9))).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

lines 1-9 - error TS9999: Something is wrong.

1 aaa
  ~~~
2 aaa
  ~~~
3 aaa
  ~~~
4 aaa
  ~~~
5 aaa
  ~~~
6 aaa
  ~~~
7 aaa
  ~~~
8 aaa
  ~~~
9 aaa
  ~~~`,
    );
  });
});

/*
 * Every problem past the cap is dropped rather than printed, so one broken line near the top cannot
 * push a response to any length. The count in the header is still the true one.
 */
describe("how many problems are reported", () => {
  test("past twenty, the rest are counted and not shown", () => {
    const problems: SnippetProblem[] = Array.from({ length: 23 }, (_, line) => ({
      start: { line, character: 0 },
      end: { line, character: 1 },
      message: "Something is wrong.",
      code: 9999,
    }));

    const formatted = checker.formatProblems(problems, Array.from({ length: 23 }, () => "a").join("\n"));

    expect(formatted).toContain("TypeScript found 23 problem(s) in the new generic code.");
    expect(formatted).toContain(`line 20 - error TS9999: Something is wrong.

20 a
   ~`);
    expect(formatted).not.toContain("line 21 -");
    expect(formatted?.endsWith("(... and 3 more)")).toBe(true);
  });
});

/*
 * The worker runs the snippet as JavaScript, so it is checked as JavaScript. Several of these were
 * reported while it was checked as `.ts`; what a JS author still owes the checker is a type for a
 * variable that holds more than its initializer suggests.
 */
describe("checked as JavaScript", () => {
  test("growing an object past the shape it was created with is clean", () => {
    expect(checker.typecheck("const o = {};\no.newProp = 1;")).toBeUndefined();
  });

  test("redeclaring a function at top level is clean", () => {
    expect(checker.typecheck("function f() {\n  return 1;\n}\nfunction f() {\n  return 2;\n}")).toBeUndefined();
  });

  test("a parameter with no annotation is not an implicit-any error", () => {
    expect(checker.typecheck("function f(a, b) {\n  return a + b;\n}\nf(1, 2);")).toBeUndefined();
  });

  /*
   * A variable's type is inferred from its initializer, so reassigning it to another type is
   * reported. That is the author's cue to say what the variable actually holds, which a JSDoc
   * `@type` does - and the annotation is then enforced in turn.
   */
  test("reassigning a variable to another type is reported", () => {
    expect(checker.typecheck(`var v = 1;\nv = "two";`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 2 - error TS2322: Type 'string' is not assignable to type 'number'.

2 v = "two";
  ~`,
    );
  });

  test("a JSDoc type covering both types makes the reassignment clean", () => {
    expect(checker.typecheck(`/** @type {number | string} */\nvar v = 1;\nv = "two";`)).toBeUndefined();
  });

  test("a value outside the JSDoc type is still reported", () => {
    expect(checker.typecheck(`/** @type {number | string} */\nvar v = 1;\nv = true;`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new generic code. The change WAS applied.

line 3 - error TS2322: Type 'boolean' is not assignable to type 'string | number'.

3 v = true;
  ~`,
    );
  });
});

/*
 * A snippet with no statements is the one case where the file could be mistaken for a module and
 * lose every ambient global, turning every later snippet into a flood of "cannot find name".
 */
describe("code that does nothing", () => {
  test("an empty snippet is clean", () => {
    expect(checker.typecheck("")).toBeUndefined();
  });

  test("a whitespace-only snippet is clean", () => {
    expect(checker.typecheck("   \n\n  ")).toBeUndefined();
  });

  test("a comment-only snippet is clean", () => {
    expect(checker.typecheck("// nothing here")).toBeUndefined();
  });
});
