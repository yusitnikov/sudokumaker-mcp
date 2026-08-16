import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { SmartDiscriminatedUnion } from "../../SmartDiscriminatedUnion";
import { AllElements, getElementByTypeName } from "../../SudokuMakerElement";
import { mergeDeepUpdates, ZodDeepPartial } from "../../DeepPartial";
import { getElementById, getElementFinalName } from "./elementUtils";
import { getPuzzle, updatePuzzle } from "../utils";
import { operationDescriptionParam } from "./descriptionSnippets";

export const updateElementTool = new ToolImplementation(
  {
    definition: {
      name: "update_element",
      title: "Update Sudoku Maker element",
      description:
        // language=markdown
        `
Update global properties of an existing element
(its name, enabled/solverIgnored flags, or type-specific config like style)
and/or batch-apply the same partial update to every one of its clues at once.

To update individual clues differently from each other, use \`update_clues\` instead -
the \`clueBatchUpdates\` field here applies identically to ALL clues.
        `.trim(),
    },
  },
  z.object({
    elementId: z.number().int().describe(
      // language=markdown
      `ID of the target element to update, as returned by \`get_puzzle\`/\`add_element\`.`,
    ),
    operationDescription: operationDescriptionParam,
    updates: z
      .intersection(
        SmartDiscriminatedUnion(
          "type",
          AllElements.map((element) =>
            z.object({
              type: z.literal(element.typeName),
              ...(element.globalSchema
                ? {
                    elementUpdates: ZodDeepPartial(
                      element.globalSchema instanceof z.ZodCodec
                        ? element.globalSchema.def.in
                        : element.globalSchema,
                    ).optional(),
                  }
                : {}),
              ...(element.clue
                ? {
                    clueBatchUpdates: ZodDeepPartial(
                      element.clue.schema,
                    ).optional(),
                  }
                : {}),
            }),
          ),
        ),
        z.object({
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
      )
      .describe(
        // language=markdown
        `
What to change on the target element: type-specific config/clue updates plus common fields, merged
together into one object shaped like \`{"type": string, "elementUpdates"?: object,
"clueBatchUpdates"?: object, "name"?: string, "enabled"?: boolean, "solverIgnored"?: boolean}\`.

- **\`type\`** (required): the target element's exact type name as a string (must match its actual
  type, e.g. \`"Thermometer"\`) - read it off the \`type\` shown for that element in \`get_puzzle\`'s output.
- **\`elementUpdates\`** (optional): a deep-partial object of the element's config fields to change
  (e.g. \`{"style": {"bulbRadius": 0.6}}\` for a thermometer) - only present for element types that
  have a \`## Config\` section (see below); unset fields keep their current value, arrays are
  replaced wholesale if included; docs topic \`element:<TypeName>\`'s \`## Config\` section shows the
  full config JSON schema.
- **\`clueBatchUpdates\`** (optional): a deep-partial object applied identically to EVERY clue this
  element currently has (e.g. \`{"value": 0}\` would zero every cage's total) - only present for
  multi-clue element types; docs topic \`element:<TypeName>\`'s \`## Clues\` section shows the exact
  clue JSON schema.
- **\`name\`** (optional): a string to rename the element (send an empty string to revert to its
  default name; omit to leave unchanged).
- **\`enabled\`** (optional): a boolean toggling the element on/off entirely (logic and visuals).
- **\`solverIgnored\`** (optional): a boolean toggling whether the solver treats this element as
  active (logic only, visuals unaffected).

Example: \`{"type": "Thermometer", "elementUpdates": {"style": {"bulbRadius": 0.6}}}\`.
`.trim(),
      ),
  }),
  ({
    elementId,
    updates: {
      type,
      elementUpdates,
      clueBatchUpdates,
      name,
      enabled,
      solverIgnored,
    },
    operationDescription,
  }) => {
    const { index, targetElement } = getElementById(elementId, type);

    const elementType = getElementByTypeName(type);
    const cluesKey = elementType.clue?.key;

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
      operationDescription || `Update ${getElementFinalName(targetElement)}`,
    );

    const updatedElement = getPuzzle().allElements[index];

    const updatedConfig = { ...updatedElement.config } as any;
    const excludeClues = cluesKey && !clueBatchUpdates;
    if (excludeClues) {
      delete updatedConfig[cluesKey];
    }

    return {
      content: [
        {
          type: "text",
          text: `Element "${getElementFinalName(updatedElement)}" updated successfully.`,
        },
        {
          type: "text",
          text: `Here's the updated config spec${excludeClues ? " (excluding the clues list)" : ""}: ${JSON.stringify(updatedConfig, null, 2)}`,
        },
      ],
    };
  },
);
