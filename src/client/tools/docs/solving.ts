import type { DocsTopic } from "./topics";
import {
  bruteForceSolveToolName,
  checkValidityToolName,
  clearGridToolName,
  doAllLogicalStepsToolName,
  doLogicalStepToolName,
  getPuzzleToolName,
  redoToolName,
  stopSolverToolName,
  undoToolName,
  waitForSolverToolName,
} from "../toolNames";
import { solvingTopicName } from "./topicNames";

export const solvingTopic: DocsTopic = {
  name: solvingTopicName,
  description:
    "Performing logical steps, finding all solutions, checking whether the puzzle is broken or non-unique, and reading the results.",
  content: () =>
    // language=markdown
    `
# Solving and checking

## The checks

- \`${checkValidityToolName}\` is the dedicated existence-plus-uniqueness check: whether the puzzle has a solution
  at all, and if so, whether it's unique. It writes nothing to the grid, so it's the check to reach for whenever
  only the verdict is needed — no state to restore afterward.
- \`${bruteForceSolveToolName}\` finds and counts all solutions and computes exact candidates for every cell. On a
  unique solution it fills the solved values into the grid; counting has a cap the app itself reports if hit. Use
  this instead of \`${checkValidityToolName}\` when the actual solution or exact candidates are also wanted, not
  just the verdict.
- \`${doLogicalStepToolName}\` / \`${doAllLogicalStepsToolName}\` deduce the way a human solver would, one step or
  all reachable steps. They may miss eliminations that are logically valid but too hard to deduce this way — a step
  finding nothing doesn't mean the puzzle is broken, only that this method didn't find anything (yet).

Every check treats already-entered cell values and center marks as constraints — the app's own solve log says as much
("making use of the filled-in values") when they're present. A verdict returned while the grid has test-solve marks
on it is therefore conditional on those marks, not a verdict on the puzzle's rules alone. To judge the puzzle itself:
either report the verdict as conditional, or clear the grid first (\`${clearGridToolName}\`, undoable), re-check, then \`${undoToolName}\`
to hand the grid back as it was.

## Reading results

Solver output lands as candidates and values in \`cells\`, inspected via \`${getPuzzleToolName}\`. The verdict text itself is the
app's own words, returned verbatim in the tool response — not something to reinterpret or reword technically; relay
it in puzzle language.

The solver's scope is digit-based deductions only: it is blind to free-text rules descriptions and to purely cosmetic
elements (they carry no logical constraint), and it only sees elements that are \`enabled\` and not \`solverIgnored\`.
A puzzle whose real rule lives partly in prose or a cosmetic-only element can look "broken" or "non-unique" to the
solver while actually being fine by the intended rules — say so rather than relaying the raw verdict as fact when
such elements exist.

When elements were skipped, the response names them, so there is no need to work it out from the puzzle.
Rules that live in the puzzle's prose are never named — nothing can detect those —
so check the rules text yourself before trusting a verdict.

Either way, tell the user the verdict together with what it didn't cover, e.g. "the solver says the solution is unique,
but it didn't take the parity rule into account — that one is only written in the rules text".

## State effects

Every writing solver run can be undone/redone like any other action, via \`${undoToolName}\`/\`${redoToolName}\`.

Any solving/checking run that writes values or candidates **overwrites** whatever was already in those cells,
including the user's own test-solve marks. A diagnostic run (one done only to get a verdict, not because the user
asked for the deduced values) should be undone with \`${undoToolName}\` once its verdict has been read, unless the
user wants the result kept on the grid. \`${checkValidityToolName}\` writes nothing, so this doesn't apply to it —
prefer it over \`${bruteForceSolveToolName}\` when only the verdict is wanted, to avoid the restore step entirely.

Mutating the givens or any logical element invalidates candidates computed before that change — re-run rather than
trusting stale candidates after an edit.

Setters differ in how much they lean on the automated solver during construction versus doing deductions by hand;
don't assume which the user prefers.

## Mechanics

\`${waitForSolverToolName}\` waits for a run to finish and returns the same verdict text; call it again if the
response says the check is still running. \`${stopSolverToolName}\` cancels a run in progress (e.g. an
over-long solution count).
`.trim(),
};
