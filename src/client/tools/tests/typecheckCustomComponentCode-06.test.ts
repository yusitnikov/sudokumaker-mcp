import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "../typecheckCustomComponentCode";
import { backendResources } from "../../../backendResourcesImpl";

const checker = new CustomComponentCodeTypescript(backendResources, {});

/*
 * A component that declares no `getAffectedCells` does not choose its own cells - the app works them
 * out and hands them to `setParams` as its second argument. So that slot is `CellId[]` there, and a
 * constructor argument only in a component that does declare the hook. Nothing else moves: the third
 * argument on is the author's either way.
 *
 * `CellId` is a `number` alias, so the compiler prints it as `number` - the misuse cases below say
 * that rather than the alias.
 */
describe("the second argument of setParams without getAffectedCells", () => {
  test("is a list of cells", () => {
    expect(checker.typecheck("function setParams (instance, cells) {\n  instance.first = cells.toUpperCase()\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'toUpperCase' does not exist on type 'number[]'.

2   instance.first = cells.toUpperCase()
                           ~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });

  test("holds cells, not something else", () => {
    expect(
      checker.typecheck("function setParams (instance, cells) {\n  instance.first = cells[0].toUpperCase()\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

2   instance.first = cells[0].toUpperCase()
                              ~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });

  test("is used as a list of cells without complaint", () => {
    expect(
      checker.typecheck(
        `function setParams (instance, cells) {
  instance.count = cells.length
  instance.first = cells[0]
}`,
      ),
    ).toBeUndefined();
  });

  test("is the only argument the app supplies - the third on is the author's", () => {
    expect(
      checker.typecheck("function setParams (instance, cells, size) {\n  instance.size = size.anything()\n}"),
    ).toBeUndefined();
  });

  test("is what a default value on it must satisfy", () => {
    expect(checker.typecheck('function setParams (instance, cells = "none") {\n  instance.first = cells[0]\n}')).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS2322: Type 'string' is not assignable to type 'number[]'.

1 function setParams (instance, cells = "none") {
                                ~~~~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });

  test("is declared even when the author names no such parameter", () => {
    // The app passes it regardless, so an author who declared nothing for it simply cannot read it.
    expect(checker.typecheck("function setParams (instance) {\n  instance.first = 1\n}")).toBeUndefined();
  });
});

/*
 * With `getAffectedCells` declared, the component names its own cells and the app has none to pass -
 * the slot goes back to being the first constructor argument, of a type only the author knows.
 */
describe("the second argument of setParams with getAffectedCells", () => {
  test("is a constructor argument, so it is not a list of cells", () => {
    expect(
      checker.typecheck(
        `function getAffectedCells (sequence) {
  return sequence
}

function setParams (instance, sequence) {
  instance.first = sequence.toUpperCase()
}`,
      ),
    ).toBeUndefined();
  });

  test("counts the hook however it was declared", () => {
    // The app detects a hook with `typeof x === "function"`, which a `const` arrow satisfies.
    expect(
      checker.typecheck(
        `const getAffectedCells = (sequence) => sequence

function setParams (instance, sequence) {
  instance.first = sequence.toUpperCase()
}`,
      ),
    ).toBeUndefined();
  });

  test("ignores a getAffectedCells the app would not find", () => {
    // One nested in a block is not a top-level binding, so the app never sees it and passes cells.
    expect(
      checker.typecheck(
        `{
  function getAffectedCells (sequence) {
    return sequence
  }
}

function setParams (instance, cells) {
  instance.first = cells.toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 8 - error TS2339: Property 'toUpperCase' does not exist on type 'number[]'.

8   instance.first = cells.toUpperCase()
                           ~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });

  test("does not depend on where the hook is declared relative to setParams", () => {
    expect(
      checker.typecheck(
        `function setParams (instance, sequence) {
  instance.first = sequence.toUpperCase()
}

function getAffectedCells (sequence) {
  return sequence
}`,
      ),
    ).toBeUndefined();
  });
});

/*
 * Which of the two the slot is decides whose type wins. Where the app supplies the cells, that is not
 * the author's to declare - a tag saying otherwise would have the body checked against a value it
 * will never receive, so the app's type stands. Where the component supplies its own cells, the slot
 * is a constructor argument like any other and the tag is the only thing that knows its type.
 */
describe("the author's own type for the second argument of setParams", () => {
  test("does not override the cells the app passes", () => {
    expect(
      checker.typecheck(
        `/** @param {string} cells */
function setParams (instance, cells) {
  instance.first = cells.toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number[]'.

3   instance.first = cells.toUpperCase()
                           ~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });

  test("leaves the cells the app passes alone when it is typeless", () => {
    // The tag names the parameter without typing it, so there is nothing for it to override.
    expect(
      checker.typecheck(
        `/** @param cells the cells the app worked out */
function setParams (instance, cells) {
  instance.first = cells.toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number[]'.

3   instance.first = cells.toUpperCase()
                           ~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });

  test("leaves the cells the app passes alone when it is a star", () => {
    // `{*}` is `any` spelled JSDoc's way, and like any other type here it does not get to win.
    expect(
      checker.typecheck(
        `/** @param {*} cells */
function setParams (instance, cells) {
  instance.first = cells.toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number[]'.

3   instance.first = cells.toUpperCase()
                           ~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });

  test("types the argument after the cells without disturbing them", () => {
    /*
     * The tag is written for `size` and binds by name, so it types that parameter and leaves the
     * cells slot as the app's - both halves asserted, since a tag drifting onto the wrong parameter
     * would still report something.
     */
    expect(
      checker.typecheck(
        `/** @param {number} size */
function setParams (instance, cells, size) {
  instance.first = cells[0].toUpperCase()
  instance.size = size.toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

3   instance.first = cells[0].toUpperCase()
                              ~~~~~~~~~~~

line 4 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

4   instance.size = size.toUpperCase()
                         ~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });

  test("retypes the instance without disturbing the cells", () => {
    // The two are independent: naming the instance's members does not touch the cells slot.
    expect(
      checker.typecheck(
        `/** @param {{ first: CellId }} instance */
function setParams (instance, cells) {
  instance.first = cells
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2322: Type 'number[]' is not assignable to type 'number'.

3   instance.first = cells
    ~~~~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });

  test("is what types the slot once getAffectedCells owns the cells", () => {
    expect(
      checker.typecheck(
        `function getAffectedCells (sequence) {
  return [0]
}

/** @param {string} sequence */
function setParams (instance, sequence) {
  instance.first = sequence.toUpperCase()
}`,
      ),
    ).toBeUndefined();
  });

  test("is checked once getAffectedCells owns the cells", () => {
    // The same tag, misused - so the clean case above is the type holding, not the absence of one.
    expect(
      checker.typecheck(
        `function getAffectedCells (sequence) {
  return [0]
}

/** @param {string} sequence */
function setParams (instance, sequence) {
  instance.first = sequence.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

7   instance.first = sequence.toFixed(2)
                              ~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`,
    );
  });
});
