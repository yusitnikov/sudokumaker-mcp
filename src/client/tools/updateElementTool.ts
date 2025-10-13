import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { SmartDiscriminatedUnion } from "../../SmartDiscriminatedUnion";
import { AllElements, getElementByTypeName } from "../../SudokuMakerElement";
import { mergeDeepUpdates, ZodDeepPartial } from "../../DeepPartial";
import { getElementById, getElementFinalName } from "./elementUtils";
import { getPuzzle, updatePuzzle } from "../utils";

export const updateElementTool = new ToolImplementation(
  {
    definition: {
      name: "update_element",
      title: "Update Sudoku Maker element",
      description:
        "Update global properties of an element and/or batch-update properties of all clues of this element",
    },
  },
  z.object({
    elementId: z.number().int().describe("Element ID to update"),
    operationDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable summary of what this operation does. " +
          "This helps the non-technical user understand the action they're approving.",
      ),
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
          name: z
            .string()
            .optional()
            .describe(
              "Rename the element (skip to leave the current name, pass empty string to revert to the default name)",
            ),
          enabled: z
            .boolean()
            .optional()
            .describe("Enable or disable the element (both logic and visuals)"),
          solverIgnored: z
            .boolean()
            .optional()
            .describe(
              "Enable or disable the element for the solver (logic only)",
            ),
        }),
      )
      .describe(
        "Updates to apply to the element: " +
          "type - target element type name (should match the actual type or the operation will fail), " +
          "elementUpdates - update parameters of the element itself, " +
          "clueBatchUpdates - update parameters of EVERY clue of the element " +
          "(don't update cell coords there, batch-updating them to the same value doesn't make sense!)",
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
