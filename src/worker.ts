import { TabSyncServer } from "@sitnikov/tab-sync";
import { WebSocketClientTransport } from "websocket-mcp/frontend";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import {
  getTabsToolName,
  type Tool,
  type WorkerInitOptions,
} from "./shared.ts";

// TODO: extract this file as a generic package
// noinspection JSUnusedGlobalSymbols
export const run = () => {
  let mcpTransport: WebSocketClientTransport | undefined;

  const tabSyncServer = new TabSyncServer({
    scope: self,
    getExtraPingData: () => ({ connected: mcpTransport?.isConnected ?? false }),
  });

  let initialized = false;
  tabSyncServer.onCustomMessage<WorkerInitOptions, void>("init", (options) => {
    if (initialized) {
      return;
    }
    initialized = true;
    console.log("Initializing...", options);

    const { serverName, appName, instructions } = options;

    mcpTransport = new WebSocketClientTransport({
      url: `ws://localhost:3003/${serverName}`,
    });

    const mcpServer = new Server(
      {
        name: serverName,
        version: "1.0.0",
        title: appName,
      },
      {
        capabilities: { tools: {} },
        instructions,
      },
    );

    const listTools = (tabId: number) =>
      tabSyncServer.sendMessageToTab<undefined, Tool[]>(
        tabId,
        "listTools",
        undefined,
      );

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

      let text = `There are ${activeTabs.length} active ${appName} tabs.`;

      for (const tab of activeTabs) {
        text += `\n- Tab ID: ${tab.id}; Tab title: "${tab.dynamicInfo.title}"`;

        try {
          const info = await tabSyncServer.sendMessageToTab<undefined, string>(
            tab.id,
            "getInfo",
            undefined,
            500,
          );
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

    mcpServer.setRequestHandler(
      CallToolRequestSchema,
      async ({ params }): Promise<CallToolResult> => {
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
          return tabSyncServer.sendMessageToTab<
            { name: string; params: any },
            CallToolResult
          >(
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
          if (!tabSyncServer.activeTabs.some(({ id }) => id === tabId)) {
            return {
              content: [
                {
                  type: "text",
                  text: `Tab ${tabId} not found, it probably has been closed or refreshed.\n${await listTabs()}`,
                },
              ],
              isError: true,
            };
          }

          return handleInTab(tabId);
        }

        const tabs = Array.from(tabSyncServer.activeTabs).reverse();
        for (const tab of tabs) {
          try {
            return handleInTab(tab.id);
          } catch {}
        }

        throw new Error(`Unknown tool: ${params.name}`);
      },
    );

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
  });

  tabSyncServer.start();
  console.log("Tab sync started");
};
