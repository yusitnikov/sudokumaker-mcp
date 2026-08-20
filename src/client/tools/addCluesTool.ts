import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { jsonValue } from "../../jsonValue";
import { getElementFinalName, getElementWithClueById } from "./elementUtils";
import { getPuzzle, updatePuzzle } from "../utils";
import { operationDescriptionParam } from "./descriptionSnippets";
import { ArrowElement, ThermometerElement } from "../../SudokuMakerElement";
import {
  addCluesToolName,
  addElementToolName,
  getPuzzleToolName,
  removeCluesToolName,
  updateCluesToolName,
} from "./toolNames";
import { elementTopicPattern, elementTopicPrefix } from "./docs/topicNames";

export const addCluesTool = new ToolImplementation(
  {
    definition: {
      name: addCluesToolName,
      title: "Add Sudoku Maker clues",
      description:
        // language=markdown
        `
Append one or more clues to an existing multi-clue element (e.g. add thermometers to a
\`${ThermometerElement.typeName}\` element, or arrows to an \`${ArrowElement.typeName}\` element). The
clues are pushed onto the end of the element's clue list; use
\`${updateCluesToolName}\`/\`${removeCluesToolName}\` to change or delete existing ones.
`.trim(),
    },
  },
  z.object({
    elementId: z.number().int().describe(
      // language=markdown
      `ID of the target element (the multi-clue element to add clues to), as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.`,
    ),
    operationDescription: operationDescriptionParam,
    clues: z.array(jsonValue).describe(
      // language=markdown
      `
Array of new clues to append to the element's clue list, one array entry per new clue; docs topic
\`${elementTopicPattern}\` (substitute the target element's exact type name, e.g.
\`${elementTopicPrefix}${ThermometerElement.typeName}\`)'s \`## Clues\` section shows the exact clue JSON schema.

Example (for a \`${ThermometerElement.typeName}\` element): \`[["r1c1", "r1c2", "r1c3"]]\`.
`.trim(),
    ),
  }),
  ({ elementId, operationDescription, clues }) => {
    const { index, targetElement, clueType } =
      getElementWithClueById(elementId);

    // Manually parse the type-specific data after knowing the type schema,
    // only to validate the input and report the errors.
    // Intentionally mimic the original tool schema, to get the same field paths in the error messages.
    z.object({ clues: z.array(clueType.schema) }).parse({ clues });

    const cluesKey = clueType.key;

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
