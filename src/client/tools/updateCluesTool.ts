import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import {
  ClueCellsGroupFilter,
  getElementFinalName,
  getElementWithClueById,
  parseElementSpecificData,
  updateCluesByCellGroups,
} from "./elementUtils";
import { mergeDeepUpdates, ZodDeepPartial } from "../../DeepPartial";
import { getPuzzle } from "../utils";
import {
  elementIdNote,
  operationDescriptionParam,
  partialUpdateNote,
} from "./descriptionSnippets";
import { KillerCagesElement } from "../../SudokuMakerElement";
import {
  addElementToolName,
  getPuzzleToolName,
  updateCluesToolName,
} from "./toolNames";
import { elementTopicPattern, elementTopicPrefix } from "./docs/topicNames";
import { jsonValue } from "../../jsonValue";
import { elementsDiffSummary } from "../format/puzzle/diffSummary";

export const updateCluesTool = new ToolImplementation(
  {
    definition: {
      name: updateCluesToolName,
      title: "Update SudokuMaker clues",
      description:
        // language=markdown
        `
Update one or more existing clues of a multi-clue element (e.g. retotal killer cages, retarget an arrow).

The response lists which clues were matched by each cell group - **undo immediately** if a match
wasn't the clue you intended.
`.trim(),
    },
  },
  z.object({
    elementId: z
      .number()
      .int()
      .describe(
        `
ID of the target element (the multi-clue element whose clues to update), as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.
${elementIdNote}
        `.trim(),
      ),
    operationDescription: operationDescriptionParam,
    updateGroups: z
      .array(
        z.object({
          clueCells: ClueCellsGroupFilter,
          updates: jsonValue.describe(
            // language=markdown
            `
An update for the clue: usually an object holding only the fields to change, but a clue whose whole
shape is a single string or array (e.g. a thermometer's cell list) takes that value directly instead
of an object. Docs topic \`${elementTopicPattern}\` (substitute the target element's exact type name,
e.g. \`${elementTopicPrefix}${KillerCagesElement.typeName}\`)'s \`## Clues\` section shows the exact
clue JSON schema.

${partialUpdateNote}
`.trim(),
          ),
        }),
      )
      .describe(
        // language=markdown
        `
Array of group objects. Every clue matched by a group receives that same group's \`updates\` object.

Example: \`[{"clueCells": ["r1c1"], "updates": {"value": 21}}]\`.
`.trim(),
      ),
  }),
  ({ elementId, updateGroups, operationDescription }) => {
    const { elementType, clueType } = getElementWithClueById(elementId);

    // Manually parse the type-specific data after knowing the type schema,
    // only to validate the input and report the errors.
    // Intentionally mimic the original tool schema, to get the same field paths in the error messages.
    parseElementSpecificData(
      elementType.typeName,
      {
        updateGroups: z.array(
          z.object({
            clueCells: ClueCellsGroupFilter,
            updates: ZodDeepPartial(clueType.schema as any),
          }),
        ),
      },
      { updateGroups },
    );

    const before = getPuzzle();

    const { allMatchingIndexes, updatedElement, messages } =
      updateCluesByCellGroups(
        elementId,
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
        operationDescription,
      );

    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: [
            `Updated ${allMatchingIndexes.size} clues of "${getElementFinalName(updatedElement)}" in puzzle "${after.name || "(untitled)"}".`,
            "",
            ...messages,
            "",
            elementsDiffSummary(before, after),
          ].join("\n"),
        },
      ],
    };
  },
);
