import { ToolImplementation } from "./ToolImplementation";
import { reversibleActionNote } from "./descriptionSnippets";
import { z } from "zod";
import { getPuzzle, waitForSolver } from "../utils";
import { diffCells } from "./diff";
import {
  bruteForceSolveToolName,
  doAllLogicalStepsToolName,
  doLogicalStepToolName,
  stopSolverToolName,
  waitForSolverToolName,
} from "./toolNames";

const singleStepTimeout = 5000;
const solverMaxTimeout = 30000;

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
    const before = getPuzzle();
    window.Api.triggerAction("doSingleLogicalStep");
    const { message } = await waitForSolver(singleStepTimeout);
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: diffCells(before, after, true),
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
    const before = getPuzzle();
    window.Api.triggerAction("doAllLogicalSteps");
    const { message } = await waitForSolver(solverMaxTimeout);
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: diffCells(before, after, true),
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
    const before = getPuzzle();
    window.Api.triggerAction("findSolutions");
    const { message } = await waitForSolver(solverMaxTimeout);
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: diffCells(before, after, true),
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
or \`${bruteForceSolveToolName}\`) finishes, then return its result message.

Use this if a previous solver call's response indicated the solve was still in progress.
`.trim(),
    },
    timeout: solverMaxTimeout + 1000,
  },
  z.object({}),
  async () => {
    const { message } = await waitForSolver(solverMaxTimeout);

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        // TODO: describe the changes
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
  () => {
    window.Api.triggerAction("stopSolver");

    return {
      content: [
        {
          type: "text",
          text: "The solver has been stopped.",
        },
      ],
    };
  },
);
