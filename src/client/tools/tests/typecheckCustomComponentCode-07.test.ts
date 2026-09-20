import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "../typecheckCustomComponentCode";
import { backendResources } from "../../../backendResourcesImpl";

const checker = new CustomComponentCodeTypescript(backendResources);

/*
 * The component's own constructor arguments are one list, handed to `getAffectedCells` and to
 * `setParams` alike - so `getAffectedCells` parameter n and `setParams` parameter n+1 are the same
 * value, and a type declared for either is the type of both. An author says what an argument is once,
 * where it reads naturally, rather than repeating themselves in every hook that receives it.
 *
 * Each case below declares in one hook and misuses in the other, so what is asserted is the type
 * arriving - an expectation of `undefined` would pass just as well if nothing had.
 */
describe("a constructor argument declared in one hook", () => {
  test("types it in setParams when getAffectedCells declared it", () => {
    expect(
      checker.typecheck(
        `/** @param {string} sequence */
function getAffectedCells (sequence) {
  return []
}

function setParams (instance, sequence) {
  instance.first = sequence.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

7   instance.first = sequence.toFixed(2)
                              ~~~~~~~`,
    );
  });

  test("types it in getAffectedCells when setParams declared it", () => {
    expect(
      checker.typecheck(
        `function getAffectedCells (sequence) {
  return sequence.toFixed(2)
}

/** @param {string} sequence */
function setParams (instance, sequence) {
  instance.first = sequence
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

2   return sequence.toFixed(2)
                    ~~~~~~~`,
    );
  });

  test("is matched by position, not by the name each hook gave it", () => {
    // The app passes one list; what a hook calls an entry of it is the author's business.
    expect(
      checker.typecheck(
        `/** @param {string} sequence */
function getAffectedCells (sequence) {
  return []
}

function setParams (instance, seq) {
  instance.first = seq.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

7   instance.first = seq.toFixed(2)
                         ~~~~~~~`,
    );
  });

  test("lands on its own position when two hooks each declare a different one", () => {
    /*
     * Both halves are asserted: a type drifting onto the neighbouring position would report
     * something either way, so only checking one of them would not tell the difference.
     */
    expect(
      checker.typecheck(
        `/** @param {string} sequence */
function getAffectedCells (sequence, size) {
  return []
}

/** @param {number} size */
function setParams (instance, sequence, size) {
  instance.first = sequence.toFixed(2)
  instance.size = size.toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.

line 8 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

8   instance.first = sequence.toFixed(2)
                              ~~~~~~~

line 9 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

9   instance.size = size.toUpperCase()
                         ~~~~~~~~~~~`,
    );
  });

  test("leaves a position nobody declared untyped", () => {
    expect(
      checker.typecheck(
        `/** @param {string} sequence */
function getAffectedCells (sequence, size) {
  return []
}

function setParams (instance, sequence, size) {
  instance.size = size.anything()
}`,
      ),
    ).toBeUndefined();
  });
});

/*
 * Two hooks declaring the same position differently are both believed - the types intersect, and
 * TypeScript says what that makes of a use. Nothing here decides which of them is wrong.
 */
describe("a constructor argument declared in both hooks", () => {
  test("keeps one variant when both wrote the same type", () => {
    expect(
      checker.typecheck(
        `/** @param {string} sequence */
function getAffectedCells (sequence) {
  return []
}

/** @param {string} sequence */
function setParams (instance, sequence) {
  instance.first = sequence.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 8 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

8   instance.first = sequence.toFixed(2)
                              ~~~~~~~`,
    );
  });

  test("intersects two different types and lets TypeScript judge the result", () => {
    // `string & number` is `never`, so every use of it fails - the contradiction reports itself.
    expect(
      checker.typecheck(
        `/** @param {string} sequence */
function getAffectedCells (sequence) {
  return []
}

/** @param {number} sequence */
function setParams (instance, sequence) {
  instance.first = sequence.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 8 - error TS2339: Property 'toFixed' does not exist on type 'never'.

8   instance.first = sequence.toFixed(2)
                              ~~~~~~~`,
    );
  });

  test("intersects two object types into one that has both members", () => {
    expect(
      checker.typecheck(
        `/** @param {{ a: string }} options */
function getAffectedCells (options) {
  return []
}

/** @param {{ b: number }} options */
function setParams (instance, options) {
  instance.first = options.a
  instance.second = options.b
  instance.third = options.c
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 10 - error TS2339: Property 'c' does not exist on type '{ a: string; } & { b: number; }'.

10   instance.third = options.c
                              ~`,
    );
  });
});

/*
 * A rest parameter collects every constructor argument from its position on, so its declared type is
 * one argument's - and it is the same argument the other hook may have named individually. The type
 * therefore has to reach those positions too.
 */
describe("a constructor argument declared on a rest parameter", () => {
  test("types the positions another hook named one by one", () => {
    expect(
      checker.typecheck(
        `/** @param {string} sequences */
function getAffectedCells (...sequences) {
  return []
}

function setParams (instance, first, second) {
  instance.first = first.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

7   instance.first = first.toFixed(2)
                           ~~~~~~~`,
    );
  });

  test("types the last of those positions as well as the first", () => {
    // The tail covers every position from its own onward, not just the one it starts at.
    expect(
      checker.typecheck(
        `/** @param {...string} sequences */
function getAffectedCells (...sequences) {
  return []
}

function setParams (instance, first, second) {
  instance.second = second.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

7   instance.second = second.toFixed(2)
                             ~~~~~~~`,
    );
  });

  test("takes a type the other hook declared on a position it covers", () => {
    expect(
      checker.typecheck(
        `function getAffectedCells (...sequences) {
  return sequences[0].toFixed(2)
}

/** @param {...string} first */
function setParams (instance, first) {
  instance.first = first
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

2   return sequences[0].toFixed(2)
                        ~~~~~~~`,
    );
  });

  test("meets a rest parameter in the other hook at its own offset", () => {
    // `setParams`' instance shifts its tail by one, so both tails start at the same argument.
    expect(
      checker.typecheck(
        `/** @param {...string} sequences */
function getAffectedCells (...sequences) {
  return []
}

function setParams (instance, ...sequences) {
  instance.first = sequences[0].toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2551: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?

7   instance.first = sequences[0].toFixed(2)
                                  ~~~~~~~`,
    );
  });
});

/*
 * `setParams` writes the component's members onto the instance and the other hooks read them back, so
 * the instance is one object across all four hooks that receive it. A `@param` for it in any of them
 * describes that one object: the members are known everywhere, and the index signature that would
 * have hidden a typo is gone everywhere.
 */
describe("the instance declared in one hook", () => {
  test("has its members known in another hook", () => {
    expect(
      checker.typecheck(
        `/** @param {{ sequences: CellId[] }} instance */
function setParams (instance, sequences) {
  instance.sequences = sequences
}

function validate (instance, puzzle) {
  return instance.sequences.toFixed(2)
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2339: Property 'toFixed' does not exist on type 'number[]'.

7   return instance.sequences.toFixed(2)
                              ~~~~~~~`,
    );
  });

  test("reports a member nobody declared, in a hook that declared nothing", () => {
    // Tagging the instance anywhere drops the index signature for every hook that receives it.
    expect(
      checker.typecheck(
        `/** @param {{ sequences: CellId[] }} instance */
function setParams (instance, sequences) {
  instance.sequences = sequences
}

function validate (instance, puzzle) {
  return instance.maxSize > 0
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 7 - error TS2339: Property 'maxSize' does not exist on type 'Instance & { sequences: number[]; }'.

7   return instance.maxSize > 0
                    ~~~~~~~`,
    );
  });

  test("keeps Instance's own members alongside the declared ones", () => {
    expect(
      checker.typecheck(
        `/** @param {{ sequences: CellId[] }} instance */
function setParams (instance, sequences) {
  instance.sequences = sequences
}

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
});

/*
 * Several hooks may each describe the part of the instance they care about. The instance is then all
 * of them at once, in every hook - including the ones that described nothing.
 */
describe("the instance declared in several hooks", () => {
  test("has every hook's members in each of them", () => {
    expect(
      checker.typecheck(
        `/** @param {{ sequences: CellId[] }} instance */
function setParams (instance, sequences) {
  instance.sequences = sequences
}

/** @param {{ maxSize: number }} instance */
function* initialize (instance, puzzle) {
  instance.sequences.toFixed(2)
}

function* update (instance, puzzle) {
  instance.maxSize.toUpperCase()
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.

line 8 - error TS2339: Property 'toFixed' does not exist on type 'number[]'.

8   instance.sequences.toFixed(2)
                       ~~~~~~~

line 12 - error TS2339: Property 'toUpperCase' does not exist on type 'number'.

12   instance.maxSize.toUpperCase()
                      ~~~~~~~~~~~`,
    );
  });

  test("reports a member none of them declared", () => {
    expect(
      checker.typecheck(
        `/** @param {{ sequences: CellId[] }} instance */
function setParams (instance, sequences) {
  instance.sequences = sequences
}

/** @param {{ maxSize: number }} instance */
function validate (instance, puzzle) {
  return instance.minSize > 0
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 8 - error TS2339: Property 'minSize' does not exist on type 'Instance & { sequences: number[]; } & { maxSize: number; }'.

8   return instance.minSize > 0
                    ~~~~~~~`,
    );
  });
});
