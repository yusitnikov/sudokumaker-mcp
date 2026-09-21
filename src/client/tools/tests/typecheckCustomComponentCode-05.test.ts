import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "../typecheckCustomComponentCode";
import { backendResources } from "../../../backendResourcesImpl";

const checker = new CustomComponentCodeTypescript(backendResources, {});

/*
 * A default value says what the author expects to receive, so it types the parameter when they wrote
 * no `@param` for it - the checker must not throw that away. A tag of their own still wins, and the
 * default must then satisfy it.
 */
describe("a constructor argument with a default value", () => {
  test("an empty array default makes the parameter a list", () => {
    expect(
      checker.typecheck("function getAffectedCells (cell, extraCells = []) {\n  return extraCells.anything()\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'anything' does not exist on type 'any[]'.

2   return extraCells.anything()
                      ~~~~~~~~`,
    );
  });

  test("an item of a parameter defaulted to an empty array has no known type", () => {
    // The default says it is a list and nothing says of what, so the element stays unchecked.
    expect(
      checker.typecheck("function getAffectedCells (cell, extraCells = []) {\n  return extraCells[0].anything()\n}"),
    ).toBeUndefined();
  });

  test("a scalar default types the parameter", () => {
    expect(
      checker.typecheck("function getAffectedCells (cell, size = 3) {\n  return [cell, size.toUpperCase()]\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

2   return [cell, size.toUpperCase()]
                       ~~~~~~~~~~~`,
    );
  });

  test("a populated array default types the parameter", () => {
    expect(
      checker.typecheck("function getAffectedCells (cell, extraCells = [1, 2]) {\n  return extraCells.anything()\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'anything' does not exist on type 'number[]'.

2   return extraCells.anything()
                      ~~~~~~~~`,
    );
  });

  test("a typeless tag leaves the default to type the parameter", () => {
    // The tag names the parameter without typing it, so it overrides nothing.
    expect(
      checker.typecheck(
        `/** @param size how many */
function getAffectedCells (cell, size = 3) {
  return [cell, size.toUpperCase()]
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

3   return [cell, size.toUpperCase()]
                       ~~~~~~~~~~~`,
    );
  });

  test("a star type overrides the default", () => {
    expect(
      checker.typecheck(
        `/** @param {*} size */
function getAffectedCells (cell, size = 3) {
  return [cell, size.toUpperCase()]
}`,
      ),
    ).toBeUndefined();
  });

  test("the author's type is what checks a defaulted parameter", () => {
    expect(
      checker.typecheck(
        `/** @param {number} size */
function getAffectedCells (cell, size = 3) {
  return [cell, size.toUpperCase()]
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

3   return [cell, size.toUpperCase()]
                       ~~~~~~~~~~~`,
    );
  });

  test("a default agreeing with the author's type is clean", () => {
    expect(
      checker.typecheck(
        `/** @param {CellId[]} extraCells */
function getAffectedCells (cell, extraCells = []) {
  return [cell, ...extraCells]
}`,
      ),
    ).toBeUndefined();
  });

  /*
   * A default is a type of its own, and a narrower one than the author declared. It must not become
   * the parameter's type: the body is checked against the tag, so a use the tag forbids is reported
   * even where the default alone would have allowed it.
   */
  test("a default picking one member of a union does not narrow it", () => {
    expect(
      checker.typecheck(
        `/** @param {number | string} size */
function getAffectedCells (cell, size = "big") {
  return [cell, size.toUpperCase()]
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.   Property 'toUpperCase' does not exist on type 'number'.

3   return [cell, size.toUpperCase()]
                       ~~~~~~~~~~~`,
    );
  });

  test("an empty array default does not narrow the author's element type", () => {
    expect(
      checker.typecheck(
        `/** @param {number[]} extraCells */
function getAffectedCells (cell, extraCells = []) {
  return [cell, extraCells[0].anything()]
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'anything' does not exist on type 'number'.

3   return [cell, extraCells[0].anything()]
                                ~~~~~~~~`,
    );
  });

  test("a default contradicting the author's type is reported", () => {
    expect(
      checker.typecheck(
        `/** @param {CellId[]} extraCells */
function getAffectedCells (cell, extraCells = "none") {
  return [cell, ...extraCells]
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2322: Type 'string' is not assignable to type 'number[]'.

2 function getAffectedCells (cell, extraCells = "none") {
                                   ~~~~~~~~~~~~~~~~~~~`,
    );
  });
});

/*
 * A component with no hooks does nothing, which is valid - and a file with no statements is the one
 * case where it could be mistaken for a module and lose every ambient global, turning every later
 * snippet into a flood of "cannot find name".
 */
describe("code that does nothing", () => {
  test("an empty component is clean", () => {
    expect(checker.typecheck("")).toBeUndefined();
  });

  test("a whitespace-only component is clean", () => {
    expect(checker.typecheck("   \n\n  ")).toBeUndefined();
  });

  test("a comment-only component is clean", () => {
    expect(checker.typecheck("// nothing here")).toBeUndefined();
  });
});

describe("diagnostics for the generated code", () => {
  test("an empty component produces no diagnostics", () => {
    expect(checker.getDiagnostics("")).toEqual([]);
  });

  test("a whitespace-only component produces no diagnostics", () => {
    expect(checker.getDiagnostics("   \n\n  ")).toEqual([]);
  });

  test("a comment-only component produces no diagnostics", () => {
    expect(checker.getDiagnostics("// nothing here")).toEqual([]);
  });
});

describe("destructured parameters", () => {
  test("a destructured instance keeps the known fields' real types", () => {
    expect(checker.typecheck("function* update ({ name }, puzzle) {\n  yield puzzle.stop(name.toFixed(2))\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

2   yield puzzle.stop(name.toFixed(2))
                           ~~~~~~~`,
    );
  });

  test("a renamed binding keeps its type", () => {
    expect(
      checker.typecheck("function* update ({ cells: c }, puzzle) {\n  yield puzzle.stop(c.toUpperCase())\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'toUpperCase' does not exist on type 'number[]'.

2   yield puzzle.stop(c.toUpperCase())
                        ~~~~~~~~~~~`,
    );
  });

  test("a correct body with a destructured instance is clean", () => {
    expect(
      checker.typecheck(
        "function* update ({ cells }, puzzle) {\n  yield puzzle.removeCandidateFromCell(1, cells[0])\n}",
      ),
    ).toBeUndefined();
  });

  test("a destructured puzzle has its keys checked", () => {
    expect(
      checker.typecheck(
        "function* update (instance, { getCandidatez }) {\n  yield getCandidatez(instance.cells[0])\n}",
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS2339: Property 'getCandidatez' does not exist on type 'Puzzle'.

1 function* update (instance, { getCandidatez }) {
                                ~~~~~~~~~~~~~`,
    );
  });

  test("a destructured puzzle method keeps its signature", () => {
    expect(
      checker.typecheck(
        "function* update (instance, { hasValue, stop }) {\n  if (hasValue('r1c1')) { yield stop('x') }\n}",
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

2   if (hasValue('r1c1')) { yield stop('x') }
                 ~~~~~~`,
    );
  });

  test("both parameters destructured still catches a puzzle typo", () => {
    expect(
      checker.typecheck("function* update ({ cells }, { getCandidatez }) {\n  yield getCandidatez(cells[0])\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS2339: Property 'getCandidatez' does not exist on type 'Puzzle'.

1 function* update ({ cells }, { getCandidatez }) {
                                 ~~~~~~~~~~~~~`,
    );
  });

  test("the placeholder name does not leak into the body", () => {
    expect(checker.typecheck("function* update ({ cells }, puzzle) {\n  yield puzzle.stop(String(options0))\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2304: Cannot find name 'options0'.

2   yield puzzle.stop(String(options0))
                             ~~~~~~~~`,
    );
  });
});

/*
 * `setParams` exists to hang the component's own members off the instance, so the type admits any
 * name. The known fields keep their types and cannot be reassigned; a typo in a member name is the
 * cost of that, and is pinned here so a change that recovers it has to say so.
 */
describe("the instance's own members", () => {
  test("a member can be written and read back", () => {
    expect(
      checker.typecheck(
        "function setParams (instance, p) {\n  instance.sequences = p\n}\nfunction* update (instance, puzzle) {\n  yield puzzle.stop(String(instance.sequences.length))\n}",
      ),
    ).toBeUndefined();
  });

  test("a member can be used, not merely read", () => {
    expect(
      checker.typecheck(
        "function* update (instance, puzzle) {\n  for (const s of instance.sequences.filter(x => x.length)) { yield puzzle.stop(String(s)) }\n}",
      ),
    ).toBeUndefined();
  });

  test("a known field cannot be overwritten", () => {
    expect(checker.typecheck("function setParams (instance, p) {\n  instance.cells = p\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2540: Cannot assign to 'cells' because it is a read-only property.

2   instance.cells = p
             ~~~~~`,
    );
  });

  test("a known field keeps its real type", () => {
    expect(
      checker.typecheck("function* update (instance, puzzle) {\n  yield puzzle.stop(instance.cells.toUpperCase())\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'toUpperCase' does not exist on type 'number[]'.

2   yield puzzle.stop(instance.cells.toUpperCase())
                                     ~~~~~~~~~~~`,
    );
  });

  test("a misspelled known field is NOT caught - the cost of admitting any member name", () => {
    expect(
      checker.typecheck(
        "function* update (instance, puzzle) {\n  yield puzzle.removeCandidateFromCell(1, instance.cellIdz[0])\n}",
      ),
    ).toBeUndefined();
  });
});
