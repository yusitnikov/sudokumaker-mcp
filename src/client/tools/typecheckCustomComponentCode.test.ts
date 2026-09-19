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

  /*
   * A compiler message can be a chain - an error with a nested explanation under it. It is
   * flattened with a space, so however many links it has it stays one line, and the run of spaces
   * is where the links were joined.
   */
  test("a nested compiler explanation is flattened onto one line", () => {
    expect(
      typecheck("function* update (instance, puzzle) {\n  yield puzzle.filterCandidatesInCell([1, 2, 3], instance.cells[0])\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Argument of type 'number[]' is not assignable to parameter of type 'number | SmallNumberSet'.   Type 'number[]' is missing the following properties from type 'SmallNumberSet': mask, add, clear, delete, and 13 more.
  yield puzzle.filterCandidatesInCell([1, 2, 3], instance.cells[0])`,
    );
  });

  /*
   * A diagnostic points at the offending expression rather than at the statement containing it, so
   * a call spread over several lines is reported against the line of the bad argument, and the echo
   * is that line alone.
   */
  test("a call spread over lines is reported against the argument's own line", () => {
    expect(
      typecheck(`function* update (instance, puzzle) {
  yield puzzle.filterCandidatesInCell(
    [1, 2, 3],
    instance.cells[0],
  )
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 3: Argument of type 'number[]' is not assignable to parameter of type 'number | SmallNumberSet'.   Type 'number[]' is missing the following properties from type 'SmallNumberSet': mask, add, clear, delete, and 13 more.
  [1, 2, 3],`,
    );
  });

  /* Even inside an argument that spans lines, the position is the property at fault. */
  test("an object literal spanning lines is reported against the offending property", () => {
    expect(
      typecheck(`function* update (instance, puzzle) {
  yield puzzle.filterCandidatesInCell({
    alpha: 1,
    beta: 2,
  }, instance.cells[0])
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 3: Object literal may only specify known properties, and 'alpha' does not exist in type 'SmallNumberSet'.
  alpha: 1,`,
    );
  });

  /*
   * A string literal type is printed with its control characters escaped, so even a literal written
   * across lines keeps the message on one - and the echo is the line the literal starts on, without
   * the rest of it.
   */
  test("a multi-line string literal is escaped into the compiler's one-line message", () => {
    expect(
      typecheck(`function* update (instance, puzzle) {
  /** @type {"only"} */
  const s = \`first
second\`
  yield puzzle.stop(s)
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 3: Type '"first\\nsecond"' is not assignable to type '"only"'.
  const s = \`first`,
    );
  });

  test("reports the author's own line number, past the annotation the checker adds", () => {
    expect(typecheck("function validate (instance, puzzle) {\n  // 2\n  // 3\n  // 4\n  return puzzle.nope()\n}")).toBe(
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

/*
 * Broken syntax is what the annotator meets most often - it runs on half-written code, before the
 * author is done. It parses the source itself to find the hooks, so a parse error anywhere could
 * cost it a hook, an annotation, or the line map; these pin that it still reports the author's own
 * lines whatever is broken and wherever.
 */
describe("broken syntax", () => {
  test("inside a hook body", () => {
    expect(typecheck("function validate (instance, puzzle) {\n  const x = ;\n  return true\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Expression expected.
  const x = ;`,
    );
  });

  /*
   * A trailing comma in a parameter list is legal JavaScript, so there is nothing to report - the
   * hook is still found and still annotated.
   */
  test("a trailing comma in a hook's parameter list is not an error", () => {
    expect(typecheck("function validate (instance, ) {\n  return true\n}")).toBeUndefined();
  });

  test("a trailing comma does not cost the hook its types", () => {
    expect(typecheck("function validate (instance, ) {\n  return instance.name.toFixed(2)\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 2: Property 'toFixed' does not exist on type 'string'. Did you mean 'fixed'?
  return instance.name.toFixed(2)`,
    );
  });

  test("a broken parameter list, with a stray comma first", () => {
    expect(typecheck("function validate (, puzzle) {\n  return true\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: Parameter declaration expected.
  function validate (, puzzle) {`,
    );
  });

  /*
   * Code this broken produces a mess, and this records it rather than claiming it is good. With the
   * parameter list unclosed, TypeScript takes the body for a third parameter, so the extra-parameter
   * message quotes the whole body - the one line of ours among nine of the compiler's, and the one
   * place where a message spans several lines. Nothing here is worth patching: the output is only as
   * good as the input, and an author this mid-keystroke is not reading it.
   */
  test("a parameter list left unclosed", () => {
    expect(typecheck("function validate (instance, puzzle {\n  return true\n}")).toBe(
      `[WARNING] TypeScript found 10 problem(s) in the new component code. The change WAS applied.
line 1: 'validate' is called with 2 argument(s), so '{
  return true
}' is always undefined.
  function validate (instance, puzzle {
line 1: Signature declarations can only be used in TypeScript files.
  function validate (instance, puzzle {
line 1: ',' expected.
  function validate (instance, puzzle {
line 2: Duplicate identifier '(Missing)'.
  return true
line 2: '(Missing)' is an unused renaming of 'return'. Did you intend to use it as a type annotation?
  return true
line 2: ':' expected.
  return true
line 2: Duplicate identifier '(Missing)'.
  return true
line 2: '(Missing)' is an unused renaming of 'true'. Did you intend to use it as a type annotation?
  return true
line 3: ':' expected.
  }
line 3: ')' expected.
  }`,
    );
  });

  test("in a hook's declaration, with the name missing", () => {
    expect(typecheck("function (instance, puzzle) {\n  return true\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: Identifier expected.
  function (instance, puzzle) {`,
    );
  });

  test("outside every hook", () => {
    expect(
      typecheck("const broken = ;\n\nfunction validate (instance, puzzle) {\n  return puzzle.nope()\n}"),
    ).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.
line 1: Expression expected.
  const broken = ;
line 4: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.
  return puzzle.nope()`,
    );
  });

  /* The hook below the break still has to be found, annotated, and reported on its own line. */
  test("before a hook, which is still typed", () => {
    expect(typecheck("const broken = ;\nfunction validate (instance, puzzle) {\n  return 1\n}")).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.
line 1: Expression expected.
  const broken = ;
line 3: Type 'number' is not assignable to type 'boolean'.
  return 1`,
    );
  });

  test("an unterminated string in a hook body", () => {
    expect(typecheck(`function* update (instance, puzzle) {\n  yield puzzle.stop("oops)\n}`)).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.
line 2: Unterminated string literal.
  yield puzzle.stop("oops)
line 3: ',' expected.
  }`,
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

/*
 * `initialize`, `validate` and `update` are called with exactly `(instance, puzzle)`, so a further
 * parameter is always `undefined` at runtime - a mistake the compiler cannot see, since a hook is a
 * declaration and nothing checks it against the app's argument list.
 */
describe("a hook declaring a parameter the app never passes", () => {
  test("an extra parameter on validate is reported", () => {
    expect(typecheck("function validate (instance, puzzle, extra) {\n  return !!extra\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: 'validate' is called with 2 argument(s), so 'extra' is always undefined.
  function validate (instance, puzzle, extra) {`,
    );
  });

  test("an extra parameter on update is reported", () => {
    expect(typecheck("function* update (instance, puzzle, extra) {\n  yield puzzle.removeComponent(instance)\n}")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: 'update' is called with 2 argument(s), so 'extra' is always undefined.
  function* update (instance, puzzle, extra) {`,
    );
  });

  test("an extra parameter on initialize is reported", () => {
    expect(
      typecheck("function* initialize (instance, puzzle, extra) {\n  yield puzzle.removeComponent(instance)\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: 'initialize' is called with 2 argument(s), so 'extra' is always undefined.
  function* initialize (instance, puzzle, extra) {`,
    );
  });

  test("every extra parameter is reported, not just the first", () => {
    expect(typecheck("function validate (instance, puzzle, a, b) {\n  return !!a && !!b\n}")).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.
line 1: 'validate' is called with 2 argument(s), so 'a' is always undefined.
  function validate (instance, puzzle, a, b) {
line 1: 'validate' is called with 2 argument(s), so 'b' is always undefined.
  function validate (instance, puzzle, a, b) {`,
    );
  });

  test("it is reported alongside a real type error, in line order", () => {
    expect(typecheck("function validate (instance, puzzle, extra) {\n  return puzzle.nope()\n}")).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.
line 1: 'validate' is called with 2 argument(s), so 'extra' is always undefined.
  function validate (instance, puzzle, extra) {
line 2: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.
  return puzzle.nope()`,
    );
  });

  test("it is reported on the hook's own line, wherever the hook sits", () => {
    expect(
      typecheck(
        `function setParams (instance, size) {
  instance.size = size
}

function validate (instance, puzzle, extra) {
  return puzzle.nope() && !!extra
}`,
      ),
    ).toBe(
      `[WARNING] TypeScript found 2 problem(s) in the new component code. The change WAS applied.
line 5: 'validate' is called with 2 argument(s), so 'extra' is always undefined.
  function validate (instance, puzzle, extra) {
line 6: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.
  return puzzle.nope() && !!extra`,
    );
  });

  /*
   * The parameter is named in the message by its own source text, so one written across lines makes
   * the message span them too - the only place a message is not a single line. Valid code, so this
   * is what the format costs, with no syntax error involved.
   */
  test("a destructured extra parameter is quoted across the lines it is written on", () => {
    expect(
      typecheck(`function validate (instance, puzzle, {
  first,
  second,
}) {
  return !!first && !!second
}`),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: 'validate' is called with 2 argument(s), so '{
  first,
  second,
}' is always undefined.
  function validate (instance, puzzle, {`,
    );
  });

  test("the variadic hooks take the component's own constructor arguments, so they are not reported", () => {
    expect(
      typecheck(
        "function getAffectedCells (a, b, c) {\n  return [a, b, c]\n}\nfunction setParams (instance, a, b, c) {\n  instance.a = a\n}",
      ),
    ).toBeUndefined();
  });

  test("an arrow hook's extra parameter is reported too", () => {
    expect(typecheck("const validate = (instance, puzzle, extra) => !!extra;")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.
line 1: 'validate' is called with 2 argument(s), so 'extra' is always undefined.
  const validate = (instance, puzzle, extra) => !!extra;`,
    );
  });

  test("the exact parameter count is clean", () => {
    expect(typecheck("function validate (instance, puzzle) {\n  return true\n}")).toBeUndefined();
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
