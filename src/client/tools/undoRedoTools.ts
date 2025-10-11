import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getPuzzle } from "../utils";
import { diffCells } from "./diff";

// TODO: tell which action was undone, API to get the undo/redo history, tell what have changed afterwards
export const undoTool = new ToolImplementation(
  {
    definition: {
      name: "undo",
      title: "Undo the last action in the puzzle",
      description: "Undo the last action in the puzzle",
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
          text: diffCells(before, after, true),
        },
      ],
    };
  },
);

export const redoTool = new ToolImplementation(
  {
    definition: {
      name: "redo",
      title: "Redo the last action in the puzzle",
      description: "Redo the last action in the puzzle",
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
          text: diffCells(before, after, true),
        },
      ],
    };
  },
);

export const reversibleActionNote = `Note: this action could be undone and redone by calling "${undoTool.name}" and "${redoTool.name}" tools, similar to any other action in the puzzle`;
