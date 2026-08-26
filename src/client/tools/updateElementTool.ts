import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { mergeDeepUpdates, ZodDeepPartial } from "../../DeepPartial";
import { getElementById, getElementFinalName } from "./elementUtils";
import { getPuzzle, updatePuzzle } from "../utils";
import {
  operationDescriptionParam,
  partialUpdateNote,
} from "./descriptionSnippets";
import { getElementByTypeName } from "../../SudokuMakerElement";
import {
  addElementToolName,
  getPuzzleToolName,
  updateCluesToolName,
  updateElementToolName,
} from "./toolNames";
import { elementTopicPattern } from "./docs/topicNames";
import { resolveHandle } from "../format/resolveHandle";
import { puzzleNode } from "../format/puzzle/puzzle";

export const updateElementTool = new ToolImplementation(
  {
    definition: {
      name: updateElementToolName,
      title: "Update Sudoku Maker element",
      description:
        // language=markdown
        `
Update an existing element's own fields, and/or batch-apply the same partial update to every one
of its clues at once.

To update individual clues differently from each other, use \`${updateCluesToolName}\` instead -
the \`clueBatchUpdates\` field here applies identically to ALL clues.
        `.trim(),
    },
  },
  z.object({
    elementId: z.number().int().describe(
      // language=markdown
      `ID of the target element to update, as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.`,
    ),
    operationDescription: operationDescriptionParam,
    elementUpdates: z
      .looseObject({})
      .optional()
      .describe(
        // language=markdown
        `
Object of the element's config fields to change (e.g. \`{"style": {"bulbRadius": 0.6}}\` for a
thermometer) - only accepted for element types that have config beyond their clues; docs topic
\`${elementTopicPattern}\`'s \`## Config\` section shows the full config JSON schema.

${partialUpdateNote}
`.trim(),
      ),
    clueBatchUpdates: z
      .looseObject({})
      .optional()
      .describe(
        // language=markdown
        `
Object applied identically to every clue this element currently has (e.g. \`{"value": 0}\` would
zero every cage's total) - only accepted for multi-clue element types; docs topic
\`${elementTopicPattern}\`'s \`## Clues\` section shows the exact clue JSON schema.

${partialUpdateNote}
`.trim(),
      ),
    name: z.string().optional().describe(
      // language=markdown
      `Rename the element (skip to leave the current name, pass an empty string to revert to the default name).`,
    ),
    enabled: z.boolean().optional().describe(
      // language=markdown
      `Enable or disable the element (both logic and visuals).`,
    ),
    solverIgnored: z.boolean().optional().describe(
      // language=markdown
      `Enable or disable the element for the solver (logic only).`,
    ),
  }),
  ({
    elementId,
    elementUpdates,
    clueBatchUpdates,
    name,
    enabled,
    solverIgnored,
    operationDescription,
  }) => {
    const { index, targetElement } = getElementById(elementId);
    const elementType = getElementByTypeName(targetElement.config.type);

    if (elementUpdates !== undefined && !elementType.globalSchema) {
      throw new Error(
        `Element type "${targetElement.config.type}" has no config to update - "elementUpdates" is not accepted for it.`,
      );
    }
    if (clueBatchUpdates !== undefined && !elementType.clue) {
      throw new Error(
        `Element type "${targetElement.config.type}" has no clues - "clueBatchUpdates" is not accepted for it.`,
      );
    }

    // Manually parse the type-specific data after knowing the type schema,
    // only to validate the input and report the errors.
    // Intentionally mimic the original tool schema, to get the same field paths in the error messages.
    z.object({
      ...(elementType.globalSchema
        ? {
            elementUpdates: ZodDeepPartial(
              elementType.globalSchema instanceof z.ZodCodec
                ? elementType.globalSchema.def.in
                : elementType.globalSchema,
            ).optional(),
          }
        : {}),
      ...(elementType.clue
        ? {
            clueBatchUpdates: ZodDeepPartial(
              elementType.clue.schema,
            ).optional(),
          }
        : {}),
    }).parse({
      elementUpdates,
      clueBatchUpdates,
    });

    const cluesKey = elementType.clue?.key;

    const before = getPuzzle();

    updatePuzzle(
      (puzzle) => {
        const element = puzzle.allElements[index];
        if (elementUpdates) {
          element.config = mergeDeepUpdates<typeof element.config>(
            element.config,
            elementUpdates,
          );
        }
        if (clueBatchUpdates && cluesKey) {
          const config = element.config as {
            [key in typeof cluesKey]: any[];
          };
          config[cluesKey] = config[cluesKey].map((value) =>
            mergeDeepUpdates(value, clueBatchUpdates),
          );
        }
        if (name !== undefined) {
          element.name = name;
        }
        if (enabled !== undefined) {
          element.enabled = enabled;
        }
        if (solverIgnored !== undefined) {
          element.solverIgnored = solverIgnored;
        }
      },
      (from, to) => {
        to.allConstraints[index] = from.allConstraints[index];
      },
      operationDescription,
    );

    const after = getPuzzle();

    const updatedElement = after.allElements[index];

    return {
      content: [
        {
          type: "text",
          text: [
            `Element "${getElementFinalName(updatedElement)}" updated successfully in puzzle "${after.name || "(untitled)"}".`,
            resolveHandle(puzzleNode(before), "allElements").diff(
              resolveHandle(puzzleNode(after), "allElements"),
            ),
          ].join("\n\n"),
        },
      ],
    };
  },
);
