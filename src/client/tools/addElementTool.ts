import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import {
  AllElements,
  ElementConfigSchema,
  ElementMainSchema,
  getElementByTypeName,
} from "../../SudokuMakerElement";
import { mergeDeepUpdates, ZodDeepPartial } from "../../DeepPartial";
import { getPuzzle, updatePuzzle } from "../utils";
import { getElementById, getElementSummary } from "./elementUtils";

export const addElementTool = new ToolImplementation(
  {
    definition: {
      name: "add_element",
      title: "Add Sudoku Maker element",
      description:
        "Add an empty element of specified type with default parameters to the puzzle",
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
      .describe("Element to add"),
    position: z
      .union([
        z
          .object({
            at: z.number().int().min(1),
          })
          .describe(
            "Place the new element at Nth place, e.g. 1 to place it as the first item",
          ),
        z
          .object({
            at: z.literal("end"),
          })
          .describe("Insert the new element to the end of the list"),
        z
          .object({
            elementId: z.number().int().describe("Target element ID"),
            position: z.enum(["before", "after"]),
          })
          .describe(
            "Place the new element before or after another element with given ID",
          ),
      ])
      .describe("Position where to insert the new element to"),
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
