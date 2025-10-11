import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { SmartDiscriminatedUnion } from "../../SmartDiscriminatedUnion";
import { AllElements } from "../../SudokuMakerElement";
import {
  ClueCellsGroupFilter,
  getElementFinalName,
  updateCluesByCellGroups,
} from "./elementUtils";
import { mergeDeepUpdates, ZodDeepPartial } from "../../DeepPartial";

export const updateCluesTool = new ToolImplementation(
  {
    definition: {
      name: "update_clues",
      title: "Update Sudoku Maker clues",
      description:
        "Update properties of one or more clues of an existing element in the puzzle",
    },
  },
  z.object({
    elementId: z.number().int().describe("Element ID to update"),
    operationDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable summary of what this operation does. " +
          "This helps the non-technical user understand the action they're approving.",
      ),
    updates: SmartDiscriminatedUnion(
      "type",
      AllElements.filter(({ clue }) => clue).map((element) =>
        z.object({
          type: z.literal(element.typeName),
          updateGroups: z.array(
            z.object({
              clueCells: ClueCellsGroupFilter,
              updates: ZodDeepPartial(element.clue!.schema),
            }),
          ),
        }),
      ),
    ).describe(
      "Updates to apply to the clues: " +
        "type - target element type name (should match the actual type or the operation will fail), " +
        "updates - parameters to update for every matching clue",
    ),
  }),
  ({ elementId, updates: { type, updateGroups }, operationDescription }) => {
    const { allMatchingIndexes, updatedElement, updatedClues, messages } =
      updateCluesByCellGroups(
        elementId,
        type,
        updateGroups.map(({ clueCells }) => clueCells),
        (clues, matchingIndexGroups) => {
          for (const [
            updateGroupIndex,
            { updates },
          ] of updateGroups.entries()) {
            for (const clueIndex of matchingIndexGroups[updateGroupIndex]) {
              clues[clueIndex] = mergeDeepUpdates(clues[clueIndex], updates);
            }
          }
        },
        (targetElement) =>
          operationDescription ||
          `Update "${getElementFinalName(targetElement)}" clues`,
      );

    const affectedClues = updatedClues.filter((_, index) =>
      allMatchingIndexes.has(index),
    );

    return {
      content: [
        {
          type: "text",
          text: `Updated ${allMatchingIndexes.size} clues of "${getElementFinalName(updatedElement)}".`,
        },
        ...messages,
        {
          type: "text",
          text: `Here are the affected clues after the update: ${JSON.stringify(affectedClues, null, 2)}`,
        },
      ],
    };
  },
);
