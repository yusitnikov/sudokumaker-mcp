import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { jsonValue } from "../../jsonValue";
import { copyCells, getPuzzle, updatePuzzle } from "../utils";
import { puzzleNode } from "../format/puzzle/puzzle";
import { operationDescriptionParam } from "./descriptionSnippets";
import {
  addCluesToolName,
  addElementToolName,
  removeCluesToolName,
  removeElementToolName,
  updateCellMarksToolName,
  updateCellValuesToolName,
  updateCluesToolName,
  updateElementToolName,
  updateGivenDigitsToolName,
  updatePuzzleToolName,
} from "./toolNames";

export const updatePuzzleTool = new ToolImplementation(
  {
    definition: {
      name: updatePuzzleToolName,
      title: "Update puzzle contents for tab",
      description:
        // language=markdown
        `
Directly modify arbitrary paths of the raw puzzle object (title, rules text, or any nested field) -
a **last-resort escape hatch** for changes no dedicated tool covers (\`${updateGivenDigitsToolName}\`,
\`${updateCellValuesToolName}\`, \`${updateCellMarksToolName}\`,
\`${addElementToolName}\`/\`${updateElementToolName}\`/\`${removeElementToolName}\`,
\`${addCluesToolName}\`/\`${updateCluesToolName}\`/\`${removeCluesToolName}\`). Prefer those tools
whenever one fits - they validate their inputs and produce readable echoes, this tool does neither.

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
          path: z
            .array(
              z.union([
                z.string().describe("Object property name"),
                z.number().describe("Zero-based array index"),
              ]),
            )
            .describe(
              // language=markdown
              `The affected path of the puzzle object, e.g. \`["allElements", 0, "config"]\` to modify \`puzzle.allElements[0].config\`.`,
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
  ({ updates, operationDescription }) => {
    const before = getPuzzle();

    updatePuzzle(
      (puzzle) => {
        for (const { path, update } of updates) {
          let ref = {
            value: puzzle as any,
            set: (value: any) => {
              puzzle = value;
            },
          };

          for (const key of path) {
            const prev = ref.value;
            ref = {
              value: prev[key],
              set: (value: any) => {
                prev[key] = value;
              },
            };
          }

          switch (update.type) {
            case "set":
              ref.set(update.value);
              break;

            case "modifyItems":
              if (typeof ref.value === "string") {
                const lines = ref.value.split("\n");
                const textRef = ref;
                ref = {
                  value: lines,
                  set: (value: any[]) => textRef.set(value.join("\n")),
                };
              }

              if (!Array.isArray(ref.value)) {
                throw new Error(
                  `${["puzzle", ...path].join(".")} is not an array, it's ${typeof ref.value}`,
                );
              }

              ref.value.splice(
                update.index === "end" ? ref.value.length : update.index - 1,
                update.deleteItemsCount ?? 0,
                ...(update.insertItems ?? []),
              );
              /*
               * ref.value is modified in place,
               * but we still need to call the setter for the case of updating text lines
               */
              ref.set(ref.value);
              break;
          }
        }

        return puzzle;
      },
      ({ cells, ...from }, to) => {
        Object.assign(to, from);
        copyCells(cells, to.cells);
      },
      operationDescription,
    );

    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: [
            `Updated puzzle "${after.name || "(untitled)"}".`,
            "This is what changed:",
            puzzleNode(before).diff(puzzleNode(after)),
          ].join("\n"),
        },
      ],
    };
  },
);
