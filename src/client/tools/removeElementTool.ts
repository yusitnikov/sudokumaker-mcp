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
      description: "Remove element from the puzzle by ID",
    },
  },
  z.object({
    elementId: z.number().int().describe("Element ID to delete"),
    elementName: z
      .string()
      .optional()
      .describe(
        "The name of the element that's going to be deleted - use this parameter to make the LLM user understand which element is going to be removed when looking at the MCP tool call parameters",
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
