import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getPuzzle } from "../utils";
import { redoToolName, undoToolName } from "./toolNames";
import { puzzleNode } from "../format/puzzle/puzzle";
import { readPendingActionLabel } from "../../SudokuMakerUndoRedo";

export const undoTool = new ToolImplementation(
  {
    definition: {
      name: undoToolName,
      title: "Undo the last action in the puzzle",
      description:
        // language=markdown
        `Revert the last action taken in the puzzle - whether it was made by this MCP server or by the user directly in the app's UI.`,
    },
  },
  z.object({}),
  async () => {
    // Read before triggering: the tooltip names the action about to be undone, not the one just undone.
    const label = readPendingActionLabel("undo");
    if (label === undefined) {
      return {
        content: [
          { type: "text", text: "Nothing to undo - there is no prior action." },
        ],
      };
    }

    const before = getPuzzle();
    window.Api.triggerAction("undo");
    const after = getPuzzle();

    await waitForFrontendUpdate();
    const nextLabel = readPendingActionLabel("undo");

    return {
      content: [
        {
          type: "text",
          text: [
            `Reverted "${label}" in puzzle "${after.name || "(untitled)"}". If it's not the action that you expected to undo, REDO IT IMMEDIATELY!`,
            puzzleNode(before).diff(puzzleNode(after)),
            nextLabel
              ? `Undoing again would revert "${nextLabel}".`
              : "This was the oldest action - nothing earlier to undo.",
          ].join("\n\n"),
        },
      ],
    };
  },
);

export const redoTool = new ToolImplementation(
  {
    definition: {
      name: redoToolName,
      title: "Redo the last action in the puzzle",
      description:
        // language=markdown
        `Re-apply the last action that was undone (via \`${undoToolName}\` or directly in the app's UI).`,
    },
  },
  z.object({}),
  async () => {
    const label = readPendingActionLabel("redo");
    if (label === undefined) {
      return {
        content: [
          {
            type: "text",
            text: "Nothing to redo - there is no undone action.",
          },
        ],
      };
    }

    const before = getPuzzle();
    window.Api.triggerAction("redo");
    const after = getPuzzle();

    await waitForFrontendUpdate();
    const nextLabel = readPendingActionLabel("redo");

    return {
      content: [
        {
          type: "text",
          text: [
            `Reapplied "${label}" in puzzle "${after.name || "(untitled)"}". If it's not the action that you expected to redo, UNDO IT IMMEDIATELY!`,
            puzzleNode(before).diff(puzzleNode(after)),
            nextLabel
              ? `Redoing again would reapply "${nextLabel}".`
              : "This was the most recent action - nothing newer to redo.",
          ].join("\n\n"),
        },
      ],
    };
  },
);

const waitForFrontendUpdate = () =>
  new Promise((resolve) => setTimeout(resolve, 200));
