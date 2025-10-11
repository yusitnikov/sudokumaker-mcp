import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { SmartDiscriminatedUnion } from "../../SmartDiscriminatedUnion";
import { AllElements, getElementByTypeName } from "../../SudokuMakerElement";
import { getElementById, getElementFinalName } from "./elementUtils";
import { getPuzzle, updatePuzzle } from "../utils";

export const addCluesTool = new ToolImplementation(
  {
    definition: {
      name: "add_clues",
      title: "Add Sudoku Maker clues",
      description: "Add one or more clues to an existing element in the puzzle",
    },
  },
  z.object({
    elementId: z.number().int().describe("Element ID to insert the clues to"),
    operationDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable summary of what this operation does. " +
          "This helps the non-technical user understand the action they're approving.",
      ),
    insert: SmartDiscriminatedUnion(
      "type",
      AllElements.filter(({ clue }) => clue).map((element) =>
        z.object({
          type: z
            .literal(element.typeName)
            .describe(
              "The type of the target element. The operation will fail if they don't match.",
            ),
          clues: z.array(element.clue!.schema).describe("Clues to add"),
        }),
      ),
    ),
  }),
  ({ elementId, operationDescription, insert: { type, clues } }) => {
    const { index, targetElement } = getElementById(elementId, type);

    const elementType = getElementByTypeName(type);
    const cluesKey = elementType.clue!.key;

    updatePuzzle(
      (puzzle) => {
        (puzzle.allElements[index].config as any)[cluesKey].push(...clues);
      },
      (from, to) => {
        (to.allConstraints[index].config as any)[cluesKey] = (
          from.allConstraints[index].config as any
        )[cluesKey];
      },
      operationDescription ||
        `Add ${clues.length} clues of "${getElementFinalName(targetElement)}"`,
    );

    const updatedElement = getPuzzle().allElements[index];

    return {
      content: [
        {
          type: "text",
          text: `Added ${clues.length} clues of "${getElementFinalName(targetElement)}", there are ${(updatedElement.config as any)[cluesKey].length} clues in total now.`,
        },
      ],
    };
  },
);
