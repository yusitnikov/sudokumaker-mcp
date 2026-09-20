import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "../typecheckCustomComponentCode";
import { backendResources } from "../../../backendResourcesImpl";

const checker = new CustomComponentCodeTypescript(backendResources);

/*
 * Verbatim from a puzzle open in the browser. This is the acceptance case: whatever the checker does
 * to a component a setter has actually written and is happy with is what it will do in practice.
 */
describe("custom components from real puzzles", () => {
  test('"Parity Party"\'s OneOfSequencesComponent typechecks clean', () => {
    expect(
      checker.typecheck(`function getAffectedCells (sequences, cells) {
  return cells
}

function setParams (instance, sequences, cells) {
  instance.sequences = sequences
}

function* update (instance, puzzle) {
  const { cells, sequences, maxSize } = instance
  const possibleSequences = sequences.filter(sequence => {
    for (let i = 0; i < sequence.length; i++) {
      if (!puzzle.getCandidates(cells[i]).has(sequence[i])) {
        return false
      }
    }
    return true
  })
  const minSize = possibleSequences.reduce((acc, seq) => Math.min(acc, seq.length), 9)
  for (let i = 0; i < minSize; i++) {
    const candidates = new DigitSet()
    for (const sequence of possibleSequences) {
      candidates.add(sequence[i])
    }
    yield puzzle.filterCandidatesInCell(candidates, cells[i])
  }
}`),
    ).toBeUndefined();
  });

  test('"Parity Party"\'s OneOfSequencesComponent with declared instance shape reports only unused parameter', () => {
    expect(
      checker.typecheck(`/**
 * @param {number[][]} sequences
 * @param {CellId[]} cells
 */
function getAffectedCells (sequences, cells) {
  return cells
}

/** @typedef {{ sequences: number[][] }} MyInstance */

/**
 * @param {MyInstance} instance
 * @param {number[][]} sequences
 * @param {CellId[]} cells
 */
function setParams (instance, sequences, cells) {
  instance.sequences = sequences
}

/** @param {MyInstance} instance */
function* update (instance, puzzle) {
  const { cells, sequences, maxSize } = instance
  const possibleSequences = sequences.filter(sequence => {
    for (let i = 0; i < sequence.length; i++) {
      if (!puzzle.getCandidates(cells[i]).has(sequence[i])) {
        return false
      }
    }
    return true
  })
  const minSize = possibleSequences.reduce((acc, seq) => Math.min(acc, seq.length), 9)
  for (let i = 0; i < minSize; i++) {
    const candidates = new DigitSet()
    for (const sequence of possibleSequences) {
      candidates.add(sequence[i])
    }
    yield puzzle.filterCandidatesInCell(candidates, cells[i])
  }
}`),
    ).toBe(`[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 22 - error TS2339: Property 'maxSize' does not exist on type 'Instance & MyInstance'.

22   const { cells, sequences, maxSize } = instance
                               ~~~~~~~`);
  });

  test('"Parity Party"\'s OneOfSequencesComponent with flipped params order reports only unused parameter', () => {
    expect(
      checker.typecheck(`/** @typedef {{ sequences: number[][] }} MyInstance */

/**
 * @param {MyInstance} instance
 * @param {number[][]} sequences
 */
function setParams (instance, cells, sequences) {
  instance.sequences = sequences
}

/** @param {MyInstance} instance */
function* update (instance, puzzle) {
  const { cells, sequences, maxSize } = instance
  const possibleSequences = sequences.filter(sequence => {
    for (let i = 0; i < sequence.length; i++) {
      if (!puzzle.getCandidates(cells[i]).has(sequence[i])) {
        return false
      }
    }
    return true
  })
  const minSize = possibleSequences.reduce((acc, seq) => Math.min(acc, seq.length), 9)
  for (let i = 0; i < minSize; i++) {
    const candidates = new DigitSet()
    for (const sequence of possibleSequences) {
      candidates.add(sequence[i])
    }
    yield puzzle.filterCandidatesInCell(candidates, cells[i])
  }
}`),
    ).toBe(`[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 13 - error TS2339: Property 'maxSize' does not exist on type 'Instance & MyInstance'.

13   const { cells, sequences, maxSize } = instance
                               ~~~~~~~`);
  });

  /* The bodies of the boilerplate the app seeds every new component with. */
  test("the app's boilerplate hooks typecheck clean", () => {
    expect(
      checker.typecheck(`function getAffectedCells (param1, param2) {
  return [param1, param2]
}

function setParams (instance, param1, param2) {
  instance.param1 = param1
  instance.param2 = param2
}

function* initialize (instance, puzzle) {
  const { cells, param1 } = instance
  yield puzzle.removeCandidatesFromCells(SudokuDigitSet.from([1]), cells)
  instance.uniqueDigits = param1 && puzzle.getCellsSeeEachOther(cells)
}

function validate (instance, puzzle) {
  const { cells } = instance
  if (!puzzle.getCellsAreFilled(cells)) {
    return true
  }
  return cells.every(cell => puzzle.getValue(cell) === 1)
}

function* update (instance, puzzle) {
  const { cells } = instance
  if (puzzle.hasValue(cells[0])) {
    yield puzzle.filterCandidatesInCells(SudokuDigitSet.from([1]), cells)
  }
  if (puzzle.getValue(cells[1]) === 2) {
    yield puzzle.removeComponent(instance)
  }
  if (puzzle.hasValue(cells[1]) && puzzle.getValue(cells[1]) === puzzle.getValue(cells[2])) {
    yield puzzle.stop(\`\${helpers.naming.getCellsDescription(cells.slice(1, 3))} have the same value\`)
  }
}`),
    ).toBeUndefined();
  });

  test("the app's boilerplate hooks with declared instance shape typecheck clean", () => {
    expect(
      checker.typecheck(`/**
 * @param {boolean} param1
 * @param {CellId} param2
 */
function getAffectedCells (param1, param2) {
  return [param2]
}

/**
 * @typedef {{
 *   param1: boolean;
 *   param2: CellId;
 *   uniqueDigits: boolean;
 * }} MyInstance
 */

/**
 * @param {MyInstance} instance
 * @param {boolean} param1
 * @param {CellId} param2
 */
function setParams (instance, param1, param2) {
  instance.param1 = param1
  instance.param2 = param2
}

/** @param {MyInstance} instance */
function* initialize (instance, puzzle) {
  const { cells, param1 } = instance
  yield puzzle.removeCandidatesFromCells(SudokuDigitSet.from([1]), cells)
  instance.uniqueDigits = param1 && puzzle.getCellsSeeEachOther(cells)
}

/** @param {MyInstance} instance */
function validate (instance, puzzle) {
  const { cells } = instance
  if (!puzzle.getCellsAreFilled(cells)) {
    return true
  }
  return cells.every(cell => puzzle.getValue(cell) === 1)
}

/** @param {MyInstance} instance */
function* update (instance, puzzle) {
  const { cells } = instance
  if (puzzle.hasValue(cells[0])) {
    yield puzzle.filterCandidatesInCells(SudokuDigitSet.from([1]), cells)
  }
  if (puzzle.getValue(cells[1]) === 2) {
    yield puzzle.removeComponent(instance)
  }
  if (puzzle.hasValue(cells[1]) && puzzle.getValue(cells[1]) === puzzle.getValue(cells[2])) {
    yield puzzle.stop(\`\${helpers.naming.getCellsDescription(cells.slice(1, 3))} have the same value\`)
  }
}`),
    ).toBeUndefined();
  });
});

describe("problems in a hook body", () => {
  test("reports a misspelled puzzle method", () => {
    expect(
      checker.typecheck("function* update (instance, puzzle) {\n  yield puzzle.getCandidatez(instance.cellIds[0])\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'getCandidatez' does not exist on type 'Puzzle'. Did you mean 'getCandidates'?

2   yield puzzle.getCandidatez(instance.cellIds[0])
                 ~~~~~~~~~~~~~`,
    );
  });

  test("reports a misspelled helper method", () => {
    // Also the regression test for module resolution: if `./types` stops resolving, `helpers`
    // becomes `any` and this passes silently.
    expect(
      checker.typecheck(
        "function* update (instance, puzzle) {\n  yield puzzle.stop(helpers.naming.getCellsDescriptionz([1]))\n}",
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'getCellsDescriptionz' does not exist on type 'NamingHelper'. Did you mean 'getCellsDescription'?

2   yield puzzle.stop(helpers.naming.getCellsDescriptionz([1]))
                                     ~~~~~~~~~~~~~~~~~~~~`,
    );
  });

  test("reports an unknown name", () => {
    expect(checker.typecheck("function validate (instance, puzzle) {\n  return totallyUnknownThing\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2304: Cannot find name 'totallyUnknownThing'.

2   return totallyUnknownThing
           ~~~~~~~~~~~~~~~~~~~`,
    );
  });

  test("reports a puzzle method called with too few arguments", () => {
    expect(
      checker.typecheck("function* update (instance, puzzle) {\n  yield puzzle.removeCandidateFromCell(1)\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2554: Expected 2 arguments, but got 1.

2   yield puzzle.removeCandidateFromCell(1)
                 ~~~~~~~~~~~~~~~~~~~~~~~`,
    );
  });

  /*
   * A compiler message can be a chain - an error with a nested explanation under it. It is
   * flattened with a space, so however many links it has it stays one line, and the run of spaces
   * is where the links were joined.
   */
  test("a nested compiler explanation is flattened onto one line", () => {
    expect(
      checker.typecheck(
        "function* update (instance, puzzle) {\n  yield puzzle.filterCandidatesInCell([1, 2, 3], instance.cells[0])\n}",
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2345: Argument of type 'number[]' is not assignable to parameter of type 'number | SmallNumberSet'.   Type 'number[]' is missing the following properties from type 'SmallNumberSet': mask, add, clear, delete, and 13 more.

2   yield puzzle.filterCandidatesInCell([1, 2, 3], instance.cells[0])
                                        ~~~~~~~~~`,
    );
  });

  /*
   * A diagnostic points at the offending expression rather than at the statement containing it, so
   * a call spread over several lines is reported against the line of the bad argument, and the echo
   * is that line alone.
   */
  test("a call spread over lines is reported against the argument's own line", () => {
    expect(
      checker.typecheck(`function* update (instance, puzzle) {
  yield puzzle.filterCandidatesInCell(
    [1, 2, 3],
    instance.cells[0],
  )
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2345: Argument of type 'number[]' is not assignable to parameter of type 'number | SmallNumberSet'.   Type 'number[]' is missing the following properties from type 'SmallNumberSet': mask, add, clear, delete, and 13 more.

3     [1, 2, 3],
      ~~~~~~~~~`,
    );
  });

  /* Even inside an argument that spans lines, the position is the property at fault. */
  test("an object literal spanning lines is reported against the offending property", () => {
    expect(
      checker.typecheck(`function* update (instance, puzzle) {
  yield puzzle.filterCandidatesInCell({
    alpha: 1,
    beta: 2,
  }, instance.cells[0])
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2353: Object literal may only specify known properties, and 'alpha' does not exist in type 'SmallNumberSet'.

3     alpha: 1,
      ~~~~~`,
    );
  });

  /*
   * A string literal type is printed with its control characters escaped, so even a literal written
   * across lines keeps the message on one - and the echo is the line the literal starts on, without
   * the rest of it.
   */
  test("a multi-line string literal is escaped into the compiler's one-line message", () => {
    expect(
      checker.typecheck(`function* update (instance, puzzle) {
  /** @type {"only"} */
  const s = \`first
second\`
  yield puzzle.stop(s)
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS2322: Type '"first\\nsecond"' is not assignable to type '"only"'.

3   const s = \`first
          ~`,
    );
  });

  test("reports the author's own line number, past the annotation the checker adds", () => {
    expect(
      checker.typecheck("function validate (instance, puzzle) {\n  // 2\n  // 3\n  // 4\n  return puzzle.nope()\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 5 - error TS2339: Property 'nope' does not exist on type 'Puzzle'.

5   return puzzle.nope()
                  ~~~~`,
    );
  });

  test("with two hooks, an error in the second maps past both annotations", () => {
    expect(
      checker.typecheck(
        "function validate (instance, puzzle) {\n  return true\n}\nfunction* update (instance, puzzle) {\n  yield puzzle.nope()\n}",
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 5 - error TS2339: Property 'nope' does not exist on type 'Puzzle'.

5   yield puzzle.nope()
                 ~~~~`,
    );
  });

  test("reports a syntax error rather than throwing", () => {
    expect(checker.typecheck("function validate (instance, puzzle) {\n  return true\n")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 3 - error TS1005: '}' expected.

3 
  ~`,
    );
  });
});
