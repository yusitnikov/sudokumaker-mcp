import { z } from "zod";
import type { Tool } from "../../shared";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

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
