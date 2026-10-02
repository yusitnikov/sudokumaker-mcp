import type { DocsTopic } from "./topics";
import {
  customComponentsTopicName,
  customConstraintsTopicName,
  solvingTopicName,
  typesReferenceTopicName,
} from "./topicNames";
import { addCustomComponentToolName, doAllLogicalStepsToolName, doLogicalStepToolName } from "../toolNames";

export const customComponentsTopic: DocsTopic = {
  name: customComponentsTopicName,
  description: "How to write a custom component",
  content: () =>
    // language=markdown
    `
# Custom components

A component is one unit of a constraint's logic, applied to a set of cells
(topic \`${customConstraintsTopicName}\` explains how a constraint is composed of components).
A custom component is one whose logic is written in JavaScript, for a rule that no standard component covers.
The name given to \`${addCustomComponentToolName}\` becomes a class name,
and the initialization code creates instances of it with \`new\`, the same way as standard components:
\`\`\`
puzzle.addConstraintComponent(new MyComponent(name, cells));
\`\`\`

## Choosing what a component covers

Leave to standard components every part of the rule they can express,
and write a custom component only for the rest.
A constraint can add both kinds for the same cells, as the killer cage example in topic \`${customConstraintsTopicName}\` adds two standard ones.

Make one instance per clue rather than one instance for the whole grid:
- The solver's log names the instance that made a deduction, so a per-clue name says which clue it was.
- The fewer cells an instance covers, the cheaper its \`update\`, and the more practical it is to try every candidate (see "Patterns" below).
- An instance can remove itself or hand over to standard components once its own clue is settled,
  so the solver stops running code for that clue while the others still need it.

Split a clue further, into one instance per part, only when the rule itself is a set of independent conditions on those parts,
as with a rule about every pair of adjacent cells on a line.
When the rule ties all the clue's cells together, one instance has to see all of them:
an instance only knows the cells it was given, and can't deduce anything that depends on the others.

## The hooks

A component's code declares top-level functions with the names below, called *hooks*.
Every hook is optional.

| Hook | Called | Purpose |
|---|---|---|
| \`getAffectedCells(...args)\` | once per instance, by \`new\` | Returns the cells the component applies to. |
| \`setParams(instance, ...args)\` | once per instance, by \`new\` | Stores the constructor arguments on \`instance\`. |
| \`function* initialize(instance, puzzle)\` | once per instance, after \`puzzle.addConstraintComponent\` | Yields one-time eliminations; precomputes data for other hooks. |
| \`validate(instance, puzzle)\` | before every step of the logical solver and of the brute-force search | Returns \`false\` if the rule is already broken. |
| \`function* update(instance, puzzle)\` | before every step of the logical solver and of the brute-force search | Deduces what the rule implies for the current candidates, and yields the resulting changes. |

### Constructor arguments: \`getAffectedCells\` and \`setParams\`

The first constructor argument is always the component's name, and \`getAffectedCells\` and \`setParams\` don't receive it.
\`args\` in the table above are the remaining constructor arguments, in the order the initialization code passes them.

Without \`getAffectedCells\`, the component's cells are the constructor argument right after the name,
so a component constructed as \`(name, cells, ...)\` doesn't need it, however many arguments follow.
Declare \`getAffectedCells\` only when that argument isn't the full list of the cells the component affects,
and return that list, built from the arguments.
Declare \`setParams\` to store on \`instance\` the other arguments the hooks need.

For example, a border indexer is a clue outside a row.
The digit N in the cell next to the clue means that the Nth and the (N+1)th cells from the clue sum to the clue,
counting the cell next to the clue as the first;
when the Nth cell is the last one in the row, it equals the clue on its own.
The initialization code creates its component from an input group's \`cells\` and \`value\`
with \`new BorderIndexerComponent(name, cells, Number(value))\`, the row's cells ordered from the clue outwards.
The cells come right after the name, so the component needs only \`setParams\`:
\`\`\`
/**
 * @param {{ sum: number }} instance
 * @param {CellId[]} cells
 * @param {number} sum
 */
function setParams(instance, cells, sum) {
  instance.sum = sum
}
\`\`\`

A component whose rule relates two groups of cells, created with \`new MyComponent(name, cells1, cells2)\`,
affects the cells of both groups, which neither argument lists in full, so it declares \`getAffectedCells\` as well:
\`\`\`
/**
 * @param {CellId[]} cells1
 * @param {CellId[]} cells2
 */
function getAffectedCells(cells1, cells2) {
  return [...cells1, ...cells2]
}

/** @param {{ cells1: CellId[], cells2: CellId[] }} instance */
function setParams(instance, cells1, cells2) {
  instance.cells1 = cells1
  instance.cells2 = cells2
}
\`\`\`

\`initialize\`, \`validate\` and \`update\` can read the name as \`instance.name\`, and the cells as \`instance.cells\`.
\`instance.cells\` is what \`getAffectedCells\` returned, or, without \`getAffectedCells\`, the constructor argument right after the name.

The solver's log names a component by its name, e.g.
"placing 1 in r2c3 causes a contradiction: unable to satisfy <name>".
Give each instance a name that mentions the rule and the cells, as the \`${customConstraintsTopicName}\` examples do,
so that a \`${doLogicalStepToolName}\` result says which clue made the deduction.

### \`validate\` - quick, but weak

\`validate\` answers one question: is the rule already broken?
Returning \`true\` when unsure is fine;
returning \`true\` when all the component's cells are filled with digits that break the rule is not.
The minimal version returns \`true\` until every cell is filled;
a stronger one also returns \`false\` as soon as the cells filled so far make the rule impossible to satisfy.
For anti-tic-tac-toe - three cells in a line don't all contain the same digit - the rule can only break once all three are filled,
so the minimal version is also the complete one:
\`\`\`
function validate(instance, puzzle) {
  const { cells } = instance
  if (!puzzle.getCellsAreFilled(cells)) {
    return true
  }
  const [a, b, c] = cells.map((cell) => puzzle.getValue(cell))
  return a !== b || b !== c
}
\`\`\`
\`validate\` never eliminates a candidate.
The logical solver can use it only when the app's settings allow deductions by contradiction:
it places a digit in a cell as a trial and finds that \`validate\` returns \`false\`.
The brute-force search still finds the solutions,
but more slowly than with \`update\`, for two reasons.
It notices a broken rule only after filling enough cells for \`validate\` to return \`false\`.
And it can't tell in advance which cells and digits could break the rule,
so it can spend a long time trying digits in other parts of the grid
before it reaches the cells or digits that actually break the component.

### \`update\` - the real logic

\`update\` is a generator: each change (see "Changes to yield" below) is \`yield\`ed as it is found,
and a \`return\` ends the call.
The eliminations an earlier call yielded stay in the candidates,
and the values \`setParams\` and \`initialize\` stored on \`instance\` stay available,
but nothing else an earlier \`update\` call worked out can be relied on -
every call derives its deductions from the current candidates.

Once \`update\` exists, \`validate\` is unnecessary,
as long as \`update\` reports a broken rule at least whenever all the component's cells are filled.
\`update\` reports a broken state either by removing a cell's last candidate or by yielding \`puzzle.stop()\`.

Anti-tic-tac-toe as \`update\`:
\`\`\`
function* update(instance, puzzle) {
  const [a, b, c] = instance.cells
  for (const [x, y, z] of [[a, b, c], [a, c, b], [b, c, a]]) {
    const value = puzzle.getValue(x)
    const other = puzzle.getValue(y)
    if (value === undefined || other === undefined) {
      continue
    }
    if (value === other) {
      yield puzzle.removeCandidateFromCell(value, z)
    }
    // Two digits known: whatever the third cell is, the component has nothing more to deduce.
    yield puzzle.removeComponent(instance)
    return
  }
}
\`\`\`

### \`initialize\`

\`initialize\` is a generator like \`update\`, and can yield every change \`update\` can,
except removing or replacing the component itself.

Since \`update\` runs before every solver step and should stay as cheap as possible,
anything that depends only on the component's cells and not on the candidates -
a map of neighbours, every triple of cells that see each other - should be computed once in \`initialize\`
and stored on \`instance\`.

Eliminations that hold before anything is known about the grid belong in \`initialize\` too.
Take a slingshot: an indexer cell, a target cell, and a direction,
where the indexer's digit N means that the Nth cell in that direction, counting the indexer's neighbour as the first,
has the same digit as the target.
\`initialize\` removes from the indexer every digit N whose Nth cell would be outside the grid,
once, instead of on every step.

### JSDoc types

A component's code is JavaScript, and the tools that write it typecheck it with TypeScript and report the problems they find.
Whatever TypeScript can't infer gets type \`any\`, and the typecheck can't find problems in code that uses it.
So standard JSDoc tags are optional, but help anywhere they would tell TypeScript a type:
a hook's arguments, a helper function's parameters, a variable that starts out empty.

Two cases in the hooks go further than one function:
- Tagging the constructor arguments in \`getAffectedCells\` or \`setParams\`
  makes the typecheck verify the constructor calls in the initialization code.
- Without a tag on \`instance\`, the typecheck accepts any member name on it, including a misspelled one.
  Tagging \`instance\` in any one hook makes the typecheck report every use of a member that no tag declares, in every hook.

## Variables and classes available to the hooks

A hook's \`puzzle\` argument has TypeScript type \`CustomComponentPuzzle\`,
and its \`instance\` argument has TypeScript type \`CustomComponentInstance\`.
The values \`initialize\` and \`update\` yield have TypeScript type \`Change\`.

SudokuMaker also defines these variables before running a component's code,
so every hook uses them directly, without declaring them:
- \`helpers\`, TypeScript type \`CustomComponentScopeHelpers\`.
  Groups of helper functions: the groups the \`Helpers\` type declares, plus \`geometry\`.
- \`customComponents\`, an object holding the element's custom component classes, keyed by component name.

A hook can create components with \`new\` from every standard component class, under its class name,
and from the element's other custom components through \`customComponents\`.

A hook can also use the classes, enums and utility objects in \`globals.d.ts\`, such as \`DigitSet\`.

Topic \`${typesReferenceTopicName}\` declares all of them, and every TypeScript type named above.

## Reading the grid

- \`puzzle.getCandidates(cell)\` - the cell's candidates, as a \`DigitSet\`.
- \`puzzle.hasValue(cell)\` - whether a single candidate is left.
- \`puzzle.getValue(cell)\` - that digit, or \`undefined\` while more than one candidate is left.
- \`puzzle.getCellsAreFilled(cells)\` - whether every one of the cells has a single candidate left.
- \`puzzle.minDigit\`, \`puzzle.maxDigit\`, \`puzzle.width\`, \`puzzle.height\` -
  read these rather than assuming a 1-9 digit range or a 9x9 grid.

## Changes to yield

In the list below, \`digit\` is a single number, \`digits\` is a \`DigitSet\` (e.g. \`DigitSet.from([1, 2])\`, never an array),
\`cell\` is one cell ID, and \`cells\` is any iterable of cell IDs.

- \`puzzle.removeCandidateFromCell(digit, cell)\`, \`puzzle.removeCandidateFromCells(digit, cells)\`
- \`puzzle.removeCandidatesFromCell(digits, cell)\`, \`puzzle.removeCandidatesFromCells(digits, cells)\`
- \`puzzle.filterCandidatesInCell(digits, cell)\`, \`puzzle.filterCandidatesInCells(digits, cells)\` -
  remove every candidate that is not in \`digits\`.
- \`puzzle.stop(message?, cells?)\` - the rule is broken.
  The message defaults to "unable to satisfy <component name>",
  and \`cells\` (an array here) optionally names the cells that break it.
  \`return\` right after it, since nothing else is worth deducing.
- \`puzzle.removeComponent(instance)\` - the rule is satisfied whatever the remaining candidates turn out to be,
  so the solver stops calling this component.
  \`return\` right after it.
- \`puzzle.replaceComponent(instance, replacement)\` - the solver uses \`replacement\` instead of this component from now on.
  \`replacement\` is one component or an array of components:
  a standard component is created as \`new <ClassName>(...)\`, and a custom one as \`new customComponents.<Name>(...)\`.
  \`return\` right after it.

## Patterns

### Simplify as soon as possible

Once the digits placed so far reduce the rule to a simpler one that standard components express,
\`update\` should replace the component with those standard components.
From then on the solver runs the standard component's logic instead of this component's code.

For example, the border indexer is a sum of two cells as soon as its first cell's digit is known:
\`\`\`
function* update(instance, puzzle) {
  const { name, cells, sum } = instance
  const index = puzzle.getValue(cells[0])
  if (index !== undefined) {
    // When the index points at the last cell, slice() returns that cell alone.
    yield puzzle.replaceComponent(instance, new SumComponent(name, sum, cells.slice(index - 1, index + 1)))
    return
  }
  // ... deductions while the index is still unknown
}
\`\`\`

### Try every candidate

When a component covers few cells, trying the candidates finds, with little code, every elimination in those cells that follows from this rule alone:
enumerate the combinations of one candidate per cell that satisfy the rule,
collect every digit that appears in at least one of them, and filter each cell down to its collected digits.
Unlike \`validate\`, this gives the logical solver eliminations to make, and speeds up the brute-force search as well.

For example, a Kropki square is four cells that split into two pairs, in an unknown way:
the digits of one pair are in a 1:2 ratio, and the digits of the other pair are consecutive.
A combination is a way to split the four cells into a ratio pair and a consecutive pair,
together with a digit for each cell:
\`\`\`
function* update(instance, puzzle) {
  const { cells } = instance
  const candidates = cells.map((cell) => puzzle.getCandidates(cell))
  const supported = cells.map(() => new DigitSet())

  // [ratio pair, consecutive pair], as positions in \`cells\`
  for (const [i, j, k, l] of [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2], [1, 2, 0, 3], [1, 3, 0, 2], [2, 3, 0, 1]]) {
    const ratioPairs = getPairs(candidates[i], candidates[j], (x, y) => x !== y && (x === 2 * y || y === 2 * x))
    const consecutivePairs = getPairs(candidates[k], candidates[l], (x, y) => Math.abs(x - y) === 1)
    if (ratioPairs.length === 0 || consecutivePairs.length === 0) {
      continue
    }
    for (const [x, y] of ratioPairs) {
      supported[i].add(x)
      supported[j].add(y)
    }
    for (const [x, y] of consecutivePairs) {
      supported[k].add(x)
      supported[l].add(y)
    }
  }

  for (const [index, cell] of cells.entries()) {
    // if supported[index] is empty, yielding it will make SudokuMaker understand that the puzzle is broken
    yield puzzle.filterCandidatesInCell(supported[index], cell)
  }
}

/**
 * @param {DigitSet} set1
 * @param {DigitSet} set2
 * @param {(x: number, y: number) => boolean} fits
 */
function getPairs(set1, set2, fits) {
  /** @type {[number, number][]} */
  const pairs = []
  for (const x of set1) {
    for (const y of set2) {
      if (fits(x, y)) {
        pairs.push([x, y])
      }
    }
  }
  return pairs
}
\`\`\`
Collect every satisfying combination.
Stopping at the first one leaves the digits of the others uncollected, and the filter wrongly eliminates them.

Trying every combination pays off only while the combinations are few.
When one cell's digit determines which cells the rule applies to, like the border indexer's first cell,
it can be enough to try only that cell's candidates,
and remove each one that leaves no way to satisfy the rule.

## Checking that \`update\` deduces enough

Run \`${doLogicalStepToolName}\` or \`${doAllLogicalStepsToolName}\` and read the log.
A deduction by contradiction (topic \`${solvingTopicName}\`) is made only when no other deduction was found, including by every \`update\`,
so the first one in the log is where every other deduction, \`update\`'s included, got stuck.
If the puzzle is meant to be solvable without contradictions,
check whether the rule implies an elimination at that point that \`update\` didn't make.
`.trim(),
};
