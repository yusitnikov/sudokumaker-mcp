import { ToolImplementation } from "./ToolImplementation";
import { reversibleActionNote } from "./undoRedoTools";
import { z } from "zod";
import { getPuzzle, waitForSolver } from "../utils";
import { diffCells } from "./diff";

const singleStepTimeout = 5000;
const solverMaxTimeout = 30000;

export const doLogicalStepTool = new ToolImplementation(
  {
    definition: {
      name: "logical_step",
      title: "Do a single logical step",
      description: `Do a single logical step in the puzzle and wait for its results. ${reversibleActionNote}`,
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
      name: "all_logical_steps",
      title: "Solve step-by-step, logically",
      description: `Do all possible logical steps in the puzzle. ${reversibleActionNote} (all logical steps will be undone/redone at once)`,
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
      name: "brute_force_solve",
      title: "Find all possible solutions and valid candidates",
      description: `
        Run the brute force solver for the puzzle - find all possible solutions and valid candidates.
        This is the only reliable way to know solutions count to the puzzle and the exact list of valid candidates for every cell
        (unless the puzzle is already known to be broken or solved with 1 unique solution).
        ${reversibleActionNote}
      `,
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
      name: "wait_for_solver",
      title: "Wait for the solver",
      description: "Wait for the solver in the given tab to finish running",
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
      name: "stop_solver",
      title: "Stop the solver",
      description: "Stop the solver in the given tab if it's still running",
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
