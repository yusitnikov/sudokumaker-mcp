import { CallbackToolImplementation } from "./ToolImplementation";
import { reversibleActionNote } from "./descriptionSnippets";
import { z } from "zod";
import {
  bruteForceSolveToolName,
  checkValidityToolName,
  doAllLogicalStepsToolName,
  docsToolName,
  doLogicalStepToolName,
  getLogsToolName,
  stopSolverToolName,
  undoToolName,
  waitForSolverToolName,
} from "./toolNames";
import { cellsDiffSummary } from "../format/puzzle/diffSummary";
import type { PuzzlePublic } from "../../SudokuMakerPuzzleSchema";
import { getElementFinalName } from "./elementUtils";
import { solvingTopicName } from "./docs/topicNames";
import { TabState } from "../tabState";
import { RootObjectNode } from "../format/ObjectNode";
import { solverLogsDescriptor } from "../format/tabState/solverLogs";
import { ElementType } from "../../elements/ElementType";
import type { ElementPublic } from "../../elements/types";
import { getElementByTypeName } from "../../elements/AllElements";

const singleStepTimeout = 5000;
const solverMaxTimeout = 30000;

/** The text block for an append-style tool's response: the log entries this call itself appended, oldest first. */
const appendedLogResultText = ({ solverLogsChanged, solverLogs, previousSolverLogs }: TabState) =>
  solverLogsChanged
    ? "Solver logs changed:\n" +
      new RootObjectNode(
        previousSolverLogs!.filter((item) => !item.outOfDate),
        solverLogsDescriptor,
      ).diff(new RootObjectNode(solverLogs, solverLogsDescriptor))
    : `No new solver log entries - this run didn't add or change anything (e.g. a no-op on an already-solved grid). Use \`${getLogsToolName}\` to see the full log if needed.`;

/**
 * A solver/check response: status line, log,
 * the grid diff when the tool writes (`puzzleBefore` given),
 * and the closing notes once the run has finished.
 *
 * An unfinished run keeps the diff, labelled as progress - the cells really do hold those values.
 * It drops the closing notes: they all speak about an outcome that doesn't exist yet.
 */
const solverResultText = ({ finished, message, tabState }: SolverWaitResult, logText: string) => {
  const { previousPuzzle: puzzleBefore, puzzle: puzzleAfter } = tabState;

  return [
    `Puzzle "${puzzleAfter.name || "(untitled)"}" - ${message}`,
    "",
    logText,
    "",
    ...(puzzleBefore
      ? [
          cellsDiffSummary(
            tabState,
            finished
              ? undefined
              : "This is what the solver has written into the cells so far - it's still running, so this isn't the final state:",
          ),
          "",
        ]
      : []),
    ...(finished
      ? [
          solverBlindSpotWarning(puzzleAfter),
          puzzleBefore &&
            `This run replaced the center marks in the affected cells, including any the user had entered by hand. If the run was diagnostic (done only to get a verdict, not because the user asked for the deduced marks), call \`${undoToolName}\` to put the previous marks back.`,
          solvingTopicNote,
        ]
      : []),
  ]
    .filter((line) => typeof line === "string")
    .join("\n");
};

/** The text block for a replace-style tool's response: the full current log, which this call itself just replaced. */
const replacedLogResultText = ({ solverLogs }: TabState) =>
  `Solver logs: ${new RootObjectNode(solverLogs, solverLogsDescriptor).format()}`;

export const doLogicalStepTool = new CallbackToolImplementation(
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
  async function () {
    this.checkPrevTabState();

    window.Api.triggerAction("doSingleLogicalStep");
    const result = await waitForSolver(singleStepTimeout);

    return {
      content: [
        {
          type: "text",
          text: solverResultText(result, appendedLogResultText(result.tabState)),
        },
      ],
    };
  },
);

export const doAllLogicalStepsTool = new CallbackToolImplementation(
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
  async function () {
    this.checkPrevTabState();

    window.Api.triggerAction("doAllLogicalSteps");
    const result = await waitForSolver(solverMaxTimeout);

    return {
      content: [
        {
          type: "text",
          text: solverResultText(result, appendedLogResultText(result.tabState)),
        },
      ],
    };
  },
);

export const bruteForceSolveTool = new CallbackToolImplementation(
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
  async function () {
    this.checkPrevTabState();

    window.Api.triggerAction("findSolutions");
    const result = await waitForSolver(solverMaxTimeout);

    return {
      content: [
        {
          type: "text",
          text: solverResultText(result, replacedLogResultText(result.tabState)),
        },
      ],
    };
  },
);

export const checkValidityTool = new CallbackToolImplementation(
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
  async function () {
    this.checkPrevTabState(true);

    window.Api.triggerAction("checkValidity");
    const result = await waitForSolver(solverMaxTimeout);

    return {
      content: [
        {
          type: "text",
          text: solverResultText(result, replacedLogResultText(result.tabState)),
        },
      ],
    };
  },
);

export const waitForSolverTool = new CallbackToolImplementation(
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
    const result = await waitForSolver(solverMaxTimeout);

    return {
      content: [
        {
          type: "text",
          /*
           * Whether the run being waited on writes to the grid isn't knowable here.
           * Assume it does, since the three writing tools are the common case.
           */
          text: solverResultText(result, replacedLogResultText(result.tabState)),
        },
      ],
    };
  },
);

export const stopSolverTool = new CallbackToolImplementation(
  {
    definition: {
      name: stopSolverToolName,
      title: "Stop the solver",
      description: "Abort a currently running solver operation before it finishes on its own.",
    },
  },
  z.object({}),
  async () => {
    if (window.Api.busy) {
      window.Api.triggerAction("stopSolver");
    }
    // Wait for SudokuMaker to actually stop the solver and update the logs
    const { tabState } = await waitForSolver(3000);

    return {
      content: [
        {
          type: "text",
          text: [
            "The solver has been stopped.",
            "",
            replacedLogResultText(tabState),
            // TODO: show updated grid
            "",
            /*
             * How far the run got before stopping isn't knowable, hence "may have"
             * rather than the finished-run note's flat assertion.
             * No blind-spot warning: an aborted run has no verdict to qualify.
             */
            ...(tabState.puzzleChanged
              ? [
                  // TODO: WTF is this message?
                  `The stopped run may have already replaced center marks in some cells - \`${undoToolName}\` reverts it if so.`,
                ]
              : []),
            solvingTopicNote,
          ].join("\n"),
        },
      ],
    };
  },
);

interface SolverWaitResult {
  /** False when the wait ran out while the solver was still running. */
  finished: boolean;
  /** The solver's state, worded for the response to print verbatim. */
  message: string;
  /** Tab state captured after waiting for the solver results */
  tabState: TabState;
}

/** Waits for the solver to go idle, up to `timeout` milliseconds. */
const waitForSolver = async (timeout: number): Promise<SolverWaitResult> => {
  const step = 200;
  for (let time = 0; time < timeout && window.Api.busy; time += step) {
    await new Promise((resolve) => setTimeout(resolve, step));
  }

  const finished = !window.Api.busy;

  return {
    finished,
    message: finished
      ? "The solver finished running."
      : `The solver is still running after ${timeout / 1000} seconds. Call \`${waitForSolverToolName}\` to wait for the outcome (repeat it while it keeps saying the solver is still running), or \`${stopSolverToolName}\` to abort the run.`,
    tabState: await TabState.waitAndRead(),
  };
};

/** The reason the solver can't see a given element, or `undefined` when it can. */
const solverBlindSpotReason = (element: ElementPublic): string | undefined => {
  if (
    [ElementType.CosmeticLine, ElementType.CosmeticCage, ElementType.CosmeticSymbol].includes(
      getElementByTypeName(element.config.type).typeId,
    )
  ) {
    return "cosmetic";
  }
  if (!element.enabled) {
    return "disabled";
  }
  if (element.solverIgnored) {
    return "solver-ignored";
  }
  return undefined;
};

/**
 * A warning naming the elements the solver couldn't take into account,
 * or `undefined` when it saw all of them.
 * The verdict itself never mentions them - the app reports only on what it did see.
 */
const solverBlindSpotWarning = (puzzle: PuzzlePublic): string | undefined => {
  const ignored = puzzle.allElements.flatMap((element) => {
    const reason = solverBlindSpotReason(element);
    return reason ? [`"${getElementFinalName(element)}" (${reason})`] : [];
  });

  if (ignored.length === 0) {
    return undefined;
  }

  return `The solver skipped ${ignored.length} ${ignored.length === 1 ? "element" : "elements"}: ${ignored.join(", ")} - whatever they contribute to the puzzle is not covered by this result.`;
};

/** Constant pointer closing every solver and check response, so the topic that explains them is always one fetch away. */
const solvingTopicNote = `How to read and act on this result: \`${solvingTopicName}\` topic of the \`${docsToolName}\` tool.`;
