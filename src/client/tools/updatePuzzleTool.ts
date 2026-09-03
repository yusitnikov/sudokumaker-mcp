import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { jsonValue } from "../../jsonValue";
import { puzzleDiffSummary } from "../format/puzzle/diffSummary";
import { puzzleNode } from "../format/puzzle/puzzle";
import { operationDescriptionParam } from "./descriptionSnippets";
import {
  addCluesToolName,
  addElementToolName,
  getPuzzleToolName,
  removeCluesToolName,
  removeElementToolName,
  updateCellMarksToolName,
  updateCellValuesToolName,
  updateCluesToolName,
  updateElementToolName,
  updateGivenDigitsToolName,
  updatePuzzleMetadataToolName,
  updatePuzzleToolName,
} from "./toolNames";
import { copyCells } from "../copyCells";

export const updatePuzzleTool = new ToolImplementation(
  {
    definition: {
      name: updatePuzzleToolName,
      title: "Update puzzle contents for tab",
      description:
        // language=markdown
        `
Directly modify arbitrary paths of the raw puzzle object - a **last-resort escape hatch** for
changes no dedicated tool covers (\`${updateGivenDigitsToolName}\`, \`${updateCellValuesToolName}\`,
\`${updateCellMarksToolName}\`,\`${addElementToolName}\`,\`${updateElementToolName}\`,\`${removeElementToolName}\`,
\`${addCluesToolName}\`,\`${updateCluesToolName}\`,\`${removeCluesToolName}\`,\`${updatePuzzleMetadataToolName}\`).
Prefer those tools whenever one fits - they validate their inputs and produce readable echoes,
this tool does neither.

Applies multiple \`{path, update}\` operations in order, as one atomic change; later operations see
the puzzle state after earlier ones already applied.
`.trim(),
    },
  },
  z.object({
    operationDescription: operationDescriptionParam,
    updates: z
      .array(
        z.object({
          path: z.string().describe(
            // language=markdown
            `The handle of the affected node, exactly as \`${getPuzzleToolName}\` prints it - dot-joined segments, e.g. \`allElements.1.config\`.`,
          ),
          update: z
            .union([
              z.object({
                type: z.literal("set").describe(
                  // language=markdown
                  `Set the specified path of the puzzle to the given value. The previous value is overridden.`,
                ),
                value: z.optional(jsonValue).describe(
                  // language=markdown
                  `New value to put into the specified place. Skipping this parameter sets the value to \`undefined\`.`,
                ),
              }),
              z.object({
                type: z.literal("modifyItems").describe(
                  // language=markdown
                  `Insert/delete/replace array items or string lines at the specified path and index.`,
                ),
                index: z.union([
                  z.number().int().min(1).describe(
                    // language=markdown
                    `Insert/delete/replace items/lines at this specific one-based index (notice: **at** this index, not after it).`,
                  ),
                  z.literal("end").describe(
                    // language=markdown
                    `Insert items/lines at the end of the array/text (not applicable for items/lines deletion).`,
                  ),
                ]),
                insertItems: z.array(jsonValue).optional().describe(
                  // language=markdown
                  `New items/lines to insert. Skip this parameter to just delete items/lines without inserting new ones.`,
                ),
                deleteItemsCount: z.number().int().min(0).optional().describe(
                  // language=markdown
                  `Number of existing items/lines to remove starting at \`index\`, e.g. \`{"index": 4, "deleteItemsCount": 6}\` deletes items 4-9. Skip this parameter to just insert without deleting.`,
                ),
              }),
            ])
            .describe(
              // language=markdown
              `Operation performed on the specified path of the object.`,
            ),
        }),
      )
      .describe(
        // language=markdown
        `Array of operations to apply.`,
      ),
  }),
  async function ({ updates, operationDescription }) {
    const { tabState } = await this.updatePuzzle(
      (puzzle) => {
        for (const { path, update } of updates) {
          const node = puzzleNode(puzzle).resolveHandle(path);

          switch (update.type) {
            case "set":
              node.setValue(update.value);
              break;

            case "modifyItems": {
              // Text is modified by lines, so a string node is spliced as its lines and rejoined.
              const isText = typeof node.value === "string";
              const items = isText ? node.value.split("\n") : node.value;

              if (!Array.isArray(items)) {
                throw new Error(
                  `${path || "the puzzle"} is not an array or a text, it's ${typeof node.value}`,
                );
              }

              items.splice(
                update.index === "end" ? items.length : update.index - 1,
                update.deleteItemsCount ?? 0,
                ...(update.insertItems ?? []),
              );
              /*
               * Array items are modified in place,
               * but we still need to call the setter for the case of updating text lines
               */
              if (isText) {
                node.setValue(items.join("\n"));
              }
              break;
            }
          }
        }

        return { puzzle };
      },
      ({ cells, ...from }, to) => {
        Object.assign(to, from);
        copyCells(cells, to.cells);
      },
      operationDescription,
    );

    return {
      content: [
        {
          type: "text",
          text: [
            `Updated puzzle "${tabState.puzzle.name || "(untitled)"}".`,
            puzzleDiffSummary(tabState),
          ].join("\n"),
        },
      ],
    };
  },
);
