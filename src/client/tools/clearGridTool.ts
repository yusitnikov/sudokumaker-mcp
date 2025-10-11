import { ToolImplementation } from "./ToolImplementation";
import { reversibleActionNote } from "./undoRedoTools";
import { z } from "zod";

export const clearGridTool = new ToolImplementation(
  {
    definition: {
      name: "clear_grid",
      title: "Clear the grid",
      description: `Clear all (non-given) digits and markings in the puzzle grid cells. ${reversibleActionNote}`,
    },
  },
  z.object({}),
  () => {
    window.Api.triggerAction("clearGrid");

    return {
      content: [
        {
          type: "text",
          text: "Done.",
        },
      ],
    };
  },
);
