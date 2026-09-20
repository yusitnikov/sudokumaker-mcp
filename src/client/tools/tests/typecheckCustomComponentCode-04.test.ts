import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "../typecheckCustomComponentCode";
import { backendResources } from "../../../backendResourcesImpl";

const checker = new CustomComponentCodeTypescript(backendResources);

/*
 * `initialize`, `validate` and `update` are called with exactly `(instance, puzzle)`, so a further
 * parameter is always `undefined` at runtime - a mistake the compiler cannot see, since a hook is a
 * declaration and nothing checks it against the app's argument list.
 */
describe("a hook declaring a parameter the app never passes", () => {
  test("an extra parameter on validate is reported", () => {
    expect(checker.typecheck("function validate (instance, puzzle, extra) {\n  return !!extra\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error: 'validate' must have exactly 2 arguments

1 function validate (instance, puzzle, extra) {
                                       ~~~~~`,
    );
  });

  test("an extra parameter on update is reported", () => {
    expect(
      checker.typecheck("function* update (instance, puzzle, extra) {\n  yield puzzle.removeComponent(instance)\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error: 'update' must have exactly 2 arguments

1 function* update (instance, puzzle, extra) {
                                      ~~~~~`,
    );
  });

  test("an extra parameter on initialize is reported", () => {
    expect(
      checker.typecheck(
        "function* initialize (instance, puzzle, extra) {\n  yield puzzle.removeComponent(instance)\n}",
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error: 'initialize' must have exactly 2 arguments

1 function* initialize (instance, puzzle, extra) {
                                          ~~~~~`,
    );
  });

  test("several extra parameters are one problem underlining all of them", () => {
    expect(checker.typecheck("function validate (instance, puzzle, a, b, c) {\n  return !!a && !!b && !!c\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error: 'validate' must have exactly 2 arguments

1 function validate (instance, puzzle, a, b, c) {
                                       ~~~~~~~`,
    );
  });

  /* The span runs from the first extra parameter to the last, however they are laid out. */
  test("extra parameters written one per line are underlined across those lines", () => {
    expect(
      checker.typecheck(`function validate (
  instance,
  puzzle,
  extra,
  another,
) {
  return !!extra && !!another
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

lines 4-5 - error: 'validate' must have exactly 2 arguments

4   extra,
    ~~~~~~
5   another,
  ~~~~~~~~~`,
    );
  });

  /*
   * A blank line inside the span is echoed as itself and still underlined, so the block keeps one
   * `~` row per source line and the reader can count them off against the numbers.
   */
  test("a blank line inside the span is echoed and underlined", () => {
    expect(
      checker.typecheck(`function validate (
  instance,

  puzzle,

  extra1,

  extra2
) {
  return true;
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

lines 6-8 - error: 'validate' must have exactly 2 arguments

6   extra1,
    ~~~~~~~
7 
  ~
8   extra2
  ~~~~~~~~`,
    );
  });

  test("it is reported alongside a real type error, in line order", () => {
    expect(checker.typecheck("function validate (instance, puzzle, extra) {\n  return puzzle.nope()\n}")).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.

line 1 - error: 'validate' must have exactly 2 arguments

1 function validate (instance, puzzle, extra) {
                                       ~~~~~

line 2 - error TS2339: Property 'nope' does not exist on type 'Puzzle'.

2   return puzzle.nope()
                  ~~~~`,
    );
  });

  test("it is reported on the hook's own line, wherever the hook sits", () => {
    expect(
      checker.typecheck(
        `function setParams (instance, size) {
  instance.size = size
}

function validate (instance, puzzle, extra) {
  return puzzle.nope() && !!extra
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.

line 5 - error: 'validate' must have exactly 2 arguments

5 function validate (instance, puzzle, extra) {
                                       ~~~~~

line 6 - error TS2339: Property 'nope' does not exist on type 'Puzzle'.

6   return puzzle.nope() && !!extra
                  ~~~~`,
    );
  });

  /* A destructured parameter is underlined over the whole pattern, however many lines it takes. */
  test("a destructured extra parameter is underlined across the lines it is written on", () => {
    expect(
      checker.typecheck(`function validate (instance, puzzle, {
  first,
  second,
}) {
  return !!first && !!second
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

lines 1-4 - error: 'validate' must have exactly 2 arguments

1 function validate (instance, puzzle, {
                                       ~
2   first,
  ~~~~~~~~
3   second,
  ~~~~~~~~~
4 }) {
  ~`,
    );
  });

  test("the variadic hooks take the component's own constructor arguments, so they are not reported", () => {
    expect(
      checker.typecheck(
        "function getAffectedCells (a, b, c) {\n  return [a, b, c]\n}\nfunction setParams (instance, a, b, c) {\n  instance.a = a\n}",
      ),
    ).toBeUndefined();
  });

  test("an arrow hook's extra parameter is reported too", () => {
    expect(checker.typecheck("const validate = (instance, puzzle, extra) => !!extra;")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error: 'validate' must have exactly 2 arguments

1 const validate = (instance, puzzle, extra) => !!extra;
                                      ~~~~~`,
    );
  });

  test("the exact parameter count is clean", () => {
    expect(checker.typecheck("function validate (instance, puzzle) {\n  return true\n}")).toBeUndefined();
  });
});

describe("the shapes a component may be written in", () => {
  test("hooks declared as const arrows are checked", () => {
    expect(checker.typecheck("const validate = (instance, puzzle) => puzzle.getCandidatez(instance.cellIds[0]);")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS2551: Property 'getCandidatez' does not exist on type 'Puzzle'. Did you mean 'getCandidates'?

1 const validate = (instance, puzzle) => puzzle.getCandidatez(instance.cellIds[0]);
                                                ~~~~~~~~~~~~~`,
    );
  });

  test("hooks declared as function expressions are checked", () => {
    expect(
      checker.typecheck(
        "const update = function* (instance, puzzle) {\n  yield puzzle.getCandidatez(instance.cellIds[0])\n}",
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'getCandidatez' does not exist on type 'Puzzle'. Did you mean 'getCandidates'?

2   yield puzzle.getCandidatez(instance.cellIds[0])
                 ~~~~~~~~~~~~~`,
    );
  });

  test("all five hooks as zero-parameter const arrows are clean", () => {
    expect(
      checker.typecheck(`const getAffectedCells = () => [0];
const setParams = () => {};
const initialize = function*() {};
const validate = () => true;
const update = function*() {};`),
    ).toBeUndefined();
  });

  test("a hook declaring fewer parameters than the app passes is clean", () => {
    expect(checker.typecheck("function validate (instance) {\n  return !!instance.cells.length\n}")).toBeUndefined();
  });

  test("a non-hook helper function is left untyped, with no false positives", () => {
    expect(checker.typecheck("function myHelper (a, b) {\n  return a.whatever + b.anything\n}")).toBeUndefined();
  });

  test("a hook nested inside a block is left alone, as the app would leave it", () => {
    expect(
      checker.typecheck("if (true) {\n  function validate (instance, puzzle) {\n    return puzzle.nope()\n  }\n}"),
    ).toBeUndefined();
  });

  test("the author's own JSDoc above a hook is left alone", () => {
    expect(
      checker.typecheck("/** My own docs */\nfunction validate (instance, puzzle) {\n  return puzzle.nope()\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'nope' does not exist on type 'Puzzle'.

3   return puzzle.nope()
                  ~~~~`,
    );
  });

  test("no hooks at all is clean", () => {
    expect(checker.typecheck("const x = 1;")).toBeUndefined();
  });
});

/*
 * Only the JSDoc block nearest the function is read - an earlier one contributes nothing but
 * `@overload` - so the injected block is the whole of what types a hook, and it copies the author's
 * own `@param` for the constructor arguments it cannot type itself. What the author writes for a
 * parameter the app defines is therefore ignored, and what they write for a constructor argument is
 * what checks it.
 */
describe("the author's own @param tags", () => {
  test("a type the author gives a constructor argument is checked", () => {
    expect(
      checker.typecheck(
        `/** @param {string} param1 */
function setParams (instance, param1) {
  instance.param1 = param1.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   instance.param1 = param1.toFixed(2)
                             ~~~~~~~`,
    );
  });

  test("an untyped constructor argument stays unchecked", () => {
    expect(
      checker.typecheck("function setParams (instance, param1) {\n  instance.param1 = param1.anything()\n}"),
    ).toBeUndefined();
  });

  test("the author cannot retype a parameter the checker already types", () => {
    // The injected block sits nearest the function and names `puzzle` itself, so the author's block
    // is never read - `getCellsAreFilled` exists on the real type and on no `string`.
    expect(
      checker.typecheck(
        `/** @param {string} puzzle */
function validate (instance, puzzle) {
  return puzzle.getCellsAreFilled(instance.cells)
}`,
      ),
    ).toBeUndefined();
  });

  test("a retyped parameter is still checked against the real type", () => {
    // Misusing the real type's own result reports only if the injected tag is the one in force:
    // under the author's `{string}` the whole call would be unchecked.
    expect(
      checker.typecheck(
        `/** @param {string} puzzle */
function validate (instance, puzzle) {
  return puzzle.getCellsAreFilled(instance.cells).toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toFixed' does not exist on type 'boolean'.

3   return puzzle.getCellsAreFilled(instance.cells).toFixed(2)
                                                    ~~~~~~~`,
    );
  });

  test("an author's @returns does not loosen what the hook must return", () => {
    expect(
      checker.typecheck(
        `/** @returns {string} */
function validate (instance, puzzle) {
  return "nope"
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2322: Type 'string' is not assignable to type 'boolean'.

3   return "nope"
    ~~~~~~`,
    );
  });
});

/*
 * The author's type is copied as the source text of its own node, and a JSDoc type may be written
 * across as many lines as it likes. The injected block is a single line, so a copied type carrying
 * newlines would split it - and every line after the hook would then be echoed out of step with the
 * author's source. These pin the copy on the shapes that carry that risk.
 */
describe("the author's own JSDoc written across lines", () => {
  test("a multi-line block types a constructor argument", () => {
    expect(
      checker.typecheck(
        `/**
 * Sets the component up.
 * @param instance
 * @param {string} param1
 */
function setParams (instance, param1) {
  instance.param1 = param1.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

7   instance.param1 = param1.toFixed(2)
                             ~~~~~~~`,
    );
  });

  test("a type spanning lines is copied whole, and the hook stays on its own line", () => {
    expect(
      checker.typecheck(
        `/**
 * @param {{
 *   width: number,
 *   height: number,
 * }} param1
 */
function setParams (instance, param1) {
  instance.area = param1.width * param1.depth
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 8 - error TS2339: Property 'depth' does not exist on type '{ width: number; height: number; }'.

8   instance.area = param1.width * param1.depth
                                          ~~~~~`,
    );
  });

  test("a union spanning lines keeps every member", () => {
    expect(
      checker.typecheck(
        `/**
 * @param {
 *   | "row"
 *   | "column"
 * } param1
 */
function setParams (instance, param1) {
  instance.axis = param1.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 8 - error TS2551: Property 'toFixed' does not exist on type '"row" | "column"'. Did you mean 'fixed'?   Property 'toFixed' does not exist on type '"row"'.

8   instance.axis = param1.toFixed(2)
                           ~~~~~~~`,
    );
  });

  test("a multi-line type still leaves a later hook's errors on their own lines", () => {
    expect(
      checker.typecheck(
        `/**
 * @param {{
 *   width: number,
 * }} param1
 */
function setParams (instance, param1) {
  instance.width = param1.width
}

function validate (instance, puzzle) {
  return puzzle.nope()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 11 - error TS2339: Property 'nope' does not exist on type 'Puzzle'.

11   return puzzle.nope()
                   ~~~~`,
    );
  });
});

/*
 * A rest parameter collects every remaining constructor argument, so its tag types one of them
 * rather than the list - `{...T}`, not `{T[]}`. Getting that backwards would give each argument the
 * whole list's type, which reads as sound on a body that then misuses it.
 */
describe("a variadic hook's rest parameter", () => {
  test("the items of an untyped rest parameter stay unchecked", () => {
    expect(
      checker.typecheck("function getAffectedCells (...cells) {\n  return cells[0].anything()\n}"),
    ).toBeUndefined();
  });

  test("an untyped rest parameter is still checked as an array", () => {
    expect(checker.typecheck("function getAffectedCells (...cells) {\n  return cells.anything()\n}"))
      .toBe(`[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'anything' does not exist on type 'any[]'.

2   return cells.anything()
                 ~~~~~~~~`);
  });

  test("the author's type applies to one argument, not to the list", () => {
    // `cells` is `CellId[]`, so indexing it gives a `CellId` - a number, which has no `toUpperCase`.
    expect(
      checker.typecheck(
        `/** @param {CellId} cells */
function getAffectedCells (...cells) {
  return cells[0].toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

3   return cells[0].toUpperCase()
                    ~~~~~~~~~~~`,
    );
  });

  test("the list itself is an array of the author's type", () => {
    expect(
      checker.typecheck(
        `/** @param {CellId} cells */
function getAffectedCells (...cells) {
  return cells.toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number[]'.

3   return cells.toUpperCase()
                 ~~~~~~~~~~~`,
    );
  });

  test("an author who spelled the ... themselves is not doubled", () => {
    // `{...CellId}` and a `...cells` parameter both say rest; emitting `{......CellId}` would be a
    // malformed tag, and the parameter would fall back to an unchecked `any`.
    expect(
      checker.typecheck(
        `/** @param {...CellId} cells */
function getAffectedCells (...cells) {
  return cells[0].toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

3   return cells[0].toUpperCase()
                    ~~~~~~~~~~~`,
    );
  });

  test("a rest parameter after the known ones keeps those typed", () => {
    expect(
      checker.typecheck("function setParams (instance, ...params) {\n  instance.first = instance.name.toFixed(2)\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

2   instance.first = instance.name.toFixed(2)
                                   ~~~~~~~`,
    );
  });

  test("a typed rest parameter alongside the known ones is checked", () => {
    expect(
      checker.typecheck(
        `/** @param {string} names */
function setParams (instance, ...names) {
  instance.first = names[0].toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   instance.first = names[0].toFixed(2)
                              ~~~~~~~`,
    );
  });
});
