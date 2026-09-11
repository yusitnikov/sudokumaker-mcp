import { ToolImplementation } from "./ToolImplementation";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export abstract class BackendToolImplementation<SchemaT extends z.ZodSchema> extends ToolImplementation<SchemaT> {
  async runOnBackend(params: unknown): Promise<CallToolResult> {
    try {
      const validatedParams = this.validateParams(params);
      return await this.run(validatedParams);
    } catch (error: unknown) {
      return this.formatErrorResponse(error);
    }
  }

  protected abstract run(params: z.input<SchemaT>): CallToolResult | Promise<CallToolResult>;
}
