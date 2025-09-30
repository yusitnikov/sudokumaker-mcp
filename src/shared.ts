import type { Tool as SdkTool } from "@modelcontextprotocol/sdk/types.js";

export interface WorkerInitOptions {
  serverName: string;
  appName: string;
  instructions?: string;
}

export interface Tool {
  definition: SdkTool;
  global?: boolean;
  timeout?: number;
}

export const getTabsToolName = "get_tabs";
