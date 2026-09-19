import { describe, expect, test } from "vitest";
import { InitializationCodeTypescript } from "./editInitializationCodeTool";
import { backendResources } from "../../backendResourcesImpl";

const checkerNoComponents = new InitializationCodeTypescript(backendResources);

describe("real initialization code", () => {
  test("the killer cage example typechecks clean", () => {
    expect(
      checkerNoComponents.typecheck(
        `for (const { cells, value } of input.groups) {
  const name = 'killer cage in ' + helpers.naming.getCellsDescription(cells);
  puzzle.addConstraintComponent(new DifferentDigitsComponent(name, cells));
  puzzle.addConstraintComponent(new SumComponent(name, Number(value), cells));
}`,
      ),
    ).toBeUndefined();
  });

  test("the anti-knight example typechecks clean", () => {
    expect(
      checkerNoComponents.typecheck(
        `for (const cells of helpers.geometry.getAllKnightMovePairs()) {
  puzzle.addConstraintComponent(new DifferentDigitsComponent(
    'anti-knight at ' + helpers.naming.getCellsDescription(cells),
    cells
  ));
}`,
      ),
    ).toBeUndefined();
  });

  test("the classic sudoku example typechecks clean", () => {
    expect(
      checkerNoComponents.typecheck(
        `for (const [index, cells] of Array.from(helpers.geometry.getAllRows()).entries()) {
  puzzle.addConstraintComponent(new HouseComponent(\`row \${index + 1}\`, cells));
}`,
      ),
    ).toBeUndefined();
  });
});

/*
 * Verbatim from puzzles open in the browser. These are the acceptance cases: whatever the checker
 * does to code a setter has actually written and is happy with is what it will do in practice.
 */
describe("initialization code from real puzzles", () => {
  test('"Parity Party" typechecks clean', () => {
    expect(
      new InitializationCodeTypescript(backendResources, ["OneOfSequencesComponent"]).typecheck(
        `function * getValidSequences(sum, paritySoFar = undefined, remainingDigits = helpers.digits.createFullDigitSet()) {
  for (const digit of remainingDigits) {
    const remainder = sum - digit
    if (remainder === 0) {
      if (paritySoFar === undefined || digit % 2 !== paritySoFar) {
        yield [digit]
      }
    }
    else if (remainder > 0 && (paritySoFar === undefined || digit % 2 === paritySoFar)) {
      const newRemainingDigits = new DigitSet(remainingDigits)
      newRemainingDigits.delete(digit)
      for (const subSequence of getValidSequences(remainder, digit % 2, newRemainingDigits)) {
        yield [digit, ...subSequence]
      }
    }
  }
}

for (const group of input.groups) {
  if (group.cells.length < puzzle.size) continue
  const name = \`the parity party clue at \${helpers.naming.getCellName(group.cells[0])}-\${helpers.naming.getCellName(group.cells.at(-1))}\`
  const sequences = Array.from(getValidSequences(Number(group.value)))
  puzzle.addConstraintComponent(new OneOfSequencesComponent(name, sequences, group.cells))
}`,
      ),
    ).toBeUndefined();
  });

  test('"Prime Digit Alternation" typechecks clean', () => {
    expect(
      checkerNoComponents.typecheck(
        `const primes = DigitSet.from([2, 3, 5, 7]);
const nonPrimes = DigitSet.from([1, 4, 6, 8, 9]);

for (const { cells } of input.groups) {
  if (cells.length < 2) {
    continue;
  }

  const name = 'Prime alternation at ' + helpers.naming.getCellsDescription(cells);

  for (let i = 0; i < cells.length - 1; i++) {
    puzzle.addConstraintComponent(
      new DifferentGroupsComponent(
        name + \` (\${i}-\${i+1})\`,
        [primes, nonPrimes],
        [cells[i], cells[i + 1]]
      )
    );
  }
}`,
      ),
    ).toBeUndefined();
  });

  test('"No 7" typechecks clean', () => {
    expect(
      checkerNoComponents.typecheck(
        `const set = helpers.digits.createFilteredDigitSet(n => n !== 7);
const list = Array.from(set);

for (const [index, cells] of [...helpers.geometry.getAllRows()].entries()) {
  puzzle.addConstraintComponent(new RequiredDigitsComponent(\`row \${index + 1}\`, list, cells));
}
for (const [index, cells] of [...helpers.geometry.getAllColumns()].entries()) {
  puzzle.addConstraintComponent(new RequiredDigitsComponent(\`column \${index + 1}\`, list, cells));
}
for (const [index, cells] of [...puzzle.getRegions()].entries()) {
  puzzle.addConstraintComponent(new RequiredDigitsComponent(\`box \${index + 1}\`, list, cells));
}`,
      ),
    ).toBeUndefined();
  });
});

describe("problems in the snippet", () => {
  test("reports a misspelled helper method", () => {
    // Also the regression test for module resolution: if `./types` stops resolving, `helpers`
    // becomes `any` and this passes silently.
    expect(checkerNoComponents.typecheck("helpers.naming.thisDoesNotExist();")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.

line 1 - error TS2339: Property 'thisDoesNotExist' does not exist on type 'NamingHelper'.

1 helpers.naming.thisDoesNotExist();
                 ~~~~~~~~~~~~~~~~`,
    );
  });

  test("reports a standard component called with too few arguments", () => {
    expect(checkerNoComponents.typecheck(`new BetweenComponent("b", [1, 2]);`)).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.

line 1 - error TS2554: Expected 3 arguments, but got 2.

1 new BetweenComponent("b", [1, 2]);
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
    );
  });

  test("reports an unknown name", () => {
    expect(checkerNoComponents.typecheck("noSuchComponent();")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.

line 1 - error TS2552: Cannot find name 'noSuchComponent'. Did you mean 'SumComponent'?

1 noSuchComponent();
  ~~~~~~~~~~~~~~~`,
    );
  });

  test("reports an array passed to a digit set's constructor", () => {
    // The constructor coerces its argument with `+`, so an array becomes `NaN` and the set comes
    // out empty. `DigitSet.from` is the documented way to build one from digits.
    expect(checkerNoComponents.typecheck("const set = new DigitSet([1, 2, 3]);")).toBe(
      `[WARNING] TypeScript found 1 problem(s) in the new initialization code. The change WAS applied.

line 1 - error TS2345: Argument of type 'number[]' is not assignable to parameter of type 'number | SmallNumberSet'.   Type 'number[]' is missing the following properties from type 'SmallNumberSet': mask, add, clear, delete, and 13 more.

1 const set = new DigitSet([1, 2, 3]);
                           ~~~~~~~~~`,
    );
  });
});

/*
 * A constraint whose code is empty adds no components, which is valid - and a file with no
 * statements is the one case where it could be mistaken for a module and lose every ambient global,
 * turning every later snippet into a flood of "cannot find name".
 */
describe("code that does nothing", () => {
  test("an empty snippet is clean", () => {
    expect(checkerNoComponents.typecheck("")).toBeUndefined();
  });
});

describe("diagnostics for the generated code", () => {
  test("an empty snippet produces no diagnostics", () => {
    expect(checkerNoComponents.getDiagnostics("")).toEqual([]);
  });

  test("a whitespace-only snippet produces no diagnostics", () => {
    expect(checkerNoComponents.getDiagnostics("   \n\n  ")).toEqual([]);
  });

  test("a comment-only snippet produces no diagnostics", () => {
    expect(checkerNoComponents.getDiagnostics("// nothing here")).toEqual([]);
  });
});

describe("the element's custom components", () => {
  test("a component named in the element constructs cleanly", () => {
    expect(
      new InitializationCodeTypescript(backendResources, ["MyCage"]).typecheck("new MyCage(1, 2, 3);"),
    ).toBeUndefined();
  });
});
