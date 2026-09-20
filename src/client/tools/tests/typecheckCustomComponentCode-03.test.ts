import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "../typecheckCustomComponentCode";
import { backendResources } from "../../../backendResourcesImpl";

const checker = new CustomComponentCodeTypescript(backendResources);

/*
 * Broken syntax is what the annotator meets most often - it runs on half-written code, before the
 * author is done. It parses the source itself to find the hooks, so a parse error anywhere could
 * cost it a hook, an annotation, or the line map; these pin that it still reports the author's own
 * lines whatever is broken and wherever.
 */
describe("broken syntax", () => {
  test("inside a hook body", () => {
    expect(checker.typecheck("function validate (instance, puzzle) {\n  const x = ;\n  return true\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS1109: Expression expected.

2   const x = ;
              ~`,
    );
  });

  /*
   * A trailing comma in a parameter list is legal JavaScript, so there is nothing to report - the
   * hook is still found and still annotated.
   */
  test("a trailing comma in a hook's parameter list is not an error", () => {
    expect(checker.typecheck("function validate (instance, ) {\n  return true\n}")).toBeUndefined();
  });

  test("a trailing comma does not cost the hook its types", () => {
    expect(checker.typecheck("function validate (instance, ) {\n  return instance.name.toFixed(2)\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

2   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("a broken parameter list, with a stray comma first", () => {
    expect(checker.typecheck("function validate (, puzzle) {\n  return true\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS1138: Parameter declaration expected.

1 function validate (, puzzle) {
                     ~`,
    );
  });

  /*
   * Code this broken produces a mess, and this records it rather than claiming it is good. With the
   * parameter list unclosed, TypeScript takes the body for a third parameter, so our extra-parameter
   * finding underlines the whole body - the one line of ours among nine of the compiler's. Nothing
   * here is worth patching: the output is only as good as the input, and an author this
   * mid-keystroke is not reading it.
   */
  test("a parameter list left unclosed", () => {
    expect(checker.typecheck("function validate (instance, puzzle {\n  return true\n}")).toBe(
      `[WARNING] TypeScript found 10 problem(s) in the new component code. The change WAS applied.

line 1 - error TS8017: Signature declarations can only be used in TypeScript files.

1 function validate (instance, puzzle {
           ~~~~~~~~

lines 1-3 - error: 'validate' must have exactly 2 arguments

1 function validate (instance, puzzle {
                                      ~
2   return true
  ~~~~~~~~~~~~~
3 }
  ~

line 1 - error TS1005: ',' expected.

1 function validate (instance, puzzle {
                                      ~

line 2 - error TS2300: Duplicate identifier '(Missing)'.

2   return true
          ~

line 2 - error TS2842: '(Missing)' is an unused renaming of 'return'. Did you intend to use it as a type annotation?

2   return true
          ~

line 2 - error TS1005: ':' expected.

2   return true
           ~~~~

line 2 - error TS2300: Duplicate identifier '(Missing)'.

2   return true
               ~

line 2 - error TS2842: '(Missing)' is an unused renaming of 'true'. Did you intend to use it as a type annotation?

2   return true
               ~

line 3 - error TS1005: ':' expected.

3 }
  ~

line 3 - error TS1005: ')' expected.

3 }
   ~`,
    );
  });

  test("in a hook's declaration, with the name missing", () => {
    expect(checker.typecheck("function (instance, puzzle) {\n  return true\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS1003: Identifier expected.

1 function (instance, puzzle) {
           ~`,
    );
  });

  test("outside every hook", () => {
    expect(
      checker.typecheck("const broken = ;\n\nfunction validate (instance, puzzle) {\n  return puzzle.nope()\n}"),
    ).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.

line 1 - error TS1109: Expression expected.

1 const broken = ;
                 ~

line 4 - error TS2339: Property 'nope' does not exist on type 'Puzzle'.

4   return puzzle.nope()
                  ~~~~`,
    );
  });

  /* The hook below the break still has to be found, annotated, and reported on its own line. */
  test("before a hook, which is still typed", () => {
    expect(checker.typecheck("const broken = ;\nfunction validate (instance, puzzle) {\n  return 1\n}")).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.

line 1 - error TS1109: Expression expected.

1 const broken = ;
                 ~

line 3 - error TS2322: Type 'number' is not assignable to type 'boolean'.

3   return 1
    ~~~~~~`,
    );
  });

  test("an unterminated string in a hook body", () => {
    expect(checker.typecheck(`function* update (instance, puzzle) {\n  yield puzzle.stop("oops)\n}`)).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.

line 2 - error TS1002: Unterminated string literal.

2   yield puzzle.stop("oops)
                            ~

line 3 - error TS1005: ',' expected.

3 }
  ~`,
    );
  });
});

describe("what each hook must return", () => {
  test("validate returning a string is reported", () => {
    expect(checker.typecheck(`function validate (instance, puzzle) {\n  return "nope"\n}`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2322: Type 'string' is not assignable to type 'boolean'.

2   return "nope"
    ~~~~~~`,
    );
  });

  test("a generator yielding something that is not a solver action is reported", () => {
    expect(checker.typecheck("function* update (instance, puzzle) {\n  yield 42\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2322: Type 'number' is not assignable to type 'Change'.

2   yield 42
          ~~`,
    );
  });

  /* Easy to write by mistake, and it silently does nothing at runtime. */
  test("yielding a value-returning call instead of an action is reported", () => {
    expect(
      checker.typecheck("function* update (instance, puzzle) {\n  yield puzzle.getValue(instance.cells[0])\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2322: Type 'number' is not assignable to type 'Change'.

2   yield puzzle.getValue(instance.cells[0])
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
    );
  });

  test("getAffectedCells returning the wrong type is reported", () => {
    expect(checker.typecheck(`function getAffectedCells (a) {\n  return "nope"\n}`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2322: Type 'string' is not assignable to type 'number[]'.

2   return "nope"
    ~~~~~~`,
    );
  });

  test("getAffectedCells that forgets to return is reported", () => {
    expect(checker.typecheck("function getAffectedCells (cells) {\n  cells.filter(c => c > 0)\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

lines 1-3 - error TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.

1 function getAffectedCells (cells) {
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
2   cells.filter(c => c > 0)
  ~~~~~~~~~~~~~~~~~~~~~~~~~~
3 }
  ~`,
    );
  });
});

/*
 * A hook declared and left empty is the shape the app's boilerplate ships, and it is a defect: the
 * hook exists to return something. TypeScript reports it against the declaration, which is the line
 * the checker injects - so these pin that it is attributed to the author's own function instead.
 */
describe("a hook that never returns", () => {
  test("an empty getAffectedCells is reported on its own line", () => {
    expect(checker.typecheck("function getAffectedCells (param1, param2) {\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

lines 1-2 - error TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.

1 function getAffectedCells (param1, param2) {
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
2 }
  ~`,
    );
  });

  test("an empty validate is reported on its own line", () => {
    expect(checker.typecheck("const x = 1;\n\nfunction validate (instance, puzzle) {\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

lines 3-4 - error TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.

3 function validate (instance, puzzle) {
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
4 }
  ~`,
    );
  });

  test("the hooks that return nothing stay clean", () => {
    expect(
      checker.typecheck("function setParams (instance, p) {\n}\nfunction* initialize (instance, puzzle) {\n}"),
    ).toBeUndefined();
  });
});

/*
 * Every hook is optional and the app finds each one by name, so a component may declare any subset
 * in any order - and each one is typed with what the app passes to that hook, not with whatever the
 * hook before it takes.
 */
describe("which hooks a component declares, and in what order", () => {
  test("a lone getAffectedCells is typed by its own return", () => {
    expect(checker.typecheck(`function getAffectedCells (cells) {\n  return "not cells"\n}`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2322: Type 'string' is not assignable to type 'number[]'.

2   return "not cells"
    ~~~~~~`,
    );
  });

  test("a lone setParams is typed by its own instance", () => {
    expect(checker.typecheck("function setParams (instance, p) {\n  instance.cells = p\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2540: Cannot assign to 'cells' because it is a read-only property.

2   instance.cells = p
             ~~~~~`,
    );
  });

  test("a lone initialize is typed by its own puzzle", () => {
    expect(checker.typecheck("function* initialize (instance, puzzle) {\n  yield puzzle.nope()\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'nope' does not exist on type 'Puzzle'.

2   yield puzzle.nope()
                 ~~~~`,
    );
  });

  test("a lone validate is typed by its own return", () => {
    expect(checker.typecheck("function validate (instance, puzzle) {\n  return 1\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2322: Type 'number' is not assignable to type 'boolean'.

2   return 1
    ~~~~~~`,
    );
  });

  test("a lone update is typed by what it yields", () => {
    expect(checker.typecheck("function* update (instance, puzzle) {\n  yield 42\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2322: Type 'number' is not assignable to type 'Change'.

2   yield 42
          ~~`,
    );
  });

  test("hooks declared in reverse order are each still typed correctly", () => {
    expect(
      checker.typecheck(`function* update (instance, puzzle) {
  yield puzzle.removeComponent(instance)
}

function validate (instance, puzzle) {
  return puzzle.getCellsAreFilled(instance.cells)
}

function setParams (instance, p) {
  instance.p = p
}

function getAffectedCells (cells) {
  return cells
}`),
    ).toBeUndefined();
  });

  test("a hook is typed by its name, not by its position among the others", () => {
    // `validate` is second, after a generator - if position drove the types this would not report.
    expect(
      checker.typecheck(
        `function* update (instance, puzzle) {\n  yield puzzle.removeComponent(instance)\n}\nfunction validate (instance, puzzle) {\n  return 1\n}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 5 - error TS2322: Type 'number' is not assignable to type 'boolean'.

5   return 1
    ~~~~~~`,
    );
  });

  test("with hooks reordered, each error still lands on its own line", () => {
    expect(
      checker.typecheck(
        `function* update (instance, puzzle) {\n  yield 42\n}\nfunction validate (instance, puzzle) {\n  return 1\n}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2322: Type 'number' is not assignable to type 'Change'.

2   yield 42
          ~~

line 5 - error TS2322: Type 'number' is not assignable to type 'boolean'.

5   return 1
    ~~~~~~`,
    );
  });
});

/*
 * `@param` binds by name, so the annotator names each tag after whatever the author called the
 * parameter. The types follow the position the app passes them in, not the name.
 */
describe("hook parameters named differently", () => {
  test("a renamed puzzle still carries its type", () => {
    expect(checker.typecheck("function* update (self, p) {\n  yield p.nope()\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'nope' does not exist on type 'Puzzle'.

2   yield p.nope()
            ~~~~`,
    );
  });

  test("a renamed instance still carries its type", () => {
    expect(checker.typecheck("function validate (self, p) {\n  return self.name.toFixed(2)\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

2   return self.name.toFixed(2)
                     ~~~~~~~`,
    );
  });

  test("renamed parameters used correctly are clean", () => {
    expect(
      checker.typecheck("function* update (self, p) {\n  yield p.removeCandidateFromCell(1, self.cells[0])\n}"),
    ).toBeUndefined();
  });

  test("swapping the two names does not swap their types", () => {
    // Whatever they are called, the first parameter is the instance and the second is the puzzle -
    // so here `instance.cells` is a puzzle without a `cells`.
    expect(
      checker.typecheck("function validate (puzzle, instance) {\n  return puzzle.getCellsAreFilled(instance.cells)\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'cells' does not exist on type 'Puzzle'.

2   return puzzle.getCellsAreFilled(instance.cells)
                                             ~~~~~`,
    );
  });
});
