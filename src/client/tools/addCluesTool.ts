import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getElementFinalName, getElementWithClueById } from "./elementUtils";
import { getPuzzle, updatePuzzle } from "../utils";
import { operationDescriptionParam } from "./descriptionSnippets";

export const addCluesTool = new ToolImplementation(
  {
    definition: {
      name: "add_clues",
      title: "Add Sudoku Maker clues",
      description:
        // language=markdown
        `
Append one or more clues to an existing multi-clue element (e.g. add thermometers to a Thermometer
element, or arrows to an Arrows element). The clues are pushed onto the end of the element's clue
list; use \`update_clues\`/\`remove_clues\` to change or delete existing ones.
`.trim(),
    },
  },
  z.object({
    elementId: z.number().int().describe(
      // language=markdown
      `ID of the target element (the multi-clue element to add clues to), as returned by \`get_puzzle\`/\`add_element\`.`,
    ),
    operationDescription: operationDescriptionParam,
    clues: z.array(z.unknown()).describe(
      // language=markdown
      `
Array of new clues to append to the element's clue list, one array entry per new clue; docs topic
\`element:<TypeName>\`'s \`## Clues\` section (substitute the target element's exact type name, e.g.
\`element:Thermometer\`) shows the exact clue JSON schema.

Example (for a Thermometer element): \`[[{"row": 1, "column": 1}, {"row": 1, "column": 2}, {"row": 1, "column": 3}]]\`.
`.trim(),
    ),
  }),
  ({ elementId, operationDescription, clues: rawClues }) => {
    const { index, targetElement, clueType } = getElementWithClueById(elementId);

    // Manually parse the type-specific data after knowing the type schema.
    // Intentionally mimic the original tool schema, to get the same field paths in the error messages.
    const { clues } = z
      .object({ clues: z.array(clueType.schema) })
      .parse({ clues: rawClues });

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
