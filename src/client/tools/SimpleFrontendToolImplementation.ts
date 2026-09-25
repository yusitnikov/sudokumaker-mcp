import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { TabController } from "../../TabController";
import type { ParsedExecuteJsResponse } from "../../ParsedExecuteJsResponse";
import { FrontendToolImplementation } from "./FrontendToolImplementation";
import type { ToolOptions } from "./ToolImplementation";
import type { PuzzlePublic } from "../../SudokuMakerPuzzleSchema";
import type { BackendResources } from "../../BackendResources";

export interface FrontendToolOptions<SchemaT extends z.ZodSchema> extends ToolOptions<SchemaT> {
  timeout?: number;
}

export interface FrontendRunResult {
  updatedPuzzle?: PuzzlePublic;
  response: CallToolResult;
}

export abstract class SimpleFrontendToolImplementation<
  SchemaT extends z.ZodSchema,
> extends FrontendToolImplementation<SchemaT> {
  protected readonly timeout?: number;

  constructor({ timeout, ...options }: FrontendToolOptions<SchemaT>) {
    super(options);

    this.timeout = timeout;
  }

  protected abstract run(params: z.input<SchemaT>): FrontendRunResult | Promise<FrontendRunResult>;

  async runOnFrontend(params: z.input<SchemaT>): Promise<FrontendRunResult> {
    try {
      return await this.run(params);
    } catch (error: unknown) {
      return { response: this.formatErrorResponse(error) };
    }
  }

  protected async runLogicOnBackend(
    tabController: TabController,
    params: z.input<SchemaT>,
    resources: BackendResources,
  ): Promise<ParsedExecuteJsResponse<CallToolResult>> {
    const runResult = await this.callFrontend<SimpleFrontendToolImplementation<SchemaT>, "runOnFrontend">(
      tabController,
      this.timeout,
      "runOnFrontend",
      params,
    );
    if (!runResult.success) {
      return runResult;
    }
    const { response, updatedPuzzle } = runResult.result;

    if (updatedPuzzle) {
      const checkResult = await this.checkPuzzleOnBackend(updatedPuzzle, params, resources, tabController);
      if (checkResult) {
        (response.content[response.content.length - 1] as { text: string }).text += `\n\n${checkResult}`;
      }
    }

    return {
      success: true,
      result: response,
    };
  }

  protected async checkPuzzleOnBackend(
    _puzzle: PuzzlePublic,
    _params: z.input<SchemaT>,
    _resources: BackendResources,
    _tabController: TabController,
  ): Promise<string | undefined> {
    return undefined;
  }
}
