import { ToolImplementation } from "./ToolImplementation";
import { reversibleActionNote } from "./descriptionSnippets";
import { z } from "zod";
import { clearGridToolName } from "./toolNames";
import { cellsDiffSummary } from "../format/puzzle/diffSummary";
import { TabState } from "../tabState";

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
  async function () {
    this.checkPrevTabState();

    window.Api.triggerAction("clearGrid");

    const tabState = await TabState.waitAndRead();

    // TODO: shorter representation for fully clearing the grid with no givens left

    return {
      content: [
        {
          type: "text",
          text: [
            `Cleared the grid in puzzle "${tabState.puzzle.name || "(untitled)"}".`,
            cellsDiffSummary(tabState),
          ].join("\n"),
        },
      ],
    };
  },
);
