// noinspection SqlNoDataSourceInspection

import { TabSyncClient } from "@sitnikov/tab-sync";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Tool, WorkerInitOptions } from "./shared";
import { z } from "zod";
import { PuzzleSchema } from "./SudokuMakerPuzzleSchema.ts";
import {
  AllElements,
  ElementSchema,
  type ElementByType,
  ElementType,
  getElementByConfig,
  getElementByTypeName,
  ElementConfigSchema,
} from "./SudokuMakerElement.ts";
import {
  type CellCoords,
  CellId,
  CellIdPublic,
  CellSchema,
  CellSchemaNoId,
} from "./SudokuMakerSchemas.ts";
import { mergeDeepUpdates, ZodDeepPartial } from "./DeepPartial.ts";
import { SmartDiscriminatedUnion } from "./SmartDiscriminatedUnion.ts";

const code = `
    import { run } from "${import.meta.url.replace("/client", "/worker")}";
    run();
`;
const url = "data:application/javascript;base64," + btoa(code);

const tabSyncClient = new TabSyncClient<{ connected: boolean }>({
  sharedWorkerPath: url,
  sharedWorkerOptions: { name: "Sudoku Maker MCP", type: "module" },
});

tabSyncClient.onExtraPingDataChanged = ({ connected }) =>
  console.log("Connection status changed:", { connected });

// region Utils
const getPuzzle = () => {
  const puzzle = PuzzleSchema.encode(window.Api.getPuzzle());

  puzzle.allElements.forEach(
    <TypeT extends ElementType>(element: ElementByType<TypeT>) => {
      const elementType = getElementByConfig<TypeT>(element.config);

      const elementMetadata = elementType.getElementMetadata(
        element.config,
        puzzle.spec,
      );

      element.elementMetadata = {
        defaultName: elementMetadata.title,
        description: elementMetadata.description,
      };
    },
  );

  return puzzle;
};

const updatePuzzle = (
  updateCallback: (
    puzzle: z.input<typeof PuzzleSchema>,
  ) => z.input<typeof PuzzleSchema> | void,
  copyCallback: (
    from: z.output<typeof PuzzleSchema>,
    to: z.output<typeof PuzzleSchema>,
  ) => void,
  operationDescription?: string,
) =>
  window.Api.updatePuzzle((sudokuMakerPuzzle) => {
    const puzzle = PuzzleSchema.encode(sudokuMakerPuzzle);

    const updatedPuzzle = updateCallback(puzzle) ?? puzzle;

    const updatedSudokuMakerPuzzle = PuzzleSchema.decode(updatedPuzzle);

    copyCallback(updatedSudokuMakerPuzzle, sudokuMakerPuzzle);
  }, operationDescription);

const copyCells = (
  from: z.output<typeof CellSchema>[],
  to: z.output<typeof CellSchema>[],
) => {
  for (const [index, cell] of from.entries()) {
    Object.assign(to[index], cell);
  }
};

const waitForSolver = async (timeout: number) => {
  const step = 200;
  for (let time = 0; time < timeout && window.Api.busy.value; time += step) {
    await new Promise((resolve) => setTimeout(resolve, step));
  }

  const isBusy = window.Api.busy.value;
  return {
    isBusy,
    message: isBusy
      ? `The solver is still running after ${timeout / 1000} seconds...`
      : "The solver finished running.",
  };
};

const toShortCellNotation = (cellOrCells: CellCoords | CellCoords[]): string =>
  Array.isArray(cellOrCells)
    ? cellOrCells.map(toShortCellNotation).join(", ")
    : `r${cellOrCells.row}c${cellOrCells.column}`;
// endregion

export class ToolImplementation<SchemaT extends z.ZodSchema> {
  constructor(
    private readonly tool: Omit<Tool, "definition"> & {
      definition: Omit<Tool["definition"], "inputSchema">;
    },
    private readonly inputSchema: SchemaT,
    private readonly _run: (
      params: z.input<SchemaT>,
    ) => CallToolResult | Promise<CallToolResult>,
  ) {}

  get name() {
    return this.tool.definition.name;
  }

  get definition(): Tool {
    return {
      ...this.tool,
      definition: {
        ...this.tool.definition,
        inputSchema: z.toJSONSchema(this.inputSchema, { io: "input" }),
      } as Tool["definition"],
    };
  }

  run(params: unknown) {
    const validatedParams = this.inputSchema.parse(params);

    return this._run(this.inputSchema.encode(validatedParams));
  }
}

// region Tools
const getPuzzleTool = new ToolImplementation(
  {
    definition: {
      name: "get_puzzle",
      title: "Get puzzle contents for tab",
      description: "Get full puzzle definition per tab ID",
    },
  },
  z.object({
    path: z
      .array(
        z.union([
          z.string().describe("Object property name"),
          z.number().int().min(0).describe("Zero-based array index"),
        ]),
      )
      .optional()
      .describe(
        'The path of the puzzle object to retrieve, e.g. ["spec", "type"] to get puzzle.spec.type. ' +
          "Skip the path to get the whole puzzle object (warning: it will produce lots of tokens!). " +
          "DO NOT guess the puzzle structure, you have the exact schema in the instructions!",
      ),
  }),
  ({ path = [] }) => {
    let result: any = getPuzzle();
    for (const key of path) {
      result = result?.[key];
    }

    if (result === undefined) {
      return {
        content: [
          {
            type: "text",
            text: "The value at the specified path is not defined. Try checking the parents...",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "resource",
          resource: {
            uri: ["puzzle:", "", tabSyncClient.myTabInfo.id, ...path].join("/"),
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        },
      ],
    };
  },
);

const updatePuzzleTool = new ToolImplementation(
  {
    definition: {
      name: "update_puzzle",
      title: "Update puzzle contents for tab",
      description:
        "Modify puzzle object at specified path. " +
        "Please use this tool only as a last resort option when no other puzzle modification tool is fitting. " +
        "DO NOT guess the puzzle structure, you have the exact schema in the instructions!",
    },
  },
  z.object({
    operationDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable summary of what this operation does. " +
          "This helps the non-technical user understand the action they're approving.",
      ),
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
              'The affected path of the puzzle object, e.g. ["allElements", 0, "config"] to modify puzzle.allElements[0].config',
            ),
          update: z
            .union([
              z.object({
                type: z
                  .literal("set")
                  .describe(
                    "Set the specified path of the puzzle to the given value. The previous value will be overridden",
                  ),
                value: z
                  .any()
                  .optional()
                  .describe(
                    "New value to put into the specified place. Skipping this parameter will set the value to undefined",
                  ),
              }),
              z.object({
                type: z
                  .literal("modifyItems")
                  .describe(
                    "Insert/delete/replace array items or string lines at the specified path and index",
                  ),
                index: z.union([
                  z
                    .number()
                    .int()
                    .min(1)
                    .describe(
                      "Insert/delete/replace items/lines at this specific one-based index (notice: AT this index, not AFTER this index)",
                    ),
                  z
                    .literal("end")
                    .describe(
                      "Insert items/lines to the end of the array/text (not applicable for items/lines deletion)",
                    ),
                ]),
                insertItems: z
                  .array(z.any())
                  .optional()
                  .describe(
                    "New items/lines to insert. Skip this parameter to just delete items/lines without inserting new ones",
                  ),
                deleteItemsCount: z
                  .number()
                  .int()
                  .min(0)
                  .optional()
                  .describe(
                    "Amount of items/lines that would be removed starting from the specified index. For instance, in order to delete items 4-9 from the array, specify index = 4 and deleteItemsCount = 6. Skip this parameter to just add new items/lines without deleting old ones",
                  ),
              }),
            ])
            .describe(
              "Operation performed to the specified path of the object",
            ),
        }),
      )
      .describe(
        "Update operations list. IMPORTANT: operations will be applied to the puzzle object in the order of definition. " +
          "All update paths are relevant to the state of the puzzle AFTER performing all previous updates. " +
          'So, for instance, if we have an array ["A", "B", "C"], and the operations are "insert D at position 2" and "insert E at position 4", ' +
          'then the result would be ["A", "D", "B", "E", "C"], not ["A", "D", "B", "C", "E"], because it\'s position 4 AFTER inserting D.',
      ),
  }),
  ({ updates, operationDescription }) => {
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

    return {
      content: [
        {
          type: "text",
          text: "Operation completed",
        },
      ],
    };
  },
);

const updateGivenDigitsTool = new ToolImplementation(
  {
    definition: {
      name: "update_given_digits",
      title: "Update given digits",
      description: "Modify (add, update or delete) given digits in the cells",
    },
  },
  z.object({
    cells: z.array(CellId).describe("Cells to modify"),
    digit: z
      .number()
      .int()
      .min(-1)
      .describe(
        "The digit to place into the cells, or -1 to remove given digits from the specified cells",
      ),
  }),
  ({ cells, digit }) => {
    updatePuzzle(
      (puzzle) => {
        for (const { row, column } of cells) {
          const cell = puzzle.cells[row - 1][column - 1];

          cell.given = digit !== -1;
          cell.value = digit === -1 ? undefined : digit;
          cell.candidates = [];
          cell.cornerPencilMarks = [];
        }
      },
      (from, to) => copyCells(from.cells, to.cells),
      (digit === -1
        ? "Remove given digits from "
        : `Put given ${digit} into `) + toShortCellNotation(cells),
    );

    return {
      content: [{ type: "text", text: "Updated successfully." }],
    };
  },
);

const updateCellValuesTool = new ToolImplementation(
  {
    definition: {
      name: "update_cell_values",
      title: "Update cell values",
      description: "Modify (add, update or delete) final values of grid cells",
    },
  },
  z.object({
    cells: z.array(CellId).describe("Cells to modify"),
    digit: z
      .number()
      .int()
      .min(-1)
      .describe(
        "The digit to place into the cells, or -1 to remove digits from the specified cells",
      ),
  }),
  ({ cells, digit }) => {
    const updatedCells: CellCoords[] = [];
    const skippedCells: CellCoords[] = [];

    updatePuzzle(
      (puzzle) => {
        for (const coords of cells) {
          const { row, column } = coords;
          const cell = puzzle.cells[row - 1][column - 1];

          if (cell.given) {
            skippedCells.push(coords);
            continue;
          }

          cell.value = digit === -1 ? undefined : digit;
          cell.candidates = [];
          cell.cornerPencilMarks = [];
          updatedCells.push(coords);
        }
      },
      (from, to) => copyCells(from.cells, to.cells),
      (digit === -1 ? "Remove values from " : `Put value ${digit} into `) +
        toShortCellNotation(cells),
    );

    if (skippedCells.length === 0) {
      return {
        content: [{ type: "text", text: "Updated successfully." }],
      };
    }

    if (updatedCells.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to update the cells because they all contain given digits.",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Updated cells ${toShortCellNotation(updatedCells)} successfully.`,
        },
        {
          type: "text",
          text: `Failed to update cells ${toShortCellNotation(skippedCells)} because they contain given digits.`,
        },
      ],
    };
  },
);

const updateCellMarksTool = new ToolImplementation(
  {
    definition: {
      name: "update_cell_marks",
      title: "Update cell marks and colors",
      description:
        "Modify (add, update or delete) the marks (candidates, corner marks, colors) in the grid cells",
    },
  },
  z.object({
    operationDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable summary of what this operation does. " +
          "This helps the non-technical user understand the action they're approving.",
      ),
    cells: z.array(CellId).describe("Cells to modify"),
    operation: z
      .enum(["add", "replace", "remove"])
      .describe(
        "Operation to apply to existing cell marks: " +
          '"add" - add given marks to the existing cell marks, ' +
          '"replace" - replace (override) the existing cell marks with the given marks, ' +
          '"remove" - subtract the given marks from the existing cell marks. ' +
          'Use the "replace" operation with an empty array to remove all marks of a kind',
      ),
    candidates: CellSchemaNoId.shape.candidates.optional(),
    cornerPencilMarks: CellSchemaNoId.shape.cornerPencilMarks.optional(),
    colors: CellSchemaNoId.shape.colors.optional(),
  }),
  ({
    operationDescription,
    cells,
    operation,
    candidates,
    cornerPencilMarks,
    colors,
  }) => {
    const updatedCells: CellCoords[] = [];
    const skippedCells: CellCoords[] = [];

    updatePuzzle(
      (puzzle) => {
        for (const coords of cells) {
          const { row, column } = coords;
          const cell = puzzle.cells[row - 1][column - 1];

          if (cell.value !== undefined && (candidates || cornerPencilMarks)) {
            skippedCells.push(coords);
            continue;
          }

          const update = (
            key: "candidates" | "cornerPencilMarks" | "colors",
            value: number[] | undefined,
          ) => {
            if (value === undefined) {
              return;
            }

            switch (operation) {
              case "add":
                cell[key] = Array.from(new Set([...cell[key], ...value]));
                break;
              case "replace":
                cell[key] = value;
                break;
              case "remove":
                cell[key] = cell[key].filter((digit) => !value.includes(digit));
                break;
            }
          };
          update("candidates", candidates);
          update("cornerPencilMarks", cornerPencilMarks);
          update("colors", colors);

          updatedCells.push(coords);
        }
      },
      (from, to) => copyCells(from.cells, to.cells),
      operationDescription || "Update marks for " + toShortCellNotation(cells),
    );

    const newCells = getPuzzle().cells;
    const updatedCellsDescription =
      updatedCells.length && operation !== "replace"
        ? [
            {
              type: "text" as const,
              text:
                "Here are the cells marks after the update:\n" +
                updatedCells
                  .map((coords) => {
                    const cell = newCells[coords.row - 1][coords.column - 1];

                    return (
                      `- ${toShortCellNotation(coords)}: ` +
                      // describe only mark types that were requested to change
                      [
                        candidates &&
                          `candidates - ${JSON.stringify(cell.candidates)}`,
                        cornerPencilMarks &&
                          `corner marks - ${JSON.stringify(cell.cornerPencilMarks)}`,
                        colors && `colors - ${JSON.stringify(cell.colors)}`,
                      ]
                        .filter(Boolean)
                        .join(", ") +
                      "."
                    );
                  })
                  .join("\n"),
            },
          ]
        : [];

    if (skippedCells.length === 0) {
      return {
        content: [
          { type: "text", text: "Updated successfully." },
          ...updatedCellsDescription,
        ],
      };
    }

    if (updatedCells.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to update the cells because they all contain value.",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Updated cells ${toShortCellNotation(updatedCells)} successfully.`,
        },
        {
          type: "text",
          text: `Failed to update cells ${toShortCellNotation(skippedCells)} because they contain value.`,
        },
        ...updatedCellsDescription,
      ],
    };
  },
);

// region Elements
const getElementFinalName = ({
  name,
  config: { type },
  elementMetadata,
}: z.input<typeof ElementSchema>) =>
  name || elementMetadata?.defaultName || type;

const getElementSummary = (element: z.input<typeof ElementSchema>) =>
  `"${getElementFinalName(element)}" (type ${element.config.type}, ID ${element.id}, ${!element.enabled ? "disabled" : element.solverIgnored ? "solver-ignored" : "enabled"})`;

const getElementById = (elementId: number, type?: string) => {
  const { allElements: currentElements } = getPuzzle();

  const targetElement = currentElements.find(({ id }) => id === elementId);
  if (!targetElement) {
    throw new Error(`Element with ID ${elementId} not found in the puzzle`);
  }
  if (type !== undefined && targetElement.config.type !== type) {
    throw new Error(
      `Type mismatch: element with ID ${elementId} is of type "${targetElement.config.type}", but type "${type}" requested. Are you sure that it's the element that you wanted to edit?`,
    );
  }
  const index = currentElements.indexOf(targetElement);

  return { index, targetElement };
};

const addElementTool = new ToolImplementation(
  {
    definition: {
      name: "add_element",
      title: "Add Sudoku Maker element",
      description:
        "Add an empty element of specified type with default parameters to the puzzle",
    },
  },
  z.object({
    name: z
      .string()
      .optional()
      .describe(
        "Element name. Leave it empty to use the default name according to the element type " +
          "(recommended when there's only one element of this type in the puzzle)",
      ),
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
  ({ name, element, position }) => {
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
          enabled: true,
          solverIgnored: false,
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

const updateElementTool = new ToolImplementation(
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
    updates: SmartDiscriminatedUnion(
      "type",
      AllElements.filter(({ globalSchema, clue }) => globalSchema || clue).map(
        (element) =>
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
    ).describe(
      "Updates to apply to the element: " +
        "type - target element type name (should match the actual type or the operation will fail), " +
        "elementUpdates - update parameters of the element itself, " +
        "clueBatchUpdates - update parameters of EVERY clue of the element " +
        "(don't update cell coords there, batch-updating them to the same value doesn't make sense!)",
    ),
  }),
  ({
    elementId,
    updates: { type, elementUpdates, clueBatchUpdates },
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
      },
      (from, to) => {
        to.allConstraints[index].config = from.allConstraints[index].config;
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

const removeElementTool = new ToolImplementation(
  {
    definition: {
      name: "remove_element",
      title: "Remove Sudoku Maker element",
      description: "Remove element from the puzzle by ID",
    },
  },
  z.object({
    elementId: z.number().int().describe("Element ID to delete"),
    elementName: z
      .string()
      .optional()
      .describe(
        "The name of the element that's going to be deleted - use this parameter to make the LLM user understand which element is going to be removed when looking at the MCP tool call parameters",
      ),
  }),
  ({ elementId }) => {
    const { index, targetElement } = getElementById(elementId);

    updatePuzzle(
      (puzzle) => {
        puzzle.allElements.splice(index, 1);
      },
      (_from, to) => {
        to.allConstraints.splice(index, 1);
      },
      `Remove ${getElementFinalName(targetElement)}`,
    );

    const remainingElements = getPuzzle().allElements;

    return {
      content: [
        {
          type: "text",
          text: `Element "${getElementFinalName(targetElement)}" of type "${targetElement.config.type}" removed from position ${index + 1}.`,
        },
        {
          type: "text",
          text: `The remaining elements: ${remainingElements.map(getElementSummary).join(", ") || "none"}.`,
        },
        {
          type: "text",
          text: `The full spec of the removed element (verify that it's the element that you wanted to delete!): ${JSON.stringify(targetElement, null, 2)}`,
        },
      ],
    };
  },
);

const addCluesTool = new ToolImplementation(
  {
    definition: {
      name: "add_clues",
      title: "Add Sudoku Maker clues",
      description: "Add one or more clues to an existing element in the puzzle",
    },
  },
  z.object({
    elementId: z.number().int().describe("Element ID to insert the clues to"),
    operationDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable summary of what this operation does. " +
          "This helps the non-technical user understand the action they're approving.",
      ),
    insert: SmartDiscriminatedUnion(
      "type",
      AllElements.filter(({ clue }) => clue).map((element) =>
        z.object({
          type: z
            .literal(element.typeName)
            .describe(
              "The type of the target element. The operation will fail if they don't match.",
            ),
          clues: z.array(element.clue!.schema).describe("Clues to add"),
        }),
      ),
    ),
  }),
  ({ elementId, operationDescription, insert: { type, clues } }) => {
    const { index, targetElement } = getElementById(elementId, type);

    const elementType = getElementByTypeName(type);
    const cluesKey = elementType.clue!.key;

    updatePuzzle(
      (puzzle) => {
        (puzzle.allElements[index].config as any)[cluesKey].push(...clues);
      },
      (from, to) => {
        (to.allConstraints[index].config as any)[cluesKey] = (
          from.allConstraints[index].config as any
        )[cluesKey];
      },
      operationDescription ||
        `Add ${clues.length} clues of "${getElementFinalName(targetElement)}"`,
    );

    const updatedElement = getPuzzle().allElements[index];

    return {
      content: [
        {
          type: "text",
          text: `Added ${clues.length} clues of "${getElementFinalName(targetElement)}", there are ${(updatedElement.config as any)[cluesKey].length} clues in total now.`,
        },
      ],
    };
  },
);

const ClueCellsGroupFilter = z.array(CellIdPublic).meta({
  id: "ClueCellsGroupFilter",
  description:
    "A group of cells that indicates which clue to target. Only clues that affect ALL cells in the group will be targeted. " +
    "Please pass enough cells here to identify the clue uniquely unless you want to target multiple clues at the time.",
});
const updateCluesByCellGroups = (
  elementId: number,
  type: string,
  clueCellGroups: CellCoords[][],
  updateCallback: (
    clues: any[],
    matchingIndexGroups: number[][],
    allMatchingIndexes: Set<number>,
  ) => any[] | void,
  operationDescription: (
    targetElement: z.input<typeof ElementSchema>,
    affectedCluesCount: number,
  ) => string,
) => {
  const { index, targetElement } = getElementById(elementId, type);

  const elementType = getElementByTypeName(type);
  const cluesKey = elementType.clue!.key;
  const clues = ((targetElement.config as any)[cluesKey] as any[]).map(
    (clue, index) => ({
      index,
      clue,
      cells: elementType.clue!.getAffectedCells(clue),
    }),
  );
  const matchingClues = clueCellGroups.map((cells) =>
    clues.filter((clue) =>
      cells.every((cell1) =>
        clue.cells.some(
          (cell2) => cell2.row === cell1.row && cell2.column === cell1.column,
        ),
      ),
    ),
  );
  const allMatchingIndexes = new Set(
    matchingClues.flat().map(({ index }) => index),
  );

  if (allMatchingIndexes.size === 0) {
    const allClueCells = clues
      .map(({ cells }) => toShortCellNotation(cells))
      .map((cellsStr) => `(${cellsStr || "none"})`);

    throw new Error(
      `No matching clues found, please check the filters. There are clues with the following affected cells - you can target only these cells: ${allClueCells.join("; ") || "none"}`,
    );
  }

  updatePuzzle(
    (puzzle) => {
      const config = puzzle.allElements[index].config as any;
      const result = updateCallback(
        config[cluesKey],
        matchingClues.map((group) => group.map(({ index }) => index)),
        allMatchingIndexes,
      );
      if (result) {
        config[cluesKey] = result;
      }
    },
    (from, to) => {
      (to.allConstraints[index].config as any)[cluesKey] = (
        from.allConstraints[index].config as any
      )[cluesKey];
    },
    operationDescription(targetElement, allMatchingIndexes.size),
  );

  const updatedElement = getPuzzle().allElements[index];
  const updatedClues = (updatedElement.config as any)[cluesKey] as any[];

  return {
    index,
    targetElement,
    elementType,
    cluesKey,
    clues,
    matchingClues,
    allMatchingIndexes,
    updatedElement,
    updatedClues,
    messages: [
      ...matchingClues.map((matches, groupIndex) => ({
        type: "text" as const,
        text: `Cells group #${groupIndex + 1} - targeted ${matches.length} clues: ${JSON.stringify(matches.map(({ clue }) => clue))}`,
      })),
      {
        type: "text" as const,
        text: "If some of the targeted clues above don't match your expectations, please undo the operation immediately!",
      },
    ],
  };
};

const updateCluesTool = new ToolImplementation(
  {
    definition: {
      name: "update_clues",
      title: "Update Sudoku Maker clues",
      description:
        "Update properties of one or more clues of an existing element in the puzzle",
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
      "Updates to apply to the clues: " +
        "type - target element type name (should match the actual type or the operation will fail), " +
        "updates - parameters to update for every matching clue",
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

const removeCluesTool = new ToolImplementation(
  {
    definition: {
      name: "remove_clues",
      title: "Remove Sudoku Maker clues",
      description:
        "Remove one or more clues of an existing element in the puzzle",
    },
  },
  z.object({
    elementId: z.number().int().describe("Element ID to remove the clues from"),
    operationDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable summary of what this operation does. " +
          "This helps the non-technical user understand the action they're approving.",
      ),
    elementType: z
      .enum(
        AllElements.filter(({ clue }) => clue).map(({ typeName }) => typeName),
      )
      .describe(
        "The type of the target element. The operation will fail if they don't match.",
      ),
    clueCellGroups: z
      .array(ClueCellsGroupFilter)
      .describe(
        "Groups of cells that indicate which clues to remove. Each group triggers a separate removal.",
      ),
  }),
  ({
    elementId,
    elementType: type,
    clueCellGroups,
    operationDescription,
  }): CallToolResult => {
    const { allMatchingIndexes, updatedElement, updatedClues, messages } =
      updateCluesByCellGroups(
        elementId,
        type,
        clueCellGroups,
        (clues, _, allMatchingIndexes) =>
          clues.filter((_value, index) => !allMatchingIndexes.has(index)),
        (targetElement, affectedCluesCount) =>
          operationDescription ||
          `Remove ${affectedCluesCount} clues of "${getElementFinalName(targetElement)}"`,
      );

    return {
      content: [
        {
          type: "text",
          text: `Removed ${allMatchingIndexes.size} clues of "${getElementFinalName(updatedElement)}", there are ${updatedClues.length} clues in total now.`,
        },
        ...messages,
      ],
    };
  },
);

// region Custom constraints
const customConstraintsDocsTopics = [
  {
    name: "basics",
    description:
      "The basics of writing a custom constraint - start from this topic",
    // language=markdown
    docs: `
# Custom constraints

*Custom constraint* is a flexible tool to implement any user-defined logic in the puzzle
by writing JavaScript code snippets that perform the desired logic.

## **IMPORTANT - LLM GUIDELINES**

You (the LLM) **must** follow these rules when working the custom constraints:
- **You should prefer built-in functionality over writing custom code**:
  - **Before writing a custom constraint, STOP** - can your goal be achieved with **built-in puzzle elements**?
  - **Before writing a custom component, STOP** - can your goal be achieved with **built-in components**?
- **You should communicate every piece of logic** that you're implementing to the user.
  You should ask user's confirmation that you understood the logic correctly,
  and only then proceed with the implementation.
- **You should NOT communicate technical implementation details** to the user.
  The user doesn't care about the code, they don't care about internal formats,
  they don't care about the error messages. They only care about the puzzle's logic.
- **You should use only things described in this documentation**.
  You should **never make up** class names, helper functions, data formats.
  If something is not described in this documentation, it likely does not exist!
- You should use your best judgement of **how to define the input groups in the most convenient way**,
  and **communicate this convention to the user** who will use the constraint.
  In general, if the constraint is applied to the whole grid according to some pre-defined pattern,
  then it should be a global constraint; but if the placement and parameters of every clue is defined by user,
  then it's better to use input groups (rather than hardcoding the cells and parameters in the initialization code).

## Basics

### Composing custom constraints out of components and initialization code

Custom constraint consists of one or more *components* - basic units of logic,
and the *initialization code* - code snippet that adds the components to the puzzle.

The purpose of a component is to perform a piece of logic applied to a set of cells
(e.g. digits in the cells are different, digits in the cells are consecutive,
digits in the cells strictly increase, digits in the cells sum to a certain value, etc.).
The purpose of the initialization code is to define which components apply to which grid cells and with which parameters
(e.g. digits in r2c3, r2c4 and r3c4 are different, digits in r5c7 and r6c8 have a ratio of 1:3, etc.).

Complex constraints might use several components to achieve the desired logic.
For instance, the "killer cage" constraint (which is "digits in a cage are different and sum to the cage's clue")
could be combination of 2 components, each of them performing simpler logic:
1. The digits in the specified cells are different.
2. The digits in the specified cells sum to the specified value.

Constraints could be also a combination of the same component, applied to different cells.
For instance, the "German whispers" constraint
(which is "digits in any 2 consecutive cells on a green line have a difference of at least 5")
could be implemented as applying the "minimal difference" constraint to every pair of consecutive cells independently,
i.e. if the German whispers line is r2c2-r3c3-r4c4-r5c5, then the applied components would be:
- digits in r2c2 and r3c3 have a minimal difference of 5
- digits in r3c3 and r4c4 have a minimal difference of 5
- digits in r4c4 and r5c5 have a minimal difference of 5

### Standard components

Sudoku Maker supports the following *standard components* out of the box:
- \`BetweenComponent(name: string, endPoints: [CellId, CellId], midPoints: CellId[])\`
  The digits on all \`midPoints\` must be between the digits on the \`endPoints\`.
- \`ConsecutiveDigitsComponent(name: string, cells: CellId[])\`
  All digits within \`cells\` must make a set of consecutive digits, but may repeat as well.
- \`ConsecutiveDigitsSetComponent(name: string, cells: CellId[])\`
  All digits within \`cells\` must make a set of consecutive digits, without repeats.
- \`CountDigitComponent(name: string, digit: number, counterCell: CellId, targetCells: CellId[])\`
  The digit in \`counterCell\` must equal the amount of occurrences of \`digit\` in \`targetCells\`
- \`CountDigitsComponent(name: string, digits: DigitSet, counterCell: CellId, targetCells: CellId[])\`
  The digit in \`counterCell\` must equal the amount of occurrences of digits from \`digits\`.
- \`DifferenceComponent(name: string, difference: number | number[], cell1: CellId, cell2: CellId)\`
  The difference between the values at \`cell1\` and \`cell2\` must be exactly \`difference\`.
- \`DifferentCombinationsComponent(name: string, cellGroups: CellId[][])\`
  Every group of cells of \`cellGroups\` must have a distinct make-up of digits.
- \`DifferentDigitsComponent(name: string, cells: CellId[])\`
  Every cell of \`cells\` must have a different digit from the rest.
- \`DifferentGroupsComponent(name: string, groups: DigitSet[], cells: CellId[])\`
  Every cell of \`cells\` must have a digit from a different group from \`groups\`. E.g. if one group is 123, and one cell has a 1, the other cells cannot be 2 or 3.
  *Note:* currently only works properly when the groups do not overlap.
- \`DiverseGroupsComponent(name: string, groups: DigitSet[], cells: CellId[])\`
  A digit from every group from \`groups\` must appear at least once in \`cells\`, or from different groups if there are less cells than there are groups. 
  *Note:* currently only works properly when the groups do not overlap.
- \`ForbiddenCandidatesComponent(name: string, candidates: DigitSet, cellOrCells: CellId | CellId[])\`
  The value of \`cellOrCells\` cannot be any of \`candidates\`.
- \`GreaterThanComponent(name: string, lesserCell: CellId, greaterCell: CellId)\`
  The digit in \`lesserCell\` must be less than the one in \`greaterCell\`
  Aliases: *LessThanComponent*.
- \`GreaterThanOrEqualsComponent(name: string, lesserCell: CellId, greaterCell: CellId)\`
  The digit in \`greaterCell\` must be greater than or equal to the one in \`lesserCell\`
- \`HouseComponent(name: string, cells: CellId[])\`
  Every digit must appear exactly once in \`cells\`.
- \`IndexComponent(name: string, valueToIndex: number, indexerCell: CellId, cells: CellId[])\`
  The value of \`indexerCell\` must be the (1-based) index of an appearance of \`valueToIndex\` in the sequence of cells \`cells\`.
- \`MaxDigitCountComponent(name: string, value: number, maxCount: number, cells: CellId[])\`
  The digit \`value\` must appear at most \`maxCount\` times in \`cells\`.
- \`MaximumDifferenceComponent(name: string, maxDifference: number, cell1: CellId, cell2: CellId)\`
  The difference between the values of \`cell1\` and \`cell2\` must be at most \`maxDifference\`.
- \`MinimumDifferenceComponent(name: string, minDifference: number, cell1: CellId, cell2: CellId)\`
  The difference between the values of \`cell1\` and \`cell2\` must be at least \`minDifference\`.
- \`NegativeBetweenComponent(name: string, endPoints: [CellId, CellId], midPoints: CellId[])\`
  The digits on all \`midPoints\` must not be between the digits on the \`endPoints\`.
- \`NegativeDifferenceComponent(name: string, differences: number[], cell1: CellId, cell2: CellId)\`
  The difference between the values of \`cell1\` and \`cell2\` must not be any of \`differences\`.
- \`NegativeIndexComponent(name: string, valueToNotIndex: number, indexerCell: CellId, cells: CellId[])\`
  The value of \`indexerCell\` must *not* be the (1-based) index of \`valueToNotIndex\` in the sequence of cells \`cells\`.
- \`NegativeRatioComponent(name: string, ratios: number[], cell1: CellId, cell2: CellId)\`
  The ratio of the values of \`cell1\` and \`cell2\` (either way) must not be any of \`ratios\`.
- \`NegativeSumComponent(name: string, sums: number[], cells: CellId[])\`
  The digits within \`cells\` must not sum to any of \`sums\`.
- \`PairComponent(name: string, filterOrMapping: ((d1: number, d2: number) => boolean) | DigitSet[], cell1: CellId, cell2: CellId)\`
  The digits \`digit1\` and \`digit2\` in \`cell1\` and \`cell2\` are valid when \`filterOrMapping(digit1, digit2)\` evaluates to \`true\`, or when \`filterOrMapping[digit1].has(digit2)\`.
  Aliases: *AsymmetricalPairComponent*.
- \`PredefinedCandidatesComponent(name: string, candidates: DigitSet, cellOrCells: CellId[])\`
  The value of \`cellOrCells\` must be one of \`candidates\`.
- \`ProductComponent(name: string, productOrProducts: number | number[], cells: CellId[])\`
  The product of the digits in \`cells\` must equal to \`productOrProducts\`.
- \`RatioComponent(name: string, ratioOrRatios: number | number[], cell1: CellId, cell2: CellId)\`
  The ratio of the values of \`cell1\` and \`cell2\` (either way) must equal \`ratioOrRatios\`.
- \`RequiredDigitsComponent(name: string, values: number[], cells: CellId[])\`
  Every digit of \`values\` must be assigned a unique cell of \`cells\`. Requiring a digit to repeat can be achieved by repeating that digit in \`values\`.
- \`RequiredGroupsComponent(name: string, groups: DigitSet[], cells: CellId[])\`
  For every group from \`groups\`, a digit must appear at least once in \`cells\`. E.g. If the groups are 123, 456 and 789, then \`cells\` must be at least 3 cells, and one digit of every group is assigned to a cell. 
  *Note:* currently only works properly when the groups do not overlap.
- \`SameDigitComponent(name: string, cells: CellId[])\`
  Every cell of \`cells\` must have the same value.
- \`SameGroupComponent(name: string, groups: DigitSet[], cells: CellId[])\`
  Every cell of \`cells\` must have a digit from the same group within \`groups\`. E.g. if the groups are the evens and the odds, then either every cell is even, or every cell is odd. 
  *Note:* currently only works properly when the groups do not overlap.
- \`SameSumComponent(name: string, groups: { name: string, cells: CellId[], weights?: Map<CellId, number>, asNumber?: boolean }[])\`
  Every group of cells from \`groups\` must sum to the same value. Set \`asNumber\` to true, to interpret that group as a sequence that spells out a number (e.g. for arrows), where the least significant digit is at index 0. Use \`weights\` to set a custom weight for specific cells (see *WeightedSumComponent* for details)
- \`SandwichSumComponent(name: string, sum: number, sandwichDigits: [number, number], cells: CellId[])\`
  Along \`cells\` there must be a sequence of values starting with one of \`sandwichDigits\`, then some values summing to \`sum\`, then another digit from \`sandwichDigits\`. 
  *Note:* currently requires all cells to be different.
- \`SequenceComponent(name: string, cells: CellId[])\`
  Digits along \`cells\` must increase or decrease by the same amount (or stay the same)
- \`SkyscraperComponent(name: string, amount: number, cells: CellId[])\`
  Digits along \`cells\` represent skyscrapers, blocking cells further along the sequence. The amount of skyscrapers seen from the start must equal \`amount\`.
- \`SumComponent(name: string, sumOrSums: number | number[], cells: CellId[])\`
  The digits in \`cells\` must sum to (one of) \`sumOrSums\`. If a cell appears N times in \`cells\`, the value in that cell is counted N times.
- \`WeakLinkComponent(name: string, cell1: CellId, value1: number, cell2: CellId, value2: number)\`
  If \`cell1\` is set to \`value1\`, \`cell2\` must not be \`value2\`. Similarly, if \`cell2\` is set to \`value2\`, \`cell1\` cannot be \`value1\`.
- \`WeakLinksComponent(name: string, cells1: CellId | CellId[], value1: DigitSet, cells2: CellId | CellId[], value2: DigitSet)\`
  If any of \`cells1\` is set to one of \`values1\`, all of \`cells2\` cannot be any of \`values2\`. Similarly, if any of \`cells2\` is set to one of \`values2\`, all of \`cells1\` cannot be any of \`values1\`.
- \`WeightedSumComponent(name: string, sumOrSums: number | number[], cellWeightMapping: Map<CellId, number>)\`
  The sums of every value of cell X in \`cellWeightMapping\`, multiplied by \`cellWeightMapping.get(X)\`, must sum to (one of) \`sumOrSums\`.
  *Note:* to avoid floating point inaccuracies breaking this component, use whole numbers as weights. In case you want to do something like x+y/3=5, multiply it all such that you get 3x+y=15
- \`XSumComponent(name: string, sum: number, xCell: CellId, cells: CellId[])\`
  The first X digits along \`cells\` must sum to \`sum\`, where X is the value of \`xCell\`.

### Initialization code, input groups and global constraints

Initialization code would add instances of the components to the puzzle using the \`addConstraintComponent\` method,
e.g. the killer cage implementation could look like the following:
\`\`\`
for (const { cells, value } of input.groups) {
  const name = 'killer cage in ' + helpers.naming.getCellsDescription(cells);
  puzzle.addConstraintComponent(new DifferentDigitsComponent(name, cells));
  puzzle.addConstraintComponent(new SumComponent(name, Number(value), cells));
}
\`\`\`

The example above uses *input groups* to define where to apply the custom constraint and with which parameters.
Input groups are objects defined by the puzzle constructor in the UI to specify where to apply the constraint.
Each input group consists of an array of \`cells\` in the grid and optional string \`value\` that describes the constraint's parameters in a user-defined way.
The initialization code should go over all input groups (they are available as \`input.groups\` global variable),
interpret them according to the pre-defined convention, and add components to the grid accordingly.

The convention of how the input groups define where to apply constraint could be different depending on the constraint.
It could be as simple as "each input group corresponds to a constraint with the specified cells and clue value",
like in the killer cage example above - input group's cells are the single cage's cells, input group's value is the sum of the cage.
But that's not the only possible convention.
For instance, if the constraint should be applied to a straight line that starts from a certain cell and goes until the grid's border,
then the input group could define only the first 2 cells of the line, and the initialization code will calculate the rest of the cells according to this direction.
Or, if the constraint accepts multiple parameters (e.g. multiple digit groups),
then the \`value\` will contain all these parameters in a pre-defined format (e.g. comma-separated list),
and the initialization code will parse this format into individual values.

**Note:** Sudoku Maker will execute the initialization code after every user interaction in the UI.
This includes running the code when the user is in the middle of defining the input groups, for instance:
- When the user created a new input group, but didn't add any cell yet and didn't type the value yet.
- When the user started adding the cells to the input group, but didn't finish yet.
- When the user started to type the value, but didn't finish yet.

Thus, it's considered a good practice to validate the input groups in the initialization code,
and just skip the group completely if the input group doesn't have the necessary info yet.
For instance, the killer cage example above could be improved as following:
\`\`\`
for (const { cells, value } of input.groups) {
  if (cells.length === 0) {
    // skip the constraint if the cells are not defined yet
    continue;
  }
  const name = 'killer cage in ' + helpers.naming.getCellsDescription(cells);
  puzzle.addConstraintComponent(new DifferentDigitsComponent(name, cells));
  if (!value) {
    // skip the sum component if the cage's sum is not defined, otherwise we'll get \`NaN\`
    continue;
  }
  puzzle.addConstraintComponent(new SumComponent(name, Number(value), cells));
}
\`\`\`

However, using input groups in not a must - the constraint could just hardcode where and how to define the components in the initialization code.
Constraints that have no input groups are called *global constraints*.
The common use-case for that is when the constraint is applied to all cells of the grid according to certain pattern,
e.g. to every row or column, to every diagonal, to every pair of orthogonally adjacent cells,
to every pair of cells chess knight's move apart, etc.
In this case, the initialization code would use loops and geometry helpers to go over all relevant cells.
For instance, the implementation of anti-knight constraint ("digits separate by chess knight's move do not repeat") could look like the following:
\`\`\`
for (const cells of helpers.geometry.getAllKnightMovePairs()) {
  puzzle.addConstraintComponent(new DifferentDigitsComponent(
    'anti-knight at ' + helpers.naming.getCellsDescription(cells),
    cells
  ));
}
\`\`\`

Obviously, constraints could also combine globally-defined component rules with input groups.
For instance, the implementation of the classic sudoku rules ("digits don't repeat in a row, column or box")
could use input groups to define the sudoku boxes and use helpers to go over rows and columns:
\`\`\`
for (const [index, cells] of Array.from(helpers.geometry.getAllRows()).entries()) {
  puzzle.addConstraintComponent(new HouseComponent(\`row \${index + 1}\`, cells));
}
for (const [index, cells] of Array.from(helpers.geometry.getAllColumns()).entries()) {
  puzzle.addConstraintComponent(new HouseComponent(\`column \${index + 1}\`, cells));
}
for (const [index, { cells }] of input.groups.entries()) {
  if (cells.length === puzzle.spec.digitCount) {
    puzzle.addConstraintComponent(new HouseComponent(\`box \${index + 1}\`, cells));
  }
}
\`\`\`

When you (the LLM) create a new custom constraint, you should use your best judgement
of how to define the input groups in the most convenient way,
and communicate this convention to the user who will use the constraint.

## Custom constraint's visuals

Custom constraints control only the logic of the puzzle, they don't have any visuals on the grid.
If the user wants to add visual indications for the user-defined constraint,
they have to achieve it by manually creating corresponding graphics with cosmetic elements.

You (the LLM) should be proactive to suggest creating a visual indication for a custom constraint.
You should be proactive to notice when the constraint's input groups and the relevant visual indications are out sync.
Use your best judgement to understand which part (the input groups or the visual clues) are up-to-date, and sync the other parts.
If you're not confident enough about which part is up-to-date and which is outdated, just ask the user!
**ALWAYS** notify the user that you're synchronizing the input groups with the corresponding visual clues,
e.g. "I see that you added 3 new input groups to constraint XXX, I will draw the corresponding lines in the grid"
or "I see that you moved the circle for constraint XXX from r2c5 to r3c6, I will update the input groups respectively".

When creating new elements for custom constraint's visual clues, make sure to name the element properly,
e.g. "Product cages - visuals" instead of the default "Cosmetic symbols".

## Custom components

If the constraint cannot be achieved by using standard components only,
one could write a custom component that uses JavaScript to perform user-defined logic.

Fetch the "custom components" topic to learn more.

**Important: think twice before creating a custom component! Are you sure that standard components are not enough for your goal?**

## Internal data structures, types, classes and helpers available in custom constraints

**Data structures and format that Sudoku Maker uses in custom constraints
are different from the data structures and formats used by the MCP server tools.**

The key differences are described below.

### Cell IDs and the coordinate system

Sudoku Maker uses unique numeric IDs to reference cells. It uses it everywhere:
- In the input groups - \`input.groups[N].cells\` is an array of cell IDs.
- In the arguments of standard components - the \`CellId\` type in the documentation above
  refers to numeric cell IDs in this format.
- In helper function results, e.g. \`helpers.geometry.getAllRows()\` returns \`Generator<CellId[]>\`.
- In many other places.

You don't need to know what exactly is this format, just use tools that already produce and accept these IDs.

However, if absolutely necessary, you can create a cell ID from coordinates by calling the \`getIdFromCoords\` helper:
\`helpers.cellIds.getIdFromCoords(coords: { x: number, y: number }): CellId\`.
Note that it uses **zero-based coordinates system**: x = 0 is the leftmost column of the grid, y = 0 is the topmost row.
So \`helpers.cellIds.getIdFromCoords({ x: 0, y: 0 })\` will return the ID of r1c1,
\`helpers.cellIds.getIdFromCoords({ x: 4, y: 7 })\` will return the ID of r8c5.
There is also a reverse function for getting coordinates (also zero-based) by cell ID -
\`helpers.cellIds.getCoordsFromId(cell: CellId): { x: number, y: number }\`.

There are helpers for getting human-readable descriptions of cells by IDs:
- \`helpers.naming.getCellName\` - get description of one cell.
- \`helpers.naming.getCellsDescription\` - get description of cells array.

### \`DigitSet\`

\`DigitSet\` is a class that holds a set of digits that allows performing operations on them.
Sudoku Maker uses \`DigitSet\` to operate with cell candidates,
and also accepts it in some component arguments, like \`PredefinedCandidatesComponent\`.

The easiest way to create a \`DigitSet\` object is from an array of digits, e.g. \`DigitSet.from([1, 3, 6])\`.

Fetch the "DigitSet" topic if you need to learn more
(you likely don't need it unless you work on a custom component).
    `,
  },
  {
    name: "custom components",
    description: "How to write a custom component",
    docs: `TBD...`,
  },
  {
    name: "DigitSet",
    description: "How to work with DigitSet class",
    // language=markdown
    docs: `
\`DigitSet\` is a class that holds a set of digits that allows performing operations on them.
Sudoku Maker uses \`DigitSet\` to operate with cell candidates,
and also accepts it in some component arguments, like \`PredefinedCandidatesComponent\`.

**Constructing \`DigitSet\`**:
- From array of digits: \`DigitSet.from([1, 3, 6])\`.
- Empty set: \`new DigitSet()\`.
- Clone another set: \`new DigitSet(otherSet)\`.
- From cell candidates (from a custom component): \`puzzle.getCandidates(cellId)\`.

The interface of the class is a bit similar to the built-in JavaScript \`Set\` class,
but also has a lot of differences from it.

**Here's what you can do with a \`DigitSet\`**:
- Iterate over digits in it: \`for (const digit of set) ...\`.
  The digits will be ordered from small to large when iterating.
- Convert to array of digits, like any other iterable collection: \`Array.from(set)\` or \`[...set]\`.
  The digits will be ordered from small to large in the resulting array.
- Check if a set has a digit: \`set.has(5)\`.
- Get the items count in a set: \`set.size\`.
- Get the smallest digit in a set (or undefined if there are no digits): \`set.getSmallestDigit()\`.
- Get the largest digit in a set (or undefined if there are no digits): \`set.getLargestDigit()\`.
- Add a digit to a set (in place): \`set.add(3)\`.
- Remove a digit from a set (in place): \`set.delete(3)\`.
- Check if 2 sets equal to each other: \`set1.equals(set2)\`.
- Add all digits of \`set2\` to \`set1\` (in place): \`set1.union(set2)\`.
- Remove all digits of \`set2\` from \`set1\` (in place): \`set1.subtract(set2)\`.
- Intersect 2 sets - leave only those digits of \`set1\` that are also present in \`set2\` (in place in \`set1\`): \`set1.intersect(set2)\`.
- Check if one set is a subset of another (i.e. if all digits of one set are present in another set):
  \`set1.isSubsetOf(set2)\` or \`set2.isSupersetOf(set1)\`.
- Check if 2 sets have at least 1 common digit: \`set1.intersects(set2)\`.
    `,
  },
];
const getCustomConstraintsDocsTool = new ToolImplementation(
  {
    definition: {
      name: "custom_constraints_docs",
      title: "Read Sudoku Maker custom constraints documentation",
      description:
        "Call this tool **once per topic** to learn how to create custom constraints and custom components. " +
        'Start from the "basics" topic, and then fetch them on per-need basis. ' +
        "Do not call this tool if you're not going to work on custom constraints.",
    },
    global: true,
  },
  z.object({
    topic: z.union(
      customConstraintsDocsTopics.map(({ name, description }) =>
        z.literal(name).describe(description),
      ),
    ),
  }),
  ({ topic }) => ({
    content: [
      {
        type: "text",
        text: customConstraintsDocsTopics
          .find(({ name }) => name === topic)!
          .docs.trim(),
      },
    ],
  }),
);
// endregion
// endregion

// region History
// TODO: tell which action was undone, API to get the undo/redo history, tell what have changed afterwards
const undoTool = new ToolImplementation(
  {
    definition: {
      name: "undo",
      title: "Undo the last action in the puzzle",
      description: "Undo the last action in the puzzle",
    },
  },
  z.object({}),
  () => {
    const before = getPuzzle();
    window.Api.triggerAction("undo");
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: "Done.",
        },
        {
          type: "text",
          text: diffCells(before, after, true),
        },
      ],
    };
  },
);

const redoTool = new ToolImplementation(
  {
    definition: {
      name: "redo",
      title: "Redo the last action in the puzzle",
      description: "Redo the last action in the puzzle",
    },
  },
  z.object({}),
  () => {
    const before = getPuzzle();
    window.Api.triggerAction("redo");
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: "Done.",
        },
        {
          type: "text",
          text: diffCells(before, after, true),
        },
      ],
    };
  },
);

const reversibleActionNote = `Note: this action could be undone and redone by calling "${undoTool.name}" and "${redoTool.name}" tools, similar to any other action in the puzzle`;
// endregion

const clearGridTool = new ToolImplementation(
  {
    definition: {
      name: "clear_grid",
      title: "Clear the grid",
      description: `Clear all (non-given) digits and markings in the puzzle grid cells. ${reversibleActionNote}`,
    },
  },
  z.object({}),
  () => {
    window.Api.triggerAction("clearGrid");

    return {
      content: [
        {
          type: "text",
          text: "Done.",
        },
      ],
    };
  },
);

// region Solver
const diffCells = (
  { cells: cells1Map }: z.input<typeof PuzzleSchema>,
  { cells: cells2Map }: z.input<typeof PuzzleSchema>,
  reportNoChanges = false,
) => {
  const cells1 = cells1Map.flat();
  const cells2 = cells2Map.flat();

  const groupedDiffMap: Record<string, string[]> = {};

  for (const [index, { row, column, ...cell1 }] of cells1.entries()) {
    const { row: _row, column: _column, ...cell2 } = cells2[index];

    const [empty1, empty2] = [cell1, cell2].map(
      (cell) =>
        !cell.given &&
        cell.value === undefined &&
        cell.valid &&
        !cell.candidates.length &&
        !cell.cornerPencilMarks.length &&
        !cell.colors.length,
    );

    const changes: string[] = [];
    let dumped = false;
    const dump = JSON.stringify(cell2);

    if (empty1 !== empty2) {
      if (empty2) {
        changes.push("turned empty");
      } else {
        dumped = true;
        changes.push(`turned into ${dump}`);
      }
    } else if (cell1.given !== cell2.given) {
      if (cell2.given) {
        changes.push(`placed a given ${cell2.value}`);
      } else {
        dumped = true;
        changes.push(`removed the given, new state is ${dump}`);
      }
    } else if (cell1.value !== cell2.value) {
      if (typeof cell2.value === "number") {
        changes.push(
          `placed a ${cell2.given ? "given" : "value"} ${cell2.value}`,
        );
      } else {
        dumped = true;
        changes.push(`removed the value, new state is ${dump}`);
      }
    } else {
      const diffCandidates = (c1: number[], c2: number[], word: string) => {
        const newCandidates = c2.filter((c) => !c1.includes(c));
        const removedCandidates = c1.filter((c) => !c2.includes(c));

        if (!newCandidates.length && !removedCandidates.length) {
          return;
        }

        if (!c2.length) {
          changes.push(`${word} turned empty`);
          return;
        }

        const dump = `${word} turned into ${JSON.stringify(c2)}`;

        if (!newCandidates.length && removedCandidates.length <= c2.length) {
          changes.push(`${dump} (removed ${removedCandidates.join(", ")})`);
          return;
        }

        if (!removedCandidates.length && newCandidates.length <= c1.length) {
          changes.push(`${dump} (added ${newCandidates.join(", ")})`);
          return;
        }

        changes.push(dump);
      };

      diffCandidates(cell1.candidates, cell2.candidates, "candidates");
      diffCandidates(
        cell1.cornerPencilMarks,
        cell2.cornerPencilMarks,
        "corner marks",
      );
      diffCandidates(cell1.colors, cell2.colors, "colors");
    }

    if (!dumped && cell1.valid !== cell2.valid) {
      changes.push(cell2.valid ? "turned valid" : "turned invalid");
    }

    if (changes.length) {
      (groupedDiffMap[changes.join(", ")] ??= []).push(
        toShortCellNotation({ row, column }),
      );
    }
  }

  const diff = Object.entries(groupedDiffMap).map(
    ([changes, positions]) => `- ${positions.join(", ")}: ${changes}`,
  );

  return diff.length
    ? ["Grid cells changed:", ...diff].join("\n")
    : reportNoChanges
      ? "Grid cells didn't change"
      : "";
};

const singleStepTimeout = 5000;
const doLogicalStepTool = new ToolImplementation(
  {
    definition: {
      name: "logical_step",
      title: "Do a single logical step",
      description: `Do a single logical step in the puzzle and wait for its results. ${reversibleActionNote}`,
    },
    timeout: singleStepTimeout + 1000,
  },
  z.object({}),
  async () => {
    const before = getPuzzle();
    window.Api.triggerAction("doSingleLogicalStep");
    const { message } = await waitForSolver(singleStepTimeout);
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: diffCells(before, after, true),
        },
      ],
    };
  },
);

const solverMaxTimeout = 30000;
const doAllLogicalStepsTool = new ToolImplementation(
  {
    definition: {
      name: "all_logical_steps",
      title: "Solve step-by-step, logically",
      description: `Do all possible logical steps in the puzzle. ${reversibleActionNote} (all logical steps will be undone/redone at once)`,
    },
    timeout: solverMaxTimeout + 1000,
  },
  z.object({}),
  async () => {
    const before = getPuzzle();
    window.Api.triggerAction("doAllLogicalSteps");
    const { message } = await waitForSolver(solverMaxTimeout);
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: diffCells(before, after, true),
        },
      ],
    };
  },
);

const bruteForceSolveTool = new ToolImplementation(
  {
    definition: {
      name: "brute_force_solve",
      title: "Find all possible solutions and valid candidates",
      description: `
        Run the brute force solver for the puzzle - find all possible solutions and valid candidates.
        This is the only reliable way to know solutions count to the puzzle and the exact list of valid candidates for every cell
        (unless the puzzle is already known to be broken or solved with 1 unique solution).
        ${reversibleActionNote}
      `,
    },
    timeout: solverMaxTimeout + 1000,
  },
  z.object({}),
  async () => {
    const before = getPuzzle();
    window.Api.triggerAction("findSolutions");
    const { message } = await waitForSolver(solverMaxTimeout);
    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        {
          type: "text",
          text: diffCells(before, after, true),
        },
      ],
    };
  },
);

const waitForSolverTool = new ToolImplementation(
  {
    definition: {
      name: "wait_for_solver",
      title: "Wait for the solver",
      description: "Wait for the solver in the given tab to finish running",
    },
    timeout: solverMaxTimeout + 1000,
  },
  z.object({}),
  async () => {
    const { message } = await waitForSolver(solverMaxTimeout);

    return {
      content: [
        {
          type: "text",
          text: message,
        },
        // TODO: describe the changes
      ],
    };
  },
);

const stopSolverTool = new ToolImplementation(
  {
    definition: {
      name: "stop_solver",
      title: "Stop the solver",
      description: "Stop the solver in the given tab if it's still running",
    },
  },
  z.object({}),
  () => {
    window.Api.triggerAction("stopSolver");

    return {
      content: [
        {
          type: "text",
          text: "The solver has been stopped.",
        },
      ],
    };
  },
);
// endregion

const globalSchema = z.toJSONSchema(z.globalRegistry, { io: "input" }).schemas;
for (const schema of Object.values(globalSchema)) {
  delete schema.$schema;
  delete schema.id;
}

// language=markdown
const instructions = `
# Sudoku Maker software description

${(document.head.querySelector('meta[name="description"]') as HTMLMetaElement)?.content ?? ""}

Sudoku Maker is a puzzle setting (creation) site with automated solving capabilities.
While the main focus of the software is variant sudoku,
it allows creating any puzzle type that involves placing digits into cells of a rectangular grid.

The common features:
- Create a puzzle with the specified grid size.
- Edit puzzle metadata (title, author, rules description, etc.)
- Add given digits to the grid (i.e. cell digits that are part of the puzzle definition).
- Add other elements (a.k.a. constraints, clues) that define the puzzle, including the genre definition.
  Some elements only define the logic of the puzzle (e.g. "digits cannot repeat in a row"),
  some elements are purely cosmetic (a.k.a. decorative, visual) - just drawing something in the grid,
  some elements have both logic and associated visuals
  (e.g. "digits on an arrow line sum to the digit in the attached circle" -
  the digits sum is the logic, and the arrow line and the circle are visual indications of which cells are affected).
- Test-solve the puzzle while constructing it - put logically deduced information (based on existing clues) into the grid:
  cell values, possible candidates, corner marks, colors that usually specify relations between certain cells.
- Automated solver tools - perform logic steps based on logical puzzle elements,
  find/count all solutions to the puzzle (all valid combinations of digits in the cells).
  As a computer solving tool, it recognizes only built-in elements -
  it cannot perform logic based on free-text rules description or based on cosmetic-only elements.
  The automated solver can handle only digit-based puzzles - it cannot make deductions/checks on shading, lines, etc.
  (unless they are somehow represented by digits in the cells).
  The solver will write all possible candidates for every cell (based on eliminations it did so far) as center marks,
  write a final value into the cells that have only one possible candidate, and declare that the puzzle is broken if a cell has no valid candidates at all.
  The result of performing logical deductions will be narrowing down the list of candidates within the cells.
  The result of finding all solutions to the puzzle will also be marking every cell with all possible candidates.
  The difference between the logical solver and the solutions finder is that
  the candidates list produced by the solutions finder is 100% accurate,
  while the logical solver might miss some candidate eliminations that are too hard to deduce logically.

**Terminology:**
- **Element**: An entry in the Elements panel (e.g., "Arrows", "Regions").
  Each element corresponds to one item in the puzzle's \`allElements\` array and may contain multiple clues.
- **Clue**: An individual instance placed on the grid (e.g., one arrow, one cage).
  For element types that support multiple placements, clues are stored in an array within the element's configuration.
- **Constraint**: Restrictions that *element*'s logic enforces to the digits in the grid.

Users may use "constraint", "clue", or "element" interchangeably. Infer meaning from context.

Sudoku Maker has a wide range of popular variant sudoku constraints built in,
but it's flexible to support any constraint that the setter can imagine.
The visual representation of user-defined constraints is achieved
by combining multiple elementary cosmetic shapes (e.g. lines, circles, texts, etc.).
The logical part of user-defined constraints is achieved by creating a "custom constraint" element -
a set of JavaScript snippets that implement the logical deductions and validation of the constraint.

The end goal is to create a puzzle that has exactly one solution, i.e. exactly one option of which digit to put in each cell.
Puzzles that have no solutions at all are called broken.
Puzzles that have more than one solution are called non-unique (which is sometimes referred as "broken" as well).

The typical process of setting a puzzle is to alternate steps of adding given digits and clues to the puzzle,
and making all possible logical deductions based on the existing clues, until all digits of the puzzle are deduced.

Different setters have different preferences regarding how much to rely on the automatic solver during puzzle construction:
some of them will make the deductions only manually and only use the automated solver to check that they didn't accidentally break the puzzle yet,
some setters will only use the automated solver (logical or solutions finder) to make the deductions,
and others will combine both approaches.

# MCP server description and instructions

This MCP server provides programmatic access to Sudoku Maker puzzles open in browser tabs.
It communicates with the browser tabs to read and modify puzzle state.

The typical user of this MCP server is not a technical person:
- The user likely doesn't know (and doesn't care) what is LLM, MCP server or MCP tool, and how they work.
- The user interacts with Sudoku Maker only through its UI, he/she doesn't know (and doesn't care)
  how Sudoku Maker is implemented internally, which data structures it uses and which API it provides.
- The user is not a software developer. They don't know how write and read the code,
  so they don't know how to write Sudoku Maker custom constraint and how it works internally.

But, the typical user IS an expert in setting and solving pencil puzzles:
- They know the implications of certain puzzles genres and constraints.
- They know how to perform logical deductions. They can understand which logic is correct and which isn't.
- They can do the above 1000 times better than you can.

Please assume that you're talking to a typical user described above
until you have a clear indication that it's not so.

This means the following **division of responsibilities**:
- **Technical implementation (your responsibility)**: Handle all coding, debugging, data structures, and MCP protocol details independently.
  Don't expose these technical details to the user.
- **Puzzle logic (collaborate)**: When working with puzzle rules and logical deductions, consult with the user to verify your understanding.
  Discuss what constraints should enforce, work through examples together, and defer to their expertise.
- **Key principle**: You're the technical expert, they're the puzzle expert.
  Hide implementation details, but collaborate on puzzle logic - they understand solving and setting far better than you do.

If calling a tool results in an error, handle this error according to the principles above.
For instance, handle technical errors (invalid parameters, schema issues, browser tabs that got new ID after refreshing)
silently without mentioning them to the user.

YOUR GOAL is to work in synergy with the user, combining the best of both worlds:
your skills of controlling Sudoku Maker software and writing/debugging the code,
and user's skills of setting a puzzle.
Help the user writing custom constraints when they ask for that,
help automating routine tasks during the puzzle creation.

# Technical info

## Browser tabs lifecycle

Each browser tab has a unique numeric ID assigned when opened/refreshed.
Tab ID order does **not** correspond to visual arrangement in browser windows.

The user may close, refresh, and duplicate tabs at any point.
When a tab is refreshed, it receives a new ID (treat it as closing and reopening).

### Error handling

When a tool request targets a non-existent tab ID (closed/refreshed),
the error response includes the current tabs list.

- **Handle silently:** There's exactly one tab with the matching title (likely a refresh).
- **Ask the user:** Multiple tabs share the title, OR no tabs match, OR you're uncertain what happened.
  - When asking, also suggest renaming the puzzles to make tab names distinguishable.

**Examples:**

*Scenario 1 - Handle silently:*
- You were working with "My Puzzle" on Tab 5
- Tab 5 no longer exists
- New tabs list shows only Tab 8: "My Puzzle - Sudoku Maker"
- Action: Use Tab 8, continue working

*Scenario 2 - Ask the user:*
- You were working with "Untitled puzzle" on Tab 3
- Tab 3 no longer exists  
- New tabs list shows Tab 5 (hidden) and Tab 7 (active), both "Untitled puzzle - Sudoku Maker"
- Action: "I see you have two puzzles open with the same name. Should I work with the one you're currently viewing?" 
  - If they confirm, use the active tab
  - Suggest renaming after completing their request to avoid this in the future

### Duplicate tabs

Duplicated tabs have different IDs but the same puzzle ID.
Users typically duplicate tabs to explore different scenarios independently.
When you first notice multiple tabs with identical titles (especially "Untitled puzzle - Sudoku Maker"),
proactively suggest renaming the puzzles to avoid confusion.

## Coordinate system

People in the puzzle setting/solving community usually refer to grid cells by its row and column number,
counting rows from top to bottom and columns from left to right,
i.e. the topmost leftmost cell in the grid would be "row 1 column 1".
People might refer to clues that are placed right outside the grid (e.g. to a sandwich sum clue)
with "imaginary" cell coordinates, e.g. "row 0 column 6" for a clue located above column 6
or "row 3 column 10" for a clue located to the right of row 3 of a 9x9 grid.
The above is also how this MCP server refers to grid cells, and puzzle elements that involve these cells.

It's common to use "Snider notation" to refer to a cell - using "r" for "row" and "c" for "column".
For instance, cell at row 7 column 2 would be "r7c2".
Please use this notation when talking to the user, unless they explicitly tell that they have other preference.

The "natural" coordinate system above (starting to count rows and columns from 1) applies only to the grid cells.
But if you're referring to an arbitrary point of the grid (that is not necessary cell center/corner/edge),
the coordinate system's base (the point with x=0, y=0) is the topmost leftmost **corner** of the grid,
going to the right ("x" coordinates) and bottom ("y" coordinates) from there.
So it's similar to the cell naming system, but slightly offset.
**Examples:**
- Cell r1c1 (top-left): spans from point (0, 0) to (1, 1), center at (0.5, 0.5)
- Cell r2c6: spans from point (5, 1) to (6, 2), center at (5.5, 1.5)
  - Why? Row 2 → y starts at 1, Column 6 → x starts at 5.

When to use each system:
- **In MCP tool calls:** Use the coordinate system specified in each tool's JSON schema:
  - Cell coordinates (row/column) for given digits, cell marks,
    and puzzle elements that reference specific cells (which is almost every element).
  - Point coordinates (x, y) for cosmetic elements that need arbitrary positioning.
- **When talking to the user:** Always use cell coordinates and Snider notation (e.g. r7c2),
  even when referring to arbitrary points on the grid.
  Describe such points relative to nearby cells (e.g., "on the edge between r3c4 and r3c5" or "in the center of r2c6")
  rather than using numeric x/y coordinates.


## Element types and clues:

Elements fall into three categories based on how their clues are managed:

1. **Single-clue elements**: Only one clue of this type can exist in a puzzle
   - Examples: "Rows and columns", "Positive diagonal", "Antiking"
   - Adding the element automatically adds the single clue
   - No separate clue management needed

2. **Multi-clue elements**: Support placing multiple clues on the grid
   - Examples: "Arrows", "Thermometers", "Killer cages", "Renban lines"
   - Use \`${addCluesTool.name}\`, \`${updateCluesTool.name}\`, \`${removeCluesTool.name}\` tools to manage individual clues
   - Clues are stored in arrays within the element's configuration (e.g., \`lines\`, \`cages\`, \`clues\`)

3. **Special-case elements**: Have clues conceptually, but use specialized tools
   - **Given digits**: Each given digit is conceptually a clue, but use \`${updateGivenDigitsTool.name}\` tool instead. Given digits are stored in individual cells, not in the element's configuration.
   - **Regions**: Each region is conceptually a clue, but defined by a grid mapping where each cell has a region number. Update via \`${updateElementTool.name}\` with the full region grid.

## MCP tool call transparency

Many tools include "tabDescription" and "operationDescription" parameters.
These are not for you - they're shown to the user in the JSON dump when they approve/reject tool calls.
Always populate these with clear, non-technical descriptions of what you're doing and which of the tabs you're targeting,
since the user sees the raw JSON but may not understand technical parameters like numeric tab IDs or element config specifications.

## JSON schemas

Here's the full list of all JSON schemas used in this MCP server
(use it to understand tool params and responses better):
${JSON.stringify(globalSchema)}
`.trim();
const instructionsTool = new ToolImplementation(
  {
    definition: {
      name: "server_instructions",
      title: "MCP server usage instructions",
      description:
        "# Server instructions\n\n" +
        "This tool exists solely to provide general MCP server documentation.\n" +
        "Some MCP clients only receive tool metadata from MCP servers, making this the only available method for communicating server-wide instructions.\n" +
        "Do not call this tool - instead, read and follow the guidance below when working with any Sudoku Maker tools.\n\n" +
        "--------------------------------------\n\n" +
        instructions,
    },
    global: true,
  },
  z.object({}),
  () => ({
    content: [
      {
        type: "text",
        text: "You're not supposed to call this tool. All instructions are already present in the tool's description.",
      },
    ],
    isError: true,
  }),
);

const tools = [
  instructionsTool,
  getPuzzleTool,
  updatePuzzleTool,
  updateGivenDigitsTool,
  updateCellValuesTool,
  updateCellMarksTool,
  addElementTool,
  updateElementTool,
  removeElementTool,
  addCluesTool,
  updateCluesTool,
  removeCluesTool,
  getCustomConstraintsDocsTool,
  undoTool,
  redoTool,
  clearGridTool,
  doLogicalStepTool,
  doAllLogicalStepsTool,
  bruteForceSolveTool,
  waitForSolverTool,
  stopSolverTool,
];
// endregion

// region Protocol implementation
tabSyncClient.onCustomMessage<undefined, string>("getInfo", () => {
  const puzzle = getPuzzle();

  return `Puzzle author: "${puzzle.author}"; Puzzle spec: ${JSON.stringify(puzzle.spec)}; Puzzle elements count: ${puzzle.allElements.length}; Call the ${getPuzzleTool.name} tool to get the full puzzle contents.`;
});

tabSyncClient.onCustomMessage<undefined, Tool[]>("listTools", () =>
  tools.map(({ definition }) => definition),
);

tabSyncClient.onCustomMessage<{ name: string; params: any }, CallToolResult>(
  "callTool",
  ({ name, params }) => {
    const tool = tools.find((tool) => tool.name === name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return tool.run(params);
  },
);

tabSyncClient.start();

tabSyncClient
  .sendMessageToServer<WorkerInitOptions, void>("init", {
    serverName: "sudokumaker",
    appName: "Sudoku Maker",
  })
  .catch(console.error);

console.log("MCP client started");
// endregion
