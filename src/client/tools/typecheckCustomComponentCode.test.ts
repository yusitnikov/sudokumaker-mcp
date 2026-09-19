import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "./typecheckCustomComponentCode";
import { backendResources } from "../../backendResourcesImpl";

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
});

describe("problems in a hook body", () => {
  test("reports a misspelled puzzle method", () => {
    expect(
      checker.typecheck("function* update (instance, puzzle) {\n  yield puzzle.getCandidatez(instance.cellIds[0])\n}"),
    ).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 2 - error TS2551: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'. Did you mean 'getCandidates'?

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

line 5 - error TS2339: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.

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

line 5 - error TS2339: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.

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

line 4 - error TS2339: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.

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

line 2 - error TS2322: Type 'number' is not assignable to type 'SolverAction'.

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

line 2 - error TS2322: Type 'number' is not assignable to type 'SolverAction'.

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

line 2 - error TS2339: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.

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

line 2 - error TS2322: Type 'number' is not assignable to type 'SolverAction'.

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

line 2 - error TS2322: Type 'number' is not assignable to type 'SolverAction'.

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

line 2 - error TS2339: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.

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

line 2 - error TS2339: Property 'cells' does not exist on type 'CustomComponentPuzzleBase'.

2   return puzzle.getCellsAreFilled(instance.cells)
                                             ~~~~~`,
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

line 2 - error TS2339: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.

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

line 6 - error TS2339: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.

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

line 1 - error TS2551: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'. Did you mean 'getCandidates'?

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

line 2 - error TS2551: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'. Did you mean 'getCandidates'?

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

line 3 - error TS2339: Property 'nope' does not exist on type 'CustomComponentPuzzleBase'.

3   return puzzle.nope()
                  ~~~~`,
    );
  });

  test("no hooks at all is clean", () => {
    expect(checker.typecheck("const x = 1;")).toBeUndefined();
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

line 1 - error TS2339: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'.

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

line 1 - error TS2339: Property 'getCandidatez' does not exist on type 'CustomComponentPuzzleBase'.

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
