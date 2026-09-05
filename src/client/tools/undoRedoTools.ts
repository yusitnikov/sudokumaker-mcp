import { CallbackToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { redoToolName, undoToolName } from "./toolNames";
import { puzzleDiffSummary } from "../format/puzzle/diffSummary";
import { TabState, TabStateChangedError } from "../tabState";

export const undoTool = new CallbackToolImplementation(
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
  async function () {
    let tabState = this.checkPrevTabState();
    // checkPrevTabState() checks only for puzzle changes.
    // We want to reject ANY change
    if (tabState.changed) {
      throw new TabStateChangedError(tabState);
    }

    // Read before triggering: the tooltip names the action about to be undone, not the one just undone.
    const label = tabState.undoLabel;
    if (label === undefined) {
      return {
        content: [{ type: "text", text: "Nothing to undo - there is no prior action." }],
      };
    }

    window.Api.triggerAction("undo");

    tabState = await TabState.waitAndRead();
    const nextLabel = tabState.undoLabel;

    return {
      content: [
        {
          type: "text",
          text: [
            `Reverted "${label}" in puzzle "${tabState.puzzle.name || "(untitled)"}". If it's not the action that you expected to undo, REDO IT IMMEDIATELY!`,
            "",
            puzzleDiffSummary(tabState, "This is what the revert changed:"),
            "",
            nextLabel
              ? `Undoing again would revert "${nextLabel}".`
              : "This was the oldest action - nothing earlier to undo.",
          ].join("\n"),
        },
      ],
    };
  },
);

export const redoTool = new CallbackToolImplementation(
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
  async function () {
    let tabState = this.checkPrevTabState();
    // checkPrevTabState() checks only for puzzle changes.
    // We want to reject ANY change
    if (tabState.changed) {
      throw new TabStateChangedError(tabState);
    }

    const label = tabState.redoLabel;
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

    window.Api.triggerAction("redo");

    tabState = await TabState.waitAndRead();
    const nextLabel = tabState.redoLabel;

    return {
      content: [
        {
          type: "text",
          text: [
            `Reapplied "${label}" in puzzle "${tabState.puzzle.name || "(untitled)"}". If it's not the action that you expected to redo, UNDO IT IMMEDIATELY!`,
            "",
            puzzleDiffSummary(tabState, "This is what the redo changed:"),
            "",
            nextLabel
              ? `Redoing again would reapply "${nextLabel}".`
              : "This was the most recent action - nothing newer to redo.",
          ].join("\n"),
        },
      ],
    };
  },
);
