// noinspection SqlNoDataSourceInspection

import { TabSyncClient } from "@sitnikov/tab-sync";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "./shared";
import { z } from "zod";

const code = `
    import { run } from "${import.meta.url.replace("/client", "/worker")}";
    run("sudokumaker", "Sudoku Maker");
`;
const url = "data:application/javascript;base64," + btoa(code);

const tabSyncClient = new TabSyncClient<{ connected: boolean }>({
  sharedWorkerPath: url,
  sharedWorkerOptions: { name: "Sudoku Maker MCP", type: "module" },
});

tabSyncClient.onExtraPingDataChanged = ({ connected }) =>
  console.log("Connection status changed:", { connected });

const getPuzzle = () => {
  let puzzle = window.Api.getPuzzle();
  puzzle = JSON.parse(JSON.stringify(puzzle));
  delete puzzle.helpers;
  return puzzle;
};

tabSyncClient.onCustomMessage("getPuzzle", getPuzzle);

export class ToolImplementation<SchemaT extends z.ZodSchema> {
  constructor(
    private readonly tool: Omit<Tool, "definition"> & {
      definition: Omit<Tool["definition"], "inputSchema">;
    },
    private readonly inputSchema: SchemaT,
    private readonly _run: (
      params: z.infer<SchemaT>,
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
        inputSchema: z.toJSONSchema(this.inputSchema),
      } as Tool["definition"],
    };
  }

  run(params: unknown) {
    const validatedParams = this.inputSchema.parse(params) as z.infer<SchemaT>;

    return this._run(validatedParams);
  }
}

const getTypesWikiTool = new ToolImplementation(
  {
    definition: {
      name: "get_types_wiki",
      title: "Get Sudoku Maker typescript definitions",
    },
    global: true,
  },
  z.object({}),
  async () => {
    const response = await fetch(
      "https://raw.githubusercontent.com/yusitnikov/puzzletv/refs/heads/main/src/types/SudokuMaker.ts",
    );
    const code = await response.text();

    return {
      content: [
        {
          type: "resource",
          resource: {
            uri: "wiki://types",
            mimeType: "text/plain",
            text: code,
          },
        },
      ],
    };
  },
);

const getPuzzleTool = new ToolImplementation(
  {
    definition: {
      name: "get_puzzle",
      title: "Get puzzle contents for tab",
      description: `Get full puzzle definition per tab ID. You MUST call the ${getTypesWikiTool} tool to understand the puzzle's data.`,
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
      description: "Get full puzzle definition per tab ID.",
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
    window.Api.updatePuzzle((puzzle) => {
      for (const { path, update } of updates) {
        let ref = {
          value: puzzle as any,
          set: (value: any) => {
            Object.assign(puzzle, value);
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
    }, operationDescription);

    return {
      content: [
        {
          type: "text",
          text: "Updated successfully",
        },
      ],
    };
  },
);

const tools = [getTypesWikiTool, getPuzzleTool, updatePuzzleTool];

tabSyncClient.onCustomMessage<undefined, string>("getInfo", () => {
  const puzzle = getPuzzle();

  return `Puzzle author: "${puzzle.author}"; Puzzle spec: ${JSON.stringify(puzzle.spec)}; Puzzle constraints count: ${puzzle.allConstraints.length}; In order to get and UNDERSTAND the full puzzle contents, use wiki tools first, and ONLY THEN call the ${getPuzzleTool.name} tool.`;
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

console.log("MCP client started");
