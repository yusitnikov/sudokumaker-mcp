import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { AllElements } from "../../SudokuMakerElement";
import {
  ClueCellsGroupFilter,
  getElementFinalName,
  updateCluesByCellGroups,
} from "./elementUtils";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const removeCluesTool = new ToolImplementation(
  {
    definition: {
      name: "remove_clues",
      title: "Remove Sudoku Maker clues",
      description:
        "Remove one or more clues of an existing element in the puzzle",
    },
  },
  z.object({
    elementId: z.number().int().describe("Element ID to remove the clues from"),
    operationDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable summary of what this operation does. " +
          "This helps the non-technical user understand the action they're approving.",
      ),
    elementType: z
      .enum(
        AllElements.filter(({ clue }) => clue).map(({ typeName }) => typeName),
      )
      .describe(
        "The type of the target element. The operation will fail if they don't match.",
      ),
    clueCellGroups: z
      .array(ClueCellsGroupFilter)
      .describe(
        "Groups of cells that indicate which clues to remove. Each group triggers a separate removal.",
      ),
  }),
  ({
    elementId,
    elementType: type,
    clueCellGroups,
    operationDescription,
  }): CallToolResult => {
    const { allMatchingIndexes, updatedElement, updatedClues, messages } =
      updateCluesByCellGroups(
        elementId,
        type,
        clueCellGroups,
        (clues, _, allMatchingIndexes) =>
          clues.filter((_value, index) => !allMatchingIndexes.has(index)),
        (targetElement, affectedCluesCount) =>
          operationDescription ||
          `Remove ${affectedCluesCount} clues of "${getElementFinalName(targetElement)}"`,
      );

    return {
      content: [
        {
          type: "text",
          text: `Removed ${allMatchingIndexes.size} clues of "${getElementFinalName(updatedElement)}", there are ${updatedClues.length} clues in total now.`,
        },
        ...messages,
      ],
    };
  },
);
