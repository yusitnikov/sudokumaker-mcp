import { z } from "zod";
import type {
  CallToolResult,
  Tool as SdkTool,
} from "@modelcontextprotocol/sdk/types.js";

export interface Tool {
  definition: SdkTool;
  global?: boolean;
  timeout?: number;
}

/**
 * Data that only the Node side knows, passed inward to the page on every call.
 */
export interface ToolContext {
  tabId: number;
}

export class ToolImplementation<SchemaT extends z.ZodSchema> {
  constructor(
    private readonly tool: Omit<Tool, "definition"> & {
      definition: Omit<Tool["definition"], "inputSchema">;
    },
    private readonly inputSchema: SchemaT,
    private readonly _run: (
      params: z.input<SchemaT>,
      context: ToolContext,
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

  run(params: unknown, context: ToolContext) {
    const validatedParams = this.inputSchema.parse(params);

    return this._run(this.inputSchema.encode(validatedParams), context);
  }
}
