import type { DocsTopic } from "./topics";
import {
  bruteForceSolveTool,
  doAllLogicalStepsTool,
  doLogicalStepTool,
  stopSolverTool,
  waitForSolverTool,
} from "../solverTools";
import { redoTool, undoTool } from "../undoRedoTools";

export const solvingTopic: DocsTopic = {
  name: "solving",
  description:
    "Performing logical steps, finding all solutions, checking whether the puzzle is broken or non-unique, and reading the results.",
  content: () =>
    // language=markdown
    `
# Solving and checking

## The checks

<!-- placeholder: check_validity (a dedicated existence-plus-uniqueness check that writes nothing to the grid) is a
     Phase 12 deliverable of the ongoing refactor and doesn't exist yet. Until then, the authority for "is this puzzle
     broken / does it have a unique solution" is \`${bruteForceSolveTool.name}\`, even though it also writes solved
     values/candidates into the grid as a side effect (see "state effects" below) — there's no side-effect-free
     verdict tool yet. -->

- \`${bruteForceSolveTool.name}\` finds and counts all solutions and computes exact candidates for every cell. On a
  unique solution it fills the solved values into the grid; counting has a cap the app itself reports if hit.
  This is the reliable source for "broken" (no solutions) vs. "unique" vs. "non-unique" (several solutions).
- \`${doLogicalStepTool.name}\` / \`${doAllLogicalStepsTool.name}\` deduce the way a human solver would, one step or
  all reachable steps. They may miss eliminations that are logically valid but too hard to deduce this way — a step
  finding nothing doesn't mean the puzzle is broken, only that this method didn't find anything (yet).

Every check treats already-entered cell values and center marks as constraints — the app's own solve log says as much
("making use of the filled-in values") when they're present. A verdict returned while the grid has test-solve marks
on it is therefore conditional on those marks, not a verdict on the puzzle's rules alone. To judge the puzzle itself:
either report the verdict as conditional, or clear the grid first (\`clear_grid\`, undoable), re-check, then \`undo\`
to hand the grid back as it was.

## Reading results

Solver output lands as candidates and values in \`cells\`, inspected via \`get_puzzle\`. The verdict text itself is the
app's own words, returned verbatim in the tool response — not something to reinterpret or reword technically; relay
it in puzzle language.

The solver's scope is digit-based deductions only: it is blind to free-text rules descriptions and to purely cosmetic
elements (they carry no logical constraint), and it only sees elements that are \`enabled\` and not \`solverIgnored\`.
A puzzle whose real rule lives partly in prose or a cosmetic-only element can look "broken" or "non-unique" to the
solver while actually being fine by the intended rules — say so rather than relaying the raw verdict as fact when
such elements exist.

## State effects

Every writing solver run can be undone/redone like any other action, via \`${undoTool.name}\`/\`${redoTool.name}\`.

Any solving/checking run that writes values or candidates **overwrites** whatever was already in those cells,
including the user's own test-solve marks. A diagnostic run (one done only to get a verdict, not because the user
asked for the deduced values) should be undone with \`${undoTool.name}\` once its verdict has been read, unless the
user wants the result kept on the grid.

Mutating the givens or any logical element invalidates candidates computed before that change — re-run rather than
trusting stale candidates after an edit.

Setters differ in how much they lean on the automated solver during construction versus doing deductions by hand;
don't assume which the user prefers.

## Mechanics

\`${waitForSolverTool.name}\` waits for a run to finish and returns the same verdict text; call it again if the
response says the check is still running. \`${stopSolverTool.name}\` cancels a run in progress (e.g. an
over-long solution count).
`.trim(),
};
