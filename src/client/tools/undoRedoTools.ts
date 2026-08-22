import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getPuzzle } from "../utils";
import { renderDiff } from "../format/renderDiff";
import { redoToolName, undoToolName } from "./toolNames";
import { puzzleNode } from "../format/puzzle/puzzle";

// TODO: tell which action was undone, API to get the undo/redo history, tell what have changed afterwards
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
  () => {
    const before = getPuzzle();
    window.Api.triggerAction("undo");
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: "Done.",
        },
        {
          type: "text",
          text: renderDiff(puzzleNode(before), puzzleNode(after)),
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
  () => {
    const before = getPuzzle();
    window.Api.triggerAction("redo");
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: "Done.",
        },
        {
          type: "text",
          text: renderDiff(puzzleNode(before), puzzleNode(after)),
        },
      ],
    };
  },
);
