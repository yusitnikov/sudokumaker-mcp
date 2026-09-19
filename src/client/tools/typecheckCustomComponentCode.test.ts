import { describe, expect, test } from "vitest";
import { getCustomComponentCodeDiagnostics, typecheckCustomComponentCode } from "./typecheckCustomComponentCode";
import { backendResources } from "../../backendResourcesImpl";

const typecheck = (code: string) => typecheckCustomComponentCode(backendResources, code);

/*
 * Verbatim from a puzzle open in the browser. This is the acceptance case: whatever the checker does
 * to a component a setter has actually written and is happy with is what it will do in practice.
 */
describe("custom components from real puzzles", () => {
  test('"Parity Party"\'s OneOfSequencesComponent typechecks clean', () => {
    expect(
      typecheck(`function getAffectedCells (sequences, cells) {
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

  /* The bodies of the boilerplate the app seeds every new component with. */
  test("the app's boilerplate hooks typecheck clean", () => {
    expect(
      typecheck(`function getAffectedCells (param1, param2) {
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
});

describe("problems in a hook body", () => {
  test("reports a misspelled puzzle method", () => {
    expect(
      typecheck("function* update (instance, puzzle) {\n  yield puzzle.getCandidatez(instance.cellIds[0])\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'. Did you mean 'getCandidates'?
  yield puzzle.getCandidatez(instance.cellIds[0])`,
    );
  });

  test("reports a misspelled helper method", () => {
    // Also the regression test for module resolution: if `./types` stops resolving, `helpers`
    // becomes `any` and this passes silently.
    expect(
      typecheck(
        "function* update (instance, puzzle) {\n  yield puzzle.stop(helpers.naming.getCellsDescriptionz([1]))\n}",
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'getCellsDescriptionz' does not exist on type 'NamingHelper'. Did you mean 'getCellsDescription'?
  yield puzzle.stop(helpers.naming.getCellsDescriptionz([1]))`,
    );
  });

  test("reports an unknown name", () => {
    expect(typecheck("function validate (instance, puzzle) {\n  return totallyUnknownThing\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Cannot find name 'totallyUnknownThing'.
  return totallyUnknownThing`,
    );
  });

  test("reports a puzzle method called with too few arguments", () => {
    expect(typecheck("function* update (instance, puzzle) {\n  yield puzzle.removeCandidateFromCell(1)\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Expected 2 arguments, but got 1.
  yield puzzle.removeCandidateFromCell(1)`,
    );
  });

  test("reports the author's own line number, past the annotation the checker adds", () => {
    expect(
      typecheck("function validate (instance, puzzle) {\n  // 2\n  // 3\n  // 4\n  return puzzle.nope()\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 5: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.
  return puzzle.nope()`,
    );
  });

  test("with two hooks, an error in the second maps past both annotations", () => {
    expect(
      typecheck(
        "function validate (instance, puzzle) {\n  return true\n}\nfunction* update (instance, puzzle) {\n  yield puzzle.nope()\n}",
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 5: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.
  yield puzzle.nope()`,
    );
  });

  test("reports a syntax error rather than throwing", () => {
    expect(typecheck("function validate (instance, puzzle) {\n  return true\n")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 3: '}' expected.
  `,
    );
  });
});

describe("what each hook must return", () => {
  test("validate returning a string is reported", () => {
    expect(typecheck(`function validate (instance, puzzle) {\n  return "nope"\n}`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Type 'string' is not assignable to type 'boolean'.
  return "nope"`,
    );
  });

  test("a generator yielding something that is not a solver action is reported", () => {
    expect(typecheck("function* update (instance, puzzle) {\n  yield 42\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Type 'number' is not assignable to type 'SolverAction'.
  yield 42`,
    );
  });

  /* Easy to write by mistake, and it silently does nothing at runtime. */
  test("yielding a value-returning call instead of an action is reported", () => {
    expect(typecheck("function* update (instance, puzzle) {\n  yield puzzle.getValue(instance.cells[0])\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Type 'number' is not assignable to type 'SolverAction'.
  yield puzzle.getValue(instance.cells[0])`,
    );
  });

  test("getAffectedCells returning the wrong type is reported", () => {
    expect(typecheck(`function getAffectedCells (a) {\n  return "nope"\n}`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Type 'string' is not assignable to type 'number[]'.
  return "nope"`,
    );
  });

  test("getAffectedCells that forgets to return is reported", () => {
    expect(typecheck("function getAffectedCells (cells) {\n  cells.filter(c => c > 0)\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
  function getAffectedCells (cells) {`,
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
    expect(typecheck("function getAffectedCells (param1, param2) {\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
  function getAffectedCells (param1, param2) {`,
    );
  });

  test("an empty validate is reported on its own line", () => {
    expect(typecheck("const x = 1;\n\nfunction validate (instance, puzzle) {\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 3: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
  function validate (instance, puzzle) {`,
    );
  });

  test("the hooks that return nothing stay clean", () => {
    expect(
      typecheck("function setParams (instance, p) {\n}\nfunction* initialize (instance, puzzle) {\n}"),
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
    expect(typecheck(`function getAffectedCells (cells) {\n  return "not cells"\n}`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Type 'string' is not assignable to type 'number[]'.
  return "not cells"`,
    );
  });

  test("a lone setParams is typed by its own instance", () => {
    expect(typecheck("function setParams (instance, p) {\n  instance.cells = p\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Cannot assign to 'cells' because it is a read-only property.
  instance.cells = p`,
    );
  });

  test("a lone initialize is typed by its own puzzle", () => {
    expect(typecheck("function* initialize (instance, puzzle) {\n  yield puzzle.nope()\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.
  yield puzzle.nope()`,
    );
  });

  test("a lone validate is typed by its own return", () => {
    expect(typecheck("function validate (instance, puzzle) {\n  return 1\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Type 'number' is not assignable to type 'boolean'.
  return 1`,
    );
  });

  test("a lone update is typed by what it yields", () => {
    expect(typecheck("function* update (instance, puzzle) {\n  yield 42\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Type 'number' is not assignable to type 'SolverAction'.
  yield 42`,
    );
  });

  test("hooks declared in reverse order are each still typed correctly", () => {
    expect(
      typecheck(`function* update (instance, puzzle) {
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
      typecheck(
        `function* update (instance, puzzle) {\n  yield puzzle.removeComponent(instance)\n}\nfunction validate (instance, puzzle) {\n  return 1\n}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 5: Type 'number' is not assignable to type 'boolean'.
  return 1`,
    );
  });

  test("with hooks reordered, each error still lands on its own line", () => {
    expect(
      typecheck(
        `function* update (instance, puzzle) {\n  yield 42\n}\nfunction validate (instance, puzzle) {\n  return 1\n}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.
line 2: Type 'number' is not assignable to type 'SolverAction'.
  yield 42
line 5: Type 'number' is not assignable to type 'boolean'.
  return 1`,
    );
  });
});

/*
 * `@param` binds by name, so the annotator names each tag after whatever the author called the
 * parameter. The types follow the position the app passes them in, not the name.
 */
describe("hook parameters named differently", () => {
  test("a renamed puzzle still carries its type", () => {
    expect(typecheck("function* update (self, p) {\n  yield p.nope()\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.
  yield p.nope()`,
    );
  });

  test("a renamed instance still carries its type", () => {
    expect(typecheck("function validate (self, p) {\n  return self.name.toFixed(2)\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?
  return self.name.toFixed(2)`,
    );
  });

  test("renamed parameters used correctly are clean", () => {
    expect(
      typecheck("function* update (self, p) {\n  yield p.removeCandidateFromCell(1, self.cells[0])\n}"),
    ).toBeUndefined();
  });

  test("swapping the two names does not swap their types", () => {
    // Whatever they are called, the first parameter is the instance and the second is the puzzle -
    // so here `instance.cells` is a puzzle without a `cells`.
    expect(
      typecheck("function validate (puzzle, instance) {\n  return puzzle.getCellsAreFilled(instance.cells)\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'cells' does not exist on type 'CustomComponentPuzzleBase'.
  return puzzle.getCellsAreFilled(instance.cells)`,
    );
  });
});

describe("the shapes a component may be written in", () => {
  test("hooks declared as const arrows are checked", () => {
    expect(typecheck("const validate = (instance, puzzle) => puzzle.getCandidatez(instance.cellIds[0]);")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'. Did you mean 'getCandidates'?
  const validate = (instance, puzzle) => puzzle.getCandidatez(instance.cellIds[0]);`,
    );
  });

  test("hooks declared as function expressions are checked", () => {
    expect(
      typecheck("const update = function* (instance, puzzle) {\n  yield puzzle.getCandidatez(instance.cellIds[0])\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'. Did you mean 'getCandidates'?
  yield puzzle.getCandidatez(instance.cellIds[0])`,
    );
  });

  test("all five hooks as zero-parameter const arrows are clean", () => {
    expect(
      typecheck(`const getAffectedCells = () => [0];
const setParams = () => {};
const initialize = function*() {};
const validate = () => true;
const update = function*() {};`),
    ).toBeUndefined();
  });

  test("a hook declaring fewer parameters than the app passes is clean", () => {
    expect(typecheck("function validate (instance) {\n  return !!instance.cells.length\n}")).toBeUndefined();
  });

  test("a non-hook helper function is left untyped, with no false positives", () => {
    expect(typecheck("function myHelper (a, b) {\n  return a.whatever + b.anything\n}")).toBeUndefined();
  });

  test("a hook nested inside a block is left alone, as the app would leave it", () => {
    expect(
      typecheck("if (true) {\n  function validate (instance, puzzle) {\n    return puzzle.nope()\n  }\n}"),
    ).toBeUndefined();
  });

  test("the author's own JSDoc above a hook is left alone", () => {
    expect(typecheck("/** My own docs */\nfunction validate (instance, puzzle) {\n  return puzzle.nope()\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 3: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.
  return puzzle.nope()`,
    );
  });

  test("no hooks at all is clean", () => {
    expect(typecheck("const x = 1;")).toBeUndefined();
  });
});

/*
 * A component with no hooks does nothing, which is valid - and a file with no statements is the one
 * case where it could be mistaken for a module and lose every ambient global, turning every later
 * snippet into a flood of "cannot find name".
 */
describe("code that does nothing", () => {
  test("an empty component is clean", () => {
    expect(typecheck("")).toBeUndefined();
  });

  test("a whitespace-only component is clean", () => {
    expect(typecheck("   \n\n  ")).toBeUndefined();
  });

  test("a comment-only component is clean", () => {
    expect(typecheck("// nothing here")).toBeUndefined();
  });
});

describe("getCustomComponentCodeDiagnostics", () => {
  test("an empty component produces no diagnostics", () => {
    expect(getCustomComponentCodeDiagnostics(backendResources, "")).toEqual([]);
  });

  test("a whitespace-only component produces no diagnostics", () => {
    expect(getCustomComponentCodeDiagnostics(backendResources, "   \n\n  ")).toEqual([]);
  });

  test("a comment-only component produces no diagnostics", () => {
    expect(getCustomComponentCodeDiagnostics(backendResources, "// nothing here")).toEqual([]);
  });
});

describe("destructured parameters", () => {
  test("a destructured instance keeps the known fields' real types", () => {
    expect(typecheck("function* update ({ name }, puzzle) {\n  yield puzzle.stop(name.toFixed(2))\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?
  yield puzzle.stop(name.toFixed(2))`,
    );
  });

  test("a renamed binding keeps its type", () => {
    expect(typecheck("function* update ({ cells: c }, puzzle) {\n  yield puzzle.stop(c.toUpperCase())\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'toUpperCase' does not exist on type 'number[]'.
  yield puzzle.stop(c.toUpperCase())`,
    );
  });

  test("a correct body with a destructured instance is clean", () => {
    expect(
      typecheck("function* update ({ cells }, puzzle) {\n  yield puzzle.removeCandidateFromCell(1, cells[0])\n}"),
    ).toBeUndefined();
  });

  test("a destructured puzzle has its keys checked", () => {
    expect(
      typecheck("function* update (instance, { getCandidatez }) {\n  yield getCandidatez(instance.cells[0])\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'.
  function* update (instance, { getCandidatez }) {`,
    );
  });

  test("a destructured puzzle method keeps its signature", () => {
    expect(
      typecheck("function* update (instance, { hasValue, stop }) {\n  if (hasValue('r1c1')) { yield stop('x') }\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Argument of type 'string' is not assignable to parameter of type 'number'.
  if (hasValue('r1c1')) { yield stop('x') }`,
    );
  });

  test("both parameters destructured still catches a puzzle typo", () => {
    expect(typecheck("function* update ({ cells }, { getCandidatez }) {\n  yield getCandidatez(cells[0])\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'.
  function* update ({ cells }, { getCandidatez }) {`,
    );
  });

  test("the placeholder name does not leak into the body", () => {
    expect(typecheck("function* update ({ cells }, puzzle) {\n  yield puzzle.stop(String(options0))\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Cannot find name 'options0'.
  yield puzzle.stop(String(options0))`,
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
      typecheck(
        "function setParams (instance, p) {\n  instance.sequences = p\n}\nfunction* update (instance, puzzle) {\n  yield puzzle.stop(String(instance.sequences.length))\n}",
      ),
    ).toBeUndefined();
  });

  test("a member can be used, not merely read", () => {
    expect(
      typecheck(
        "function* update (instance, puzzle) {\n  for (const s of instance.sequences.filter(x => x.length)) { yield puzzle.stop(String(s)) }\n}",
      ),
    ).toBeUndefined();
  });

  test("a known field cannot be overwritten", () => {
    expect(typecheck("function setParams (instance, p) {\n  instance.cells = p\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Cannot assign to 'cells' because it is a read-only property.
  instance.cells = p`,
    );
  });

  test("a known field keeps its real type", () => {
    expect(
      typecheck("function* update (instance, puzzle) {\n  yield puzzle.stop(instance.cells.toUpperCase())\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'toUpperCase' does not exist on type 'number[]'.
  yield puzzle.stop(instance.cells.toUpperCase())`,
    );
  });

  test("a misspelled known field is NOT caught - the cost of admitting any member name", () => {
    expect(
      typecheck(
        "function* update (instance, puzzle) {\n  yield puzzle.removeCandidateFromCell(1, instance.cellIdz[0])\n}",
      ),
    ).toBeUndefined();
  });
});
