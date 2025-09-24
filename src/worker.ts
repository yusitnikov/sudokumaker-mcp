import { TabSyncServer } from "@sitnikov/tab-sync";
import { WebSocketClientTransport } from "websocket-mcp/frontend";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { getTabsToolName, type Tool } from "./shared.ts";

// noinspection JSUnusedGlobalSymbols
export const run = (serverName: string, appName: string) => {
  const mcpTransport = new WebSocketClientTransport({
    url: `ws://localhost:3003/${serverName}`,
  });

  const tabSyncServer = new TabSyncServer({
    scope: self,
    getExtraPingData: () => ({ connected: mcpTransport.isConnected }),
  });
  tabSyncServer.start();
  console.log("Tab sync started");

  const mcpServer = new Server(
    {
      name: serverName,
      version: "1.0.0",
      title: appName,
    },
    { capabilities: { tools: {} } },
  );

  const listTools = (tabId: number): Promise<Tool[]> =>
    tabSyncServer.sendMessageToTab(tabId, "listTools", undefined);

  mcpServer.setRequestHandler(
    ListToolsRequestSchema,
    async (): Promise<ListToolsResult> => {
      const tabs = Array.from(tabSyncServer.activeTabs).reverse();
      let tools: Tool[] = [];
      console.log("Listing tools...");
      console.log(tabs.length, "tabs");
      for (const tab of tabs) {
        try {
          console.log("Try tab", tab);
          tools = await listTools(tab.id);
          console.log("Success!", tools);
        } catch {}
      }

      return {
        tools: [
          {
            name: getTabsToolName,
            title: `List ${appName} browser tabs`,
            description: `Get the list of all ${appName} tabs opened in the browser`,
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          ...tools.map(({ definition, global }) => {
            if (!global) {
              definition.inputSchema.properties ??= {};
              definition.inputSchema.properties.tabId = {
                type: "number",
                description: `Target tab ID. You can know the list of available tabs by calling the ${getTabsToolName} tool.`,
              };
              definition.inputSchema.properties.tabDescription = {
                type: "string",
                description:
                  "Optional human-readable description of the target tab. Specify it for the LLM user to understand which tab is going to be affected",
              };

              definition.inputSchema.required ??= [];
              definition.inputSchema.required.unshift("tabId");
            }
            console.log("Got tool!", definition);
            return definition;
          }),
        ],
      };
    },
  );

  const listTabs = async () => {
    const activeTabs = tabSyncServer.activeTabs;

    let text = `There are ${activeTabs.length} active Sudoku Maker tabs.`;

    for (const tab of activeTabs) {
      text += `\n- Tab ID: ${tab.id}; Tab title: "${tab.dynamicInfo.title}"`;

      try {
        const info = (await tabSyncServer.sendMessageToTab(
          tab.id,
          "getInfo",
          undefined,
          500,
        )) as string;
        console.log("Got the tab info!", tab, info);

        if (info) {
          text += `; ${info}`;
        }
      } catch (error) {
        console.warn(`Failed to get info from tab ${tab.id}`);
      }
    }

    return text;
  };

  mcpServer.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    if (params.name === getTabsToolName) {
      return {
        content: [
          {
            type: "text",
            text: await listTabs(),
          },
        ],
      };
    }

    const handleInTab = async (tabId: number) => {
      const tools = await listTools(tabId);
      const tool = tools.find(
        ({ definition: { name } }) => name === params.name,
      );
      return tabSyncServer.sendMessageToTab(
        tabId,
        "callTool",
        {
          name: params.name,
          params: params.arguments,
        },
        tool?.timeout,
      );
    };

    const tabId = params.arguments?.tabId;
    if (typeof tabId === "number") {
      return handleInTab(tabId);
    }

    const tabs = Array.from(tabSyncServer.activeTabs).reverse();
    for (const tab of tabs) {
      try {
        return handleInTab(tab.id);
      } catch {}
    }

    throw new Error(`Unknown tool: ${params.name}`);
  });

  (async () => {
    try {
      await mcpServer.connect(mcpTransport);
      console.log("MCP connection established");
    } catch (error) {
      console.warn("MCP connection failed:", error);
    }

    // Notify the tabs about the connection status
    tabSyncServer.pingAllTabs();
  })();
};
