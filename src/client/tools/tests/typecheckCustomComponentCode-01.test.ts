import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "../typecheckCustomComponentCode";
import { backendResources } from "../../../backendResourcesImpl";

const checker = new CustomComponentCodeTypescript(backendResources);

/*
 * `setParams` writes the component's own members onto the instance for the other hooks to read back,
 * and `Instance`'s index signature admits any of them at type `any` - so a typo in one is invisible.
 * Writing a `@param` for the instance is how an author takes that back: it says these are the members
 * they put there, so the index signature goes and an undeclared one is reported. Any tag does it,
 * `{Instance}` included - what is declared is what exists.
 *
 * `Instance`'s own members survive regardless, the author's type adding to them rather than replacing
 * them. So each case asserts both halves - one of those members, and one only the author declares -
 * since a type that keeps one while losing the other is the easy mistake.
 */
describe("the author's own type for the instance", () => {
  test("naming Instance itself keeps its members", () => {
    expect(
      checker.typecheck(
        `/** @param {Instance} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("naming Instance itself declares no extra member, so there is none", () => {
    expect(
      checker.typecheck(
        `/** @param {Instance} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'sequences' does not exist on type 'Instance'.

3   return instance.sequences.anything()
                    ~~~~~~~~~`,
    );
  });

  /*
   * A `@param` with no braces is documentation - the author naming the parameter, not typing it. It
   * declares nothing, so the instance keeps the index signature that lets any member through.
   */
  test("a typeless tag keeps Instance's own members", () => {
    expect(
      checker.typecheck(
        `/** @param instance the component's instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("a typeless tag leaves an extra member unchecked, as no tag would", () => {
    expect(
      checker.typecheck(
        `/** @param instance the component's instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBeUndefined();
  });

  /* `{*}` is JSDoc's own spelling of `any` - a type, so it declares the members are these and no more. */
  test("a star type keeps Instance's own members", () => {
    expect(
      checker.typecheck(
        `/** @param {*} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("a star type declares no extra member, so there is none", () => {
    expect(
      checker.typecheck(
        `/** @param {*} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'sequences' does not exist on type 'Instance'.

3   return instance.sequences.anything()
                    ~~~~~~~~~`,
    );
  });

  test("an object type declaring the extra members checks them", () => {
    expect(
      checker.typecheck(
        `/** @param {{sequences: string[]}} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'anything' does not exist on type 'string[]'.

3   return instance.sequences.anything()
                              ~~~~~~~~`,
    );
  });

  /*
   * A `@typedef` names a type somewhere else and the `@param` refers to it. The reference is copied
   * into the injected block as written, so what has to hold is that the name still resolves from
   * there - whether it was defined in a block of its own, kept apart by a statement so it cannot be
   * read as the hook's, or in the hook's own JSDoc, which the injected block displaces as the one
   * that types the parameters.
   */
  test("a typedef in its own block names the extra members", () => {
    expect(
      checker.typecheck(
        `/** @typedef {{sequences: string[]}} MyInstance */

const maxSize = 9

/** @param {MyInstance} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2339: Property 'anything' does not exist on type 'string[]'.

7   return instance.sequences.anything()
                              ~~~~~~~~`,
    );
  });

  test("a typedef in its own block still keeps Instance's members", () => {
    expect(
      checker.typecheck(
        `/** @typedef {{sequences: string[]}} MyInstance */

const maxSize = 9

/** @param {MyInstance} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

7   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("a typedef intersecting Instance names the extra members", () => {
    expect(
      checker.typecheck(
        `/** @typedef {Instance & {sequences: string[]}} MyInstance */

const maxSize = 9

/** @param {MyInstance} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2339: Property 'anything' does not exist on type 'string[]'.

7   return instance.sequences.anything()
                              ~~~~~~~~`,
    );
  });

  test("a bare-object typedef reports a member it does not name", () => {
    expect(
      checker.typecheck(
        `/** @typedef {{sequences: string[]}} MyInstance */

const maxSize = 9

/** @param {MyInstance} instance */
function validate (instance, puzzle) {
  return !!instance.maxSize
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2339: Property 'maxSize' does not exist on type 'Instance & MyInstance'.

7   return !!instance.maxSize
                      ~~~~~~~`,
    );
  });

  /*
   * The alias survives in the message above, but not here: the injected type is
   * `Instance & (Instance & {...})`, and reducing the repeated `Instance` rewrites the intersection,
   * leaving the members rather than the name the author gave them.
   */
  test("a typedef intersecting Instance reports a member it does not name", () => {
    expect(
      checker.typecheck(
        `/** @typedef {Instance & {sequences: string[]}} MyInstance */

const maxSize = 9

/** @param {MyInstance} instance */
function validate (instance, puzzle) {
  return !!instance.maxSize
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2339: Property 'maxSize' does not exist on type 'Instance & { sequences: string[]; }'.

7   return !!instance.maxSize
                      ~~~~~~~`,
    );
  });

  test("a typedef in the hook's own JSDoc still resolves", () => {
    // The injected block sits above this one and refers to a name this one defines.
    expect(
      checker.typecheck(
        `/**
 * @typedef {{sequences: string[]}} MyInstance
 * @param {MyInstance} instance
 */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 6 - error TS2339: Property 'anything' does not exist on type 'string[]'.

6   return instance.sequences.anything()
                              ~~~~~~~~`,
    );
  });

  test("a typedef in the hook's own JSDoc intersecting Instance resolves too", () => {
    expect(
      checker.typecheck(
        `/**
 * @typedef {Instance & {sequences: string[]}} MyInstance
 * @param {MyInstance} instance
 */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 6 - error TS2339: Property 'anything' does not exist on type 'string[]'.

6   return instance.sequences.anything()
                              ~~~~~~~~`,
    );
  });

  test("an object type declaring only the extra members keeps Instance's own", () => {
    // The author is naming what they put on the instance, not redefining what it already is.
    expect(
      checker.typecheck(
        `/** @param {{sequences: string[]}} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("intersecting Instance with the extra members keeps its own", () => {
    expect(
      checker.typecheck(
        `/** @param {Instance & {sequences: string[]}} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("intersecting Instance with the extra members checks those too", () => {
    expect(
      checker.typecheck(
        `/** @param {Instance & {sequences: string[]}} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'anything' does not exist on type 'string[]'.

3   return instance.sequences.anything()
                              ~~~~~~~~`,
    );
  });

  test("a member the author did not declare alongside the others is reported", () => {
    expect(
      checker.typecheck(
        `/** @param {Instance & {sequences: string[]}} instance */
function validate (instance, puzzle) {
  return !!instance.maxSize
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'maxSize' does not exist on type 'Instance & { sequences: string[]; }'.

3   return !!instance.maxSize
                      ~~~~~~~`,
    );
  });

  test("a scalar type keeps Instance's own members", () => {
    expect(
      checker.typecheck(
        `/** @param {string} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("a scalar type is what its own members are checked against", () => {
    expect(
      checker.typecheck(
        `/** @param {string} instance */
function validate (instance, puzzle) {
  return !!instance.length.toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

3   return !!instance.length.toUpperCase()
                             ~~~~~~~~~~~`,
    );
  });

  test("a scalar type declares no extra member, so there is none", () => {
    expect(
      checker.typecheck(
        `/** @param {string} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'sequences' does not exist on type 'Instance & string'.

3   return instance.sequences.anything()
                    ~~~~~~~~~`,
    );
  });

  test("any keeps Instance's own members", () => {
    expect(
      checker.typecheck(
        `/** @param {any} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("any declares no extra member, so there is none", () => {
    expect(
      checker.typecheck(
        `/** @param {any} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'sequences' does not exist on type 'Instance'.

3   return instance.sequences.anything()
                    ~~~~~~~~~`,
    );
  });

  /* These three name no members of their own, so they add nothing - but they are still a tag. */
  test("unknown keeps Instance's own members", () => {
    expect(
      checker.typecheck(
        `/** @param {unknown} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("unknown declares no extra member, so there is none", () => {
    expect(
      checker.typecheck(
        `/** @param {unknown} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'sequences' does not exist on type 'Instance'.

3   return instance.sequences.anything()
                    ~~~~~~~~~`,
    );
  });

  test("object keeps Instance's own members", () => {
    expect(
      checker.typecheck(
        `/** @param {object} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("object declares no extra member, so there is none", () => {
    expect(
      checker.typecheck(
        `/** @param {object} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'sequences' does not exist on type 'Instance'.

3   return instance.sequences.anything()
                    ~~~~~~~~~`,
    );
  });

  test("an empty object type keeps Instance's own members", () => {
    expect(
      checker.typecheck(
        `/** @param {{}} instance */
function validate (instance, puzzle) {
  return instance.name.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

3   return instance.name.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("an empty object type declares no extra member, so there is none", () => {
    expect(
      checker.typecheck(
        `/** @param {{}} instance */
function validate (instance, puzzle) {
  return instance.sequences.anything()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2339: Property 'sequences' does not exist on type 'Instance'.

3   return instance.sequences.anything()
                    ~~~~~~~~~`,
    );
  });
});
