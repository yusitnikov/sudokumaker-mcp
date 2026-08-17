import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import {
  AllElements,
  CosmeticSymbolElement,
  ElementConfigSchema,
  ElementMainSchema,
  getElementByTypeName,
  KillerCagesElement,
  ThermometerElement,
} from "../../SudokuMakerElement";
import { mergeDeepUpdates, ZodDeepPartial } from "../../DeepPartial";
import { getPuzzle, updatePuzzle } from "../utils";
import { getElementById, getElementSummary } from "./elementUtils";
import { addCluesToolName, addElementToolName } from "./toolNames";
import { elementsTopicName, elementTopicPattern } from "./docs/topicNames";

export const addElementTool = new ToolImplementation(
  {
    definition: {
      name: addElementToolName,
      title: "Add Sudoku Maker element",
      description:
        // language=markdown
        `
Create a new element (a constraint or a decorative/cosmetic element) in the puzzle and insert it
into the element list at a chosen position.
`.trim(),
    },
  },
  z.object({
    name: ElementMainSchema.shape.name,
    enabled: ElementMainSchema.shape.enabled.default(true),
    solverIgnored: ElementMainSchema.shape.solverIgnored.default(false),
    element: z
      .union(
        AllElements.flatMap((element) =>
          [element.main, ...element.options].map((option) =>
            z
              .object({
                type: z.literal(element.typeName),
                subType: z.literal(option.title),
                ...(option.paramsSchema ? { params: option.paramsSchema } : {}),
                ...(element.globalSchema
                  ? {
                      overrides: ZodDeepPartial(
                        element.globalSchema,
                      ).optional(),
                    }
                  : {}),
              })
              .describe(option.description),
          ),
        ),
      )
      .describe(
        // language=markdown
        `
Which type/variant of element to create and its initial config, as an object shaped like
\`{"type": string, "subType": string, "params"?: object, "overrides"?: object}\`.

- **\`type\`** (required): the exact element type name to create, e.g. \`"${KillerCagesElement.typeName}"\`,
  \`"${ThermometerElement.typeName}"\`, \`"${CosmeticSymbolElement.typeName}"\` - browse valid type names
  in docs topic \`${elementsTopicName}\`.
- **\`subType\`** (required): the exact title of one of that type's variants - docs topic
  \`${elementTopicPattern}\`'s \`## Variants\` section lists them.
- **\`params\`** (optional, only for subtypes that need them): an object of subtype-specific creation
  parameters, shape given alongside the variant in \`## Variants\` when it takes one.
- **\`overrides\`** (optional, only for types with a \`## Config\` section, see below): a deep-partial
  object of initial config values to set instead of the type's defaults (e.g.
  \`{"style": {"color": "#ff0000"}}\`) - docs topic \`${elementTopicPattern}\`'s \`## Config\` section shows
  the full config JSON schema; \`overrides\` may set any subset of it.

The new element's clue list (for multi-clue types) always starts empty regardless of \`overrides\` -
use \`${addCluesToolName}\` afterwards.

Example: \`{"type": "${ThermometerElement.typeName}", "subType": "${ThermometerElement.typeName}", "overrides": {"style": {"color": "#888888"}}}\`.
`.trim(),
      ),
    position: z
      .union([
        z
          .object({
            at: z.number().int().min(1),
          })
          .describe(
            // language=markdown
            `Place the new element at the Nth position, e.g. \`1\` to place it as the first item.`,
          ),
        z
          .object({
            at: z.literal("end"),
          })
          .describe(
            // language=markdown
            `Insert the new element at the end of the list.`,
          ),
        z
          .object({
            elementId: z.number().int().describe("Target element ID"),
            position: z.enum(["before", "after"]),
          })
          .describe(
            // language=markdown
            `Place the new element immediately before or after another element with the given ID.`,
          ),
      ])
      .describe(
        // language=markdown
        `
Where to insert the new element in the puzzle's ordered element list (order affects layering).
Exactly one of these three shapes:

- \`{"at": number}\` places it at that 1-based position (1 = first item).
- \`{"at": "end"}\` appends it to the end of the list.
- \`{"elementId": number, "position": "before" | "after"}\` places it immediately before or after an
  existing element, identified by that element's ID (not its list index).
`.trim(),
      ),
  }),
  ({ name, enabled = true, solverIgnored = false, element, position }) => {
    const { spec, allElements: currentElements } = getPuzzle();

    let index: number;
    if ("elementId" in position) {
      index = getElementById(position.elementId).index;
      if (position.position === "after") {
        index++;
      }
    } else if (position.at === "end") {
      index = currentElements.length;
    } else {
      index = position.at - 1;
      if (index > currentElements.length) {
        throw new Error(
          `Cannot insert element at position ${position.at} - there are only ${currentElements.length} elements in the puzzle`,
        );
      }
    }

    const elementType = getElementByTypeName(element.type);
    const elementSubType = [elementType.main, ...elementType.options].find(
      ({ title }) => title === element.subType,
    )!;
    const config = mergeDeepUpdates<z.input<typeof ElementConfigSchema>>(
      {
        type: element.type,
        ...(elementType.clue ? { [elementType.clue.key]: [] } : {}),
        ...(typeof elementSubType.defaultConfig === "function"
          ? (elementSubType.defaultConfig as any)(spec, element.params)
          : (elementSubType.defaultConfig ?? element.params)),
      },
      element.overrides ?? {},
    );
    const id = currentElements.length
      ? Math.max(...currentElements.map(({ id = 0 }) => id)) + 1
      : 1;

    updatePuzzle(
      (puzzle) => {
        puzzle.allElements.splice(index, 0, {
          id,
          name,
          config,
          enabled,
          solverIgnored,
        });
      },
      (from, to) => {
        to.allConstraints.splice(index, 0, from.allConstraints[index]);
      },
      `Add ${elementSubType.title}`,
    );

    const newElements = getPuzzle().allElements;
    const newElement = newElements[index];
    if (newElement?.id !== id) {
      return {
        content: [
          {
            type: "text",
            text: "Something went wrong - failed to add the element. Please report the error to the Sudoku Maker MCP server developer (Chameleon)",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `New element added at position ${index + 1}.`,
        },
        {
          type: "text",
          text: `The new elements list: ${newElements.map(getElementSummary).join(", ")}.`,
        },
        {
          type: "text",
          text: `New element: ${JSON.stringify(newElement, null, 2)}`,
        },
      ],
    };
  },
);
