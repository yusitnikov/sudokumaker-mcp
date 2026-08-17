import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import {
  ClueCellsGroupFilter,
  getElementFinalName,
  updateCluesByCellGroups,
} from "./elementUtils";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { operationDescriptionParam } from "./descriptionSnippets";
import { ArrowElement, ThermometerElement } from "../../SudokuMakerElement";
import {
  addElementToolName,
  getPuzzleToolName,
  removeCluesToolName,
} from "./toolNames";

export const removeCluesTool = new ToolImplementation(
  {
    definition: {
      name: removeCluesToolName,
      title: "Remove Sudoku Maker clues",
      description:
        // language=markdown
        `
Delete one or more existing clues of a multi-clue element (e.g. remove a \`${ThermometerElement.typeName}\`,
delete an \`${ArrowElement.typeName}\`).

The response lists which clues were matched and removed - **undo immediately** if a match wasn't
the clue you intended.
`.trim(),
    },
  },
  z.object({
    elementId: z.number().int().describe(
      // language=markdown
      `ID of the target element (the multi-clue element to remove clues from), as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.`,
    ),
    operationDescription: operationDescriptionParam,
    clueCellGroups: z.array(ClueCellsGroupFilter).describe(
      // language=markdown
      `
Array of cell groups - a clue is deleted if **all** cells of a group are among the cells it affects
(pass enough cells to identify one clue uniquely, or fewer to target several clues at once).
Each group in this array independently selects clues to remove.
`.trim(),
    ),
  }),
  ({ elementId, clueCellGroups, operationDescription }): CallToolResult => {
    const { allMatchingIndexes, updatedElement, updatedClues, messages } =
      updateCluesByCellGroups(
        elementId,
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
