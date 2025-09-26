import type {
  CallToolResult,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";

export interface Tool {
  definition: ListToolsResult["tools"][0];
  global?: boolean;
  timeout?: number;
}

export interface ToolImplementation extends Tool {
  run: (params: any) => CallToolResult | Promise<CallToolResult>;
}

export const getTabsToolName = "get_tabs";
