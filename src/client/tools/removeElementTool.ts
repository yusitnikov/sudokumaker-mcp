import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import {
  getElementById,
  getElementFinalName,
  getElementSummary,
} from "./elementUtils";
import { getPuzzle, updatePuzzle } from "../utils";

export const removeElementTool = new ToolImplementation(
  {
    definition: {
      name: "remove_element",
      title: "Remove Sudoku Maker element",
      description:
        // language=markdown
        `Delete an entire element (and all of its clues, if any) from the puzzle by ID.`,
    },
  },
  z.object({
    elementId: z.number().int().describe(
      // language=markdown
      `ID of the element to remove, as returned by \`get_puzzle\`/\`add_element\`.`,
    ),
    elementName: z.string().optional().describe(
      // language=markdown
      `The element's display name - set it so the user sees which element they're deleting when reviewing this call, not just a bare ID.`,
    ),
  }),
  ({ elementId }) => {
    const { index, targetElement } = getElementById(elementId);

    updatePuzzle(
      (puzzle) => {
        puzzle.allElements.splice(index, 1);
      },
      (_from, to) => {
        to.allConstraints.splice(index, 1);
      },
      `Remove ${getElementFinalName(targetElement)}`,
    );

    const remainingElements = getPuzzle().allElements;

    return {
      content: [
        {
          type: "text",
          text: `Element "${getElementFinalName(targetElement)}" of type "${targetElement.config.type}" removed from position ${index + 1}.`,
        },
        {
          type: "text",
          text: `The remaining elements: ${remainingElements.map(getElementSummary).join(", ") || "none"}.`,
        },
        {
          type: "text",
          text: `The full spec of the removed element (verify that it's the element that you wanted to delete!): ${JSON.stringify(targetElement, null, 2)}`,
        },
      ],
    };
  },
);
