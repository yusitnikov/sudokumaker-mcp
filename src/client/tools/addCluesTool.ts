import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { SmartDiscriminatedUnion } from "../../SmartDiscriminatedUnion";
import { AllElements, getElementByTypeName } from "../../SudokuMakerElement";
import { getElementById, getElementFinalName } from "./elementUtils";
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
    insert: SmartDiscriminatedUnion(
      "type",
      AllElements.filter(({ clue }) => clue).map((element) =>
        z.object({
          type: z
            .literal(element.typeName)
            .describe(
              // language=markdown
              `The type of the target element. The operation will fail if they don't match.`,
            ),
          clues: z.array(element.clue!.schema).describe("Clues to add"),
        }),
      ),
    ).describe(
      // language=markdown
      `
The new clues to add and which element to add them to, as an object shaped like
\`{"type": string, "clues": array}\`.

- **\`type\`** (required): the target element's exact type name as a string (must match its actual
  type, e.g. \`"Thermometer"\`, or the operation fails) - read it off the \`type\` shown for that
  element in \`get_puzzle\`'s output.
- **\`clues\`** (required): array of new clues to append to the element's clue list, one array entry
  per new clue; docs topic \`element:<TypeName>\`'s \`## Clues\` section (substitute the type name,
  e.g. \`element:Thermometer\`) shows the exact clue JSON schema.

Example: \`{"type": "Thermometer", "clues": [[{"row": 1, "column": 1}, {"row": 1, "column": 2}, {"row": 1, "column": 3}]]}\`.
`.trim(),
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
