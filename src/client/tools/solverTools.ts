import { ToolImplementation } from "./ToolImplementation";
import { reversibleActionNote } from "./descriptionSnippets";
import { z } from "zod";
import { getPuzzle, waitForSolver } from "../utils";
import { diffCells } from "./diff";
import {
  readNewSudokuMakerLogs,
  readSudokuMakerLogs,
} from "../../SudokuMakerLogs";
import {
  bruteForceSolveToolName,
  checkValidityToolName,
  doAllLogicalStepsToolName,
  doLogicalStepToolName,
  getLogsToolName,
  stopSolverToolName,
  waitForSolverToolName,
} from "./toolNames";

const singleStepTimeout = 5000;
const solverMaxTimeout = 30000;

/** The text block for an append-style tool's response: the log entries this call itself appended, oldest first. */
const appendedLogResultText = (
  before: ReturnType<typeof readSudokuMakerLogs>,
) => {
  const newEntries = readNewSudokuMakerLogs(before);

  return newEntries.length
    ? "New solver logs:\n" +
        newEntries.map((entry) => `- ${entry.formatted}`).join("\n")
    : `No new solver log entries - this run didn't add or change anything (e.g. a no-op on an already-solved grid). Use \`${getLogsToolName}\` to see the full log if needed.`;
};

/** The text block for a replace-style tool's response: the full current log, which this call itself just replaced. */
const replacedLogResultText = () =>
  "Solver logs:\n" +
  readSudokuMakerLogs()
    .map((entry) => `- ${entry.formatted}`)
    .join("\n");

export const doLogicalStepTool = new ToolImplementation(
  {
    definition: {
      name: doLogicalStepToolName,
      title: "Do a single logical step",
      description:
        // language=markdown
        `
Run one round of human-style logical deduction and write any newly deduced candidates/eliminations
into the grid's center marks (overwriting existing center marks).

Blind to free-text rules and cosmetic-only elements; may miss deductions \`${bruteForceSolveToolName}\` would find.

${reversibleActionNote}
        `.trim(),
    },
    timeout: singleStepTimeout + 1000,
  },
  z.object({}),
  async () => {
    const beforePuzzle = getPuzzle();
    const beforeLog = readSudokuMakerLogs();
    window.Api.triggerAction("doSingleLogicalStep");
    const message = await waitForSolver(singleStepTimeout);
    const afterPuzzle = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: appendedLogResultText(beforeLog),
        },
        {
          type: "text",
          text: diffCells(beforePuzzle, afterPuzzle, true),
        },
      ],
    };
  },
);

export const doAllLogicalStepsTool = new ToolImplementation(
  {
    definition: {
      name: doAllLogicalStepsToolName,
      title: "Solve step-by-step, logically",
      description:
        // language=markdown
        `
Repeatedly run human-style logical deduction until no further step is found, writing all deduced
candidates/eliminations into the grid's center marks (overwriting existing center marks).

Blind to free-text rules and cosmetic-only elements; may leave the puzzle unsolved even when
\`${bruteForceSolveToolName}\` would succeed.

${reversibleActionNote} - all steps taken in this call are undone/redone together as one action.
`.trim(),
    },
    timeout: solverMaxTimeout + 1000,
  },
  z.object({}),
  async () => {
    const beforePuzzle = getPuzzle();
    const beforeLog = readSudokuMakerLogs();
    window.Api.triggerAction("doAllLogicalSteps");
    const message = await waitForSolver(solverMaxTimeout);
    const afterPuzzle = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: appendedLogResultText(beforeLog),
        },
        {
          type: "text",
          text: diffCells(beforePuzzle, afterPuzzle, true),
        },
      ],
    };
  },
);

export const bruteForceSolveTool = new ToolImplementation(
  {
    definition: {
      name: bruteForceSolveToolName,
      title: "Find all possible solutions and valid candidates",
      description:
        // language=markdown
        `
Exhaustively search for every solution consistent with the current givens, entered values, and
marks; fills in digits if the solution is unique, and always writes the exact valid candidates into
center marks (overwriting existing center marks).

This is the only reliable way to know the puzzle's solution count and the exact valid candidates
for every cell - \`${doLogicalStepToolName}\`/\`${doAllLogicalStepsToolName}\` only deduce what a human-style pass finds and
may miss eliminations or leave the puzzle unsolved even when this tool would succeed.

Blind to free-text rules and cosmetic-only elements. Search is capped - a very high solution count
may be reported as "stopped counting" rather than an exact number.

${reversibleActionNote}
`.trim(),
    },
    timeout: solverMaxTimeout + 1000,
  },
  z.object({}),
  async () => {
    const beforePuzzle = getPuzzle();
    window.Api.triggerAction("findSolutions");
    const message = await waitForSolver(solverMaxTimeout);
    const afterPuzzle = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: replacedLogResultText(),
        },
        {
          type: "text",
          text: diffCells(beforePuzzle, afterPuzzle, true),
        },
      ],
    };
  },
);

export const checkValidityTool = new ToolImplementation(
  {
    definition: {
      name: checkValidityToolName,
      title: "Check whether the puzzle is broken or non-unique",
      description:
        // language=markdown
        `
Run the app's own existence-and-uniqueness check and report its verdict: whether the puzzle has a
solution at all, and if so, whether it's unique. Writes nothing to the grid - unlike
\`${bruteForceSolveToolName}\`, this is safe to run at any time without disturbing existing values or marks.

Already-entered cell values and center marks are treated as constraints, so a verdict is conditional
on them when present.

Blind to free-text rules and cosmetic-only elements.
        `.trim(),
    },
    timeout: solverMaxTimeout + 1000,
  },
  z.object({}),
  async () => {
    window.Api.triggerAction("checkValidity");
    const message = await waitForSolver(solverMaxTimeout);

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: replacedLogResultText(),
        },
      ],
    };
  },
);

export const waitForSolverTool = new ToolImplementation(
  {
    definition: {
      name: waitForSolverToolName,
      title: "Wait for the solver",
      description:
        // language=markdown
        `
Block until the currently running solver operation (\`${doLogicalStepToolName}\`, \`${doAllLogicalStepsToolName}\`,
\`${bruteForceSolveToolName}\`, or \`${checkValidityToolName}\`) finishes, then return its result.

Use this if a previous solver call's response indicated the solve was still in progress.
`.trim(),
    },
    timeout: solverMaxTimeout + 1000,
  },
  z.object({}),
  async () => {
    const message = window.Api.busy
      ? await waitForSolver(solverMaxTimeout)
      : "The solver is not running - there's nothing to wait for.";

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: replacedLogResultText(),
        },
      ],
    };
  },
);

export const stopSolverTool = new ToolImplementation(
  {
    definition: {
      name: stopSolverToolName,
      title: "Stop the solver",
      description:
        "Abort a currently running solver operation before it finishes on its own.",
    },
  },
  z.object({}),
  async () => {
    const wasBusy = window.Api.busy;
    if (wasBusy) {
      window.Api.triggerAction("stopSolver");
      // Wait for SudokuMaker to actually stop the solver and update the logs
      await waitForSolver(3000);
    }

    return {
      content: [
        {
          type: "text",
          text: wasBusy
            ? "The solver has been stopped."
            : "The solver is not running - there's nothing to stop.",
        },
        {
          type: "text",
          text: replacedLogResultText(),
        },
      ],
    };
  },
);
