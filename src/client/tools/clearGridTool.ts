import { ToolImplementation } from "./ToolImplementation";
import { reversibleActionNote } from "./descriptionSnippets";
import { z } from "zod";
import { clearGridToolName } from "./toolNames";

export const clearGridTool = new ToolImplementation(
  {
    definition: {
      name: clearGridToolName,
      title: "Clear the grid",
      description:
        // language=markdown
        `
Clear all non-given digits and markings (values, candidates, corner marks, colors) from every grid
cell, leaving given digits untouched.

${reversibleActionNote}
        `.trim(),
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
