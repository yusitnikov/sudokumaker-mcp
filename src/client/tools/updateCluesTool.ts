import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import {
  ClueCellsGroupFilter,
  getElementFinalName,
  getElementWithClueById,
  updateCluesByCellGroups,
} from "./elementUtils";
import { mergeDeepUpdates, ZodDeepPartial } from "../../DeepPartial";
import { operationDescriptionParam } from "./descriptionSnippets";
import { KillerCagesElement } from "../../SudokuMakerElement";
import {
  addElementToolName,
  getPuzzleToolName,
  updateCluesToolName,
} from "./toolNames";
import { elementTopicPattern, elementTopicPrefix } from "./docs/topicNames";
import { jsonValue } from "../../jsonValue";

export const updateCluesTool = new ToolImplementation(
  {
    definition: {
      name: updateCluesToolName,
      title: "Update Sudoku Maker clues",
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
        `ID of the target element (the multi-clue element whose clues to update), as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.`,
      ),
    operationDescription: operationDescriptionParam,
    updateGroups: z
      .array(
        z.object({
          clueCells: ClueCellsGroupFilter,
          updates: jsonValue.describe(
            // language=markdown
            `
A deep-partial update for the clue: usually an object holding only the fields to change (unset
fields keep their current value, array-valued fields like a cage's cell list are replaced wholesale
if included), but a clue whose whole shape is a single string or array (e.g. a thermometer's cell
list) takes that value directly instead. Docs topic \`${elementTopicPattern}\` (substitute the target
element's exact type name, e.g. \`${elementTopicPrefix}${KillerCagesElement.typeName}\`)'s \`## Clues\`
section shows the exact clue JSON schema.
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
  ({ elementId, updateGroups: rawUpdateGroups, operationDescription }) => {
    const { clueType } = getElementWithClueById(elementId);

    // Manually parse the type-specific data after knowing the type schema.
    // Intentionally mimic the original tool schema, to get the same field paths in the error messages.
    const { updateGroups } = z
      .object({
        updateGroups: z.array(
          z.object({
            clueCells: ClueCellsGroupFilter,
            updates: ZodDeepPartial(clueType.schema),
          }),
        ),
      })
      .parse({ updateGroups: rawUpdateGroups });

    const { allMatchingIndexes, updatedElement, updatedClues, messages } =
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
