// noinspection SqlNoDataSourceInspection

import { TabSyncClient } from "@sitnikov/tab-sync";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Tool, WorkerInitOptions } from "./shared";
import { z } from "zod";
import { PuzzleSchema } from "./SudokuMakerPuzzleSchema.ts";
import {
  AllConstraints,
  ConstraintSchema,
  type ConstraintByType,
  ConstraintType,
  getConstraintByConfig,
  getConstraintByTypeName,
} from "./SudokuMakerConstraint.ts";

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

  puzzle.allConstraints.forEach(
    <TypeT extends ConstraintType>(constraint: ConstraintByType<TypeT>) => {
      const constraintType = getConstraintByConfig<TypeT>(constraint.config);

      const constraintMetadata = constraintType.getConstraintMetadata(
        constraint.config,
        puzzle.spec,
      );

      constraint.constraintMetadata = {
        defaultName: constraintMetadata.title,
        description: constraintMetadata.description,
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
        'The path of the puzzle object to retrieve, e.g. ["spec", "type"] to get puzzle.spec.type. Skip the path to get the whole puzzle object (warning: it will produce lots of tokens!). Do not use this parameter until you know the object\'s structure!',
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
        "Modify puzzle object at specified path. Please use this tool only as a last resort option when no other puzzle modification tool is fitting",
    },
  },
  z.object({
    operationDescription: z
      .string()
      .optional()
      .describe("Human-readable summary of the puzzle update operation"),
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
              'The affected path of the puzzle object, e.g. ["allConstraints", 0, "config"] to modify puzzle.allConstraints[0].config',
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
        for (const [index, cell] of cells.entries()) {
          Object.assign(to.cells[index], cell);
        }
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

const getConstraintGroupFinalName = ({
  name,
  config: { type },
  constraintMetadata,
}: z.input<typeof ConstraintSchema>) =>
  name || constraintMetadata?.defaultName || type;

const getConstraintGroupSummary = (
  constraint: z.input<typeof ConstraintSchema>,
) =>
  `"${getConstraintGroupFinalName(constraint)}" (type ${constraint.config.type}, ID ${constraint.id}, ${!constraint.enabled ? "disabled" : constraint.solverIgnored ? "solver-ignored" : "enabled"})`;

const addConstraintGroupTool = new ToolImplementation(
  {
    definition: {
      name: "add_constraint_group",
      title: "Add constraint group to the puzzle",
      description:
        "Add an empty constraint group of specified type with default parameters to the puzzle",
    },
  },
  z.object({
    name: z
      .string()
      .optional()
      .describe(
        "Constraint group name. Leave it empty to use the default name according to the constraint type (recommended when there's only one constraint group of this type in the puzzle)",
      ),
    constraint: z
      .union(
        AllConstraints.flatMap((constraint) =>
          [constraint.main, ...constraint.options].map((option) =>
            z
              .object({
                type: z.literal(constraint.typeName),
                subType: z.literal(option.title),
                params: option.paramsSchema ?? z.never().optional(),
                // TODO: overrides
              })
              .describe(option.description),
          ),
        ),
      )
      .describe("Constraint to add"),
    position: z
      .union([
        z
          .object({
            at: z.number().int().min(1),
          })
          .describe(
            "Place the new constraint at Nth place, e.g. 1 to place it as the first item",
          ),
        z
          .object({
            at: z.literal("end"),
          })
          .describe("Insert the new constraint to the end of the list"),
        z
          .object({
            constraintId: z.number().int().describe("Target constraint ID"),
            position: z.enum(["before", "after"]),
          })
          .describe(
            "Place the new constraint before or after another constraint with given ID",
          ),
      ])
      .describe("Position where to insert the new constraint to"),
  }),
  ({ name, constraint, position }) => {
    const { spec, allConstraints: currentConstraints } = getPuzzle();

    let index: number;
    if ("constraintId" in position) {
      const targetConstraint = currentConstraints.find(
        ({ id }) => id === position.constraintId,
      );
      if (!targetConstraint) {
        throw new Error(
          `Constraint with ID ${position.constraintId} not found in the puzzle`,
        );
      }
      index = currentConstraints.indexOf(targetConstraint);
      if (position.position === "after") {
        index++;
      }
    } else if (position.at === "end") {
      index = currentConstraints.length;
    } else {
      index = position.at - 1;
      if (index > currentConstraints.length) {
        throw new Error(
          `Cannot insert constraint at position ${position.at} - there are only ${currentConstraints.length} constraints in the puzzle`,
        );
      }
    }

    const constraintType = getConstraintByTypeName(constraint.type);
    const constraintSubType = [
      constraintType.main,
      ...constraintType.options,
    ].find(({ title }) => title === constraint.subType)!;
    const config = {
      type: constraint.type,
      ...(typeof constraintSubType.defaultConfig === "function"
        ? (constraintSubType.defaultConfig as any)(spec, constraint.params)
        : (constraintSubType.defaultConfig ?? constraint.params)),
    };
    const id = currentConstraints.length
      ? Math.max(...currentConstraints.map(({ id = 0 }) => id)) + 1
      : 1;

    updatePuzzle(
      (puzzle) => {
        puzzle.allConstraints.splice(index, 0, {
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
      `Add ${constraintSubType.title}`,
    );

    const newConstraints = getPuzzle().allConstraints;
    const newConstraint = newConstraints[index];
    if (newConstraint?.id !== id) {
      return {
        content: [
          {
            type: "text",
            text: "Something went wrong - failed to add the constraint. Please report the error to the Sudoku Maker MCP server developer (Chameleon)",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `New constraint added at position ${index + 1}.`,
        },
        {
          type: "text",
          text: `The new constraints list: ${newConstraints.map(getConstraintGroupSummary).join(", ")}.`,
        },
        {
          type: "text",
          text: `New constraint: ${JSON.stringify(newConstraint, null, 2)}`,
        },
      ],
    };
  },
);

const removeConstraintGroupTool = new ToolImplementation(
  {
    definition: {
      name: "remove_constraint_group",
      title: "Remove constraint group",
      description: "Remove constraint group from the puzzle by ID",
    },
  },
  z.object({
    constraintId: z.number().int().describe("Constraint group ID to delete"),
    constraintName: z
      .string()
      .optional()
      .describe(
        "The name of the constraint group that's going to be deleted - use this parameter to make the AI user understand which constraint is going to be removed when looking at the MCP tool call parameters",
      ),
  }),
  ({ constraintId }) => {
    const { allConstraints: currentConstraints } = getPuzzle();

    const targetConstraint = currentConstraints.find(
      ({ id }) => id === constraintId,
    );
    if (!targetConstraint) {
      throw new Error(
        `Constraint with ID ${constraintId} not found in the puzzle`,
      );
    }
    const index = currentConstraints.indexOf(targetConstraint);

    updatePuzzle(
      (puzzle) => {
        puzzle.allConstraints.splice(index, 1);
      },
      (_from, to) => {
        to.allConstraints.splice(index, 1);
      },
      `Remove ${getConstraintGroupFinalName(targetConstraint)}`,
    );

    const remainingConstraints = getPuzzle().allConstraints;

    return {
      content: [
        {
          type: "text",
          text: `Constraint group "${getConstraintGroupFinalName(targetConstraint)}" of type "${targetConstraint.config.type}" removed from position ${index + 1}.`,
        },
        {
          type: "text",
          text: `The remaining constraints: ${remainingConstraints.map(getConstraintGroupSummary).join(", ") || "none"}.`,
        },
        {
          type: "text",
          text: `The full spec of the removed constraint (verify that it's the constraint that you wanted to delete!): ${JSON.stringify(targetConstraint, null, 2)}`,
        },
      ],
    };
  },
);

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
    window.Api.triggerAction("undo");

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
    window.Api.triggerAction("redo");

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

const reversibleActionNote = `Note: this action could be undone and redone by calling "${undoTool.name}" and "${redoTool.name}" tools, similar to any other action in the puzzle`;

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
    window.Api.triggerAction("doSingleLogicalStep");
    const { message } = await waitForSolver(singleStepTimeout);

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
    window.Api.triggerAction("doAllLogicalSteps");
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
    window.Api.triggerAction("findSolutions");
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

const tools = [
  getPuzzleTool,
  updatePuzzleTool,
  addConstraintGroupTool,
  removeConstraintGroupTool,
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

  return `Puzzle author: "${puzzle.author}"; Puzzle spec: ${JSON.stringify(puzzle.spec)}; Puzzle constraints count: ${puzzle.allConstraints.length}; Call the ${getPuzzleTool.name} tool to get the full puzzle contents.`;
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
    instructions: `
      ${(document.head.querySelector('meta[name="description"]') as HTMLMetaElement)?.content ?? ""}

      This MCP server provides programmatic access to Sudoku Maker puzzles open in browser tabs.
      It communicates with the browser tabs to read and modify puzzle state.

      The full list of all JSON schemas used in this MCP server: ${JSON.stringify(z.toJSONSchema(z.globalRegistry, { io: "input" }))}
    `,
  })
  .catch(console.error);

console.log("MCP client started");
// endregion
