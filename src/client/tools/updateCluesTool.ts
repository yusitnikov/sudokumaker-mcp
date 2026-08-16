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
import { operationDescriptionParam } from "./descriptionSnippets";

export const updateCluesTool = new ToolImplementation(
  {
    definition: {
      name: "update_clues",
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
        "ID of the target element (the multi-clue element whose clues to update), as returned by get_puzzle/add_element.",
      ),
    operationDescription: operationDescriptionParam,
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
      // language=markdown
      `
Which element's clues to update and what to change on them, as an object shaped like
\`{"type": string, "updateGroups": array of {"clueCells": array, "updates": object}}\`.

- **\`type\`** (required): the target element's exact type name as a string (must match its actual
  type, e.g. \`"KillerCages"\`) - read it off the \`type\` shown for that element in \`get_puzzle\`'s
  output.
- **\`updateGroups\`** (required): array of group objects, each with two keys:
  - **\`clueCells\`** (required): cells that identify which clue(s) to target - a clue matches this
    group only if **all** of these cells are among the cells it affects (pass enough cells to
    identify one clue uniquely, or fewer to target several clues at once).
  - **\`updates\`** (required): a deep-partial object holding only the clue fields to change - unset
    fields keep their current value, array-valued fields (e.g. a cage's cell list) are replaced
    wholesale if included; docs topic \`element:<TypeName>\`'s \`## Clues\` section (substitute the
    type name, e.g. \`element:KillerCages\`) shows the exact clue JSON schema.

Every clue matched by a group receives that same group's \`updates\` object.

Example: \`{"type": "KillerCages", "updateGroups": [{"clueCells": [{"row": 1, "column": 1}], "updates": {"value": 21}}]}\`.
`.trim(),
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
