import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { jsonValue } from "../../jsonValue";
import { getElementFinalName, getElementWithClueById, parseElementSpecificData } from "./elementUtils";
import { elementIdNote, operationDescriptionParam } from "./descriptionSnippets";
import {
  addCluesToolName,
  addElementToolName,
  getPuzzleToolName,
  removeCluesToolName,
  updateCluesToolName,
} from "./toolNames";
import { elementTopicPattern, elementTopicPrefix } from "./docs/topicNames";
import { elementsDiffSummary } from "../format/puzzle/diffSummary";
import { ThermometerElement } from "../../elements/lineElements";
import { ArrowElement } from "../../elements/miscElements";

export const addCluesTool = new ToolImplementation(
  {
    definition: {
      name: addCluesToolName,
      title: "Add SudokuMaker clues",
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
    elementId: z
      .number()
      .int()
      .describe(
        // language=markdown
        `
ID of the target element (the multi-clue element to add clues to), as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.
${elementIdNote}
        `.trim(),
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
  async function ({ elementId, operationDescription, clues }) {
    const {
      tabState,
      result: { index, cluesKey, targetElement },
    } = await this.updatePuzzle(
      (puzzle) => {
        const { index, targetElement, elementType, clueType } = getElementWithClueById(puzzle, elementId);

        // Manually parse the type-specific data after knowing the type schema,
        // only to validate the input and report the errors.
        // Intentionally mimic the original tool schema, to get the same field paths in the error messages.
        parseElementSpecificData(elementType.typeName, { clues: z.array(clueType.schema) }, { clues });

        const cluesKey = clueType.key;

        (puzzle.allElements[index].config as any)[cluesKey].push(...clues);

        return { result: { index, cluesKey, targetElement } };
      },
      (from, to, { index, cluesKey }) => {
        (to.allConstraints[index].config as any)[cluesKey] = (from.allConstraints[index].config as any)[cluesKey];
      },
      operationDescription,
    );

    const updatedElement = tabState.puzzle.allElements[index];

    return {
      content: [
        {
          type: "text",
          text: [
            `Added ${clues.length} clues to "${getElementFinalName(targetElement)}" in puzzle "${tabState.puzzle.name || "(untitled)"}", there are ${(updatedElement.config as any)[cluesKey].length} clues in total now.`,
            elementsDiffSummary(tabState),
          ].join("\n"),
        },
      ],
    };
  },
);
