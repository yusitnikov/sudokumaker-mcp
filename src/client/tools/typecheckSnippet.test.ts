import { describe, expect, test } from "vitest";
import { getInitializationCodeDiagnostics, typecheckInitializationCode } from "./editInitializationCodeTool";
import { backendResources } from "../../backendResourcesImpl";

describe("real initialization code", () => {
  test("the killer cage example typechecks clean", () => {
    expect(
      typecheckInitializationCode(
        backendResources,
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
      typecheckInitializationCode(
        backendResources,
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
      typecheckInitializationCode(
        backendResources,
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
      typecheckInitializationCode(
        backendResources,
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
        ["OneOfSequencesComponent"],
      ),
    ).toBeUndefined();
  });

  test('"Prime Digit Alternation" typechecks clean', () => {
    expect(
      typecheckInitializationCode(
        backendResources,
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
      typecheckInitializationCode(
        backendResources,
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
    expect(typecheckInitializationCode(backendResources, "helpers.naming.thisDoesNotExist();")).toMatch(
      /thisDoesNotExist/,
    );
  });

  test("reports a standard component called with too few arguments", () => {
    expect(typecheckInitializationCode(backendResources, `new BetweenComponent("b", [1, 2]);`)).toMatch(
      /Expected 3 arguments/,
    );
  });

  test("reports an unknown name", () => {
    expect(typecheckInitializationCode(backendResources, "noSuchComponent();")).toMatch(/Cannot find name/);
  });

  test("reports an array passed to a digit set's constructor", () => {
    // The constructor coerces its argument with `+`, so an array becomes `NaN` and the set comes
    // out empty. `DigitSet.from` is the documented way to build one from digits.
    expect(typecheckInitializationCode(backendResources, "const set = new DigitSet([1, 2, 3]);")).toMatch(
      /not assignable to parameter of type 'number \| SmallNumberSet'/,
    );
  });

  test("reports a syntax error rather than throwing", () => {
    expect(typecheckInitializationCode(backendResources, "const x = ;")).toMatch(/line 1/);
  });

  test("reports DOM globals, which the worker does not have", () => {
    expect(typecheckInitializationCode(backendResources, `document.querySelector("div");`)).toMatch(
      /Cannot find name 'document'/,
    );
  });

  test("reports top-level await exactly once", () => {
    const result = typecheckInitializationCode(backendResources, "const x = await Promise.resolve(1);");
    expect(result).toMatch(/'await' expressions are only allowed at the top level/);
    expect(result?.match(/line 1:/g)).toHaveLength(1);
  });

  test("reports top-level return", () => {
    expect(typecheckInitializationCode(backendResources, "return 5;")).toMatch(
      /'return' statement can only be used within a function body/,
    );
  });

  test("reports the user's own line number", () => {
    expect(typecheckInitializationCode(backendResources, "const a = 1;\nconst b = 2;\nnoSuchName();\n")).toMatch(
      /line 3:/,
    );
  });

  test("says the change was applied, so the caller does not retry", () => {
    expect(typecheckInitializationCode(backendResources, "noSuchName();")).toMatch(/The change WAS applied/);
  });
});

describe("code that does nothing", () => {
  // A constraint whose code is empty adds no components, which is valid - and the file having no
  // statements is the one case where it could be mistaken for a module and lose every global,
  // turning every later snippet into a flood of "cannot find name".
  test("an empty snippet is clean", () => {
    expect(typecheckInitializationCode(backendResources, "")).toBeUndefined();
  });

  test("a whitespace-only snippet is clean", () => {
    expect(typecheckInitializationCode(backendResources, "   \n\n  ")).toBeUndefined();
  });

  test("a comment-only snippet is clean", () => {
    expect(typecheckInitializationCode(backendResources, "// nothing here")).toBeUndefined();
  });
});

/*
 * The worker runs the snippet as JavaScript, so it is checked as JavaScript. Several things that
 * are ordinary JS were reported while it was checked as `.ts`; what a JS author still owes the
 * checker is a type for a variable that holds more than its initializer suggests.
 */
describe("checked as JavaScript", () => {
  test("growing an object past the shape it was created with is clean", () => {
    expect(typecheckInitializationCode(backendResources, "const o = {};\no.newProp = 1;")).toBeUndefined();
  });

  test("redeclaring a function at top level is clean", () => {
    expect(
      typecheckInitializationCode(backendResources, "function f() {\n  return 1;\n}\nfunction f() {\n  return 2;\n}"),
    ).toBeUndefined();
  });

  /*
   * A variable's type is inferred from its initializer, so reassigning it to another type is
   * reported. That is the author's cue to say what the variable actually holds, which a JSDoc
   * `@type` does - and the annotation is then enforced in turn.
   */
  test("reassigning a variable to another type is reported", () => {
    expect(typecheckInitializationCode(backendResources, `var v = 1;\nv = "two";`)).toMatch(
      /Type 'string' is not assignable to type 'number'/,
    );
  });

  test("a JSDoc type covering both types makes the reassignment clean", () => {
    expect(
      typecheckInitializationCode(backendResources, `/** @type {number | string} */\nvar v = 1;\nv = "two";`),
    ).toBeUndefined();
  });

  test("a value outside the JSDoc type is still reported", () => {
    expect(
      typecheckInitializationCode(backendResources, `/** @type {number | string} */\nvar v = 1;\nv = true;`),
    ).toMatch(/Type 'boolean' is not assignable to type 'string \| number'/);
  });

  test("a parameter with no annotation is not an implicit-any error", () => {
    expect(typecheckInitializationCode(backendResources, "function f(a, b) {\n  return a + b;\n}\nf(1, 2);")).toBe(
      undefined,
    );
  });
});

describe("getInitializationCodeDiagnostics", () => {
  test("an empty snippet produces no diagnostics", () => {
    expect(getInitializationCodeDiagnostics(backendResources, "")).toEqual([]);
  });

  test("a whitespace-only snippet produces no diagnostics", () => {
    expect(getInitializationCodeDiagnostics(backendResources, "   \n\n  ")).toEqual([]);
  });

  test("a comment-only snippet produces no diagnostics", () => {
    expect(getInitializationCodeDiagnostics(backendResources, "// nothing here")).toEqual([]);
  });
});

describe("the worker's own globals", () => {
  test("console is available", () => {
    expect(typecheckInitializationCode(backendResources, `console.log("hi");`)).toBeUndefined();
  });

  test("constructing a scanned class is not a false positive", () => {
    expect(typecheckInitializationCode(backendResources, "const set = DigitSet.from([1, 2, 3]);")).toBeUndefined();
  });
});

describe("the element's custom components", () => {
  test("a component named in the element constructs cleanly", () => {
    expect(typecheckInitializationCode(backendResources, "new MyCage(1, 2, 3);", ["MyCage"])).toBeUndefined();
  });
});
