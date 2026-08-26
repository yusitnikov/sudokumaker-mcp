import { ToolImplementation } from "./ToolImplementation";
import { reversibleActionNote } from "./descriptionSnippets";
import { z } from "zod";
import { clearGridToolName } from "./toolNames";
import { getPuzzle } from "../utils";
import { resolveHandle } from "../format/resolveHandle";
import { puzzleNode } from "../format/puzzle/puzzle";

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
    const before = getPuzzle();
    window.Api.triggerAction("clearGrid");
    const after = getPuzzle();

    // TODO: shorter representation for fully clearing the grid with no givens left

    return {
      content: [
        {
          type: "text",
          text: [
            `Cleared the grid in puzzle "${after.name || "(untitled)"}".`,
            "This is what changed in the cells:",
            resolveHandle(puzzleNode(before), "cells").diff(
              resolveHandle(puzzleNode(after), "cells"),
            ),
          ].join("\n"),
        },
      ],
    };
  },
);
