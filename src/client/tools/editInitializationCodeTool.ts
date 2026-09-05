import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getElementById, getElementFinalName } from "./elementUtils";
import { elementIdNote, operationDescriptionParam } from "./descriptionSnippets";
import { addElementToolName, editInitializationCodeToolName, getPuzzleToolName } from "./toolNames";
import { elementsDiffSummary } from "../format/puzzle/diffSummary";
import { CustomElement } from "../../elements/CustomElement";
import type { ElementByType } from "../../elements/types";
import { ElementType } from "../../elements/ElementType";
import type { PuzzlePublic } from "../../SudokuMakerPuzzleSchema";
import { customConstraintsTopicName } from "./docs/topicNames";
import { editText, editTextOperation } from "./editText";

/**
 * Resolves an element by ID and checks it's a `Custom` element - throwing a clear domain error otherwise.
 */
const getCustomElementById = (puzzle: PuzzlePublic, elementId: number) => {
  const { index, targetElement } = getElementById(puzzle, elementId);
  const { typeName } = CustomElement;

  if (targetElement.config.type !== typeName) {
    // The puzzle's actual Custom elements travel with the error, so retrying costs no extra read.
    const available = puzzle.allElements
      .filter((element) => element.config.type === typeName)
      .map((element) => `"${getElementFinalName(element)}" (ID=${element.id})`)
      .join(", ");

    throw new Error(
      `Element ${elementId} has type "${targetElement.config.type}", not "${typeName}" - this tool only applies to ${typeName} elements. ` +
        `The puzzle has ${available ? `the following ${typeName} elements: ${available}` : `no ${typeName} elements at all`}.`,
    );
  }

  return { index, targetElement: targetElement as ElementByType<ElementType.Custom> };
};

export const editInitializationCodeTool = new ToolImplementation(
  {
    definition: {
      name: editInitializationCodeToolName,
      title: "Edit Custom element's initialization code",
      description:
        // language=markdown
        `
Change a \`${CustomElement.typeName}\` element's \`initializationCode\`.
See the \`operation\` parameter for the available ways to change it.

Read the \`${customConstraintsTopicName}\` docs topic before using this tool -
its API and conventions cannot be guessed.
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
ID of the target \`${CustomElement.typeName}\` element, as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.
${elementIdNote}
        `.trim(),
      ),
    operationDescription: operationDescriptionParam,
    operation: editTextOperation,
  }),
  async function ({ elementId, operation, operationDescription }) {
    const {
      tabState,
      result: { index },
    } = await this.updatePuzzle(
      (puzzle) => {
        const { index, targetElement } = getCustomElementById(puzzle, elementId);

        targetElement.config.initializationCode = editText(targetElement.config.initializationCode, operation);

        return { result: { index } };
      },
      (from, to, { index }) => {
        to.allConstraints[index] = from.allConstraints[index];
      },
      operationDescription,
    );

    const updatedElement = tabState.puzzle.allElements[index];

    return {
      content: [
        {
          type: "text",
          text: [
            `Updated "${getElementFinalName(updatedElement)}"'s initialization code in puzzle "${tabState.puzzle.name || "(untitled)"}".`,
            elementsDiffSummary(tabState),
          ].join("\n"),
        },
      ],
    };
  },
);
