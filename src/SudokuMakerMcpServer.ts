import { BrowserMcpServer, type ExecuteJsError } from "@sitnikov/browser-automation";
import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { allTools } from "./client/tools/allTools";
import { docsToolName } from "./client/tools/toolNames";
import { introTopicName } from "./client/tools/docs/topicNames";
import { TabController } from "./TabController";
import { BackendToolImplementation } from "./client/tools/BackendToolImplementation";
import { backendResources } from "./backendResourcesImpl";

const sudokuMakerHostname = "sudokumaker.app";

export class SudokuMakerMcpServer extends BrowserMcpServer {
  /** The session fields every page-side tool needs, shared by all of them. */
  private static readonly sessionSchema = z.object({
    sessionToken: BrowserMcpServer.sessionTokenField,
    extensionConnectionId: BrowserMcpServer.extensionConnectionIdField,
    tabId: BrowserMcpServer.tabIdField,
  });

  constructor(logFilePath: string | undefined, brokerUrl: string) {
    super({
      serverInfo: {
        name: "sudokumaker",
        version: "1.0.0",
        title: "SudokuMaker",
        description: "MCP for controlling SudokuMaker tabs in the browser",
      },
      serverOptions: {
        instructions: `Read the "${introTopicName}" topic of the ${docsToolName} tool before using any other tool of this MCP server.`,
      },
      logFilePath,
      brokerUrl,
      transport: "stdio",
      skipExecuteJs: true,
      hostnames: [sudokuMakerHostname],
    });
  }

  /**
   * Called from the base constructor, before any subclass field is initialised — everything it
   * touches has to come from module scope.
   */
  protected setupHandlers(): void {
    // initiate_session (scoped to sudokumaker.app) and list_tabs.
    super.setupHandlers();

    const { sessionSchema } = SudokuMakerMcpServer;

    for (const tool of allTools) {
      const { name, title, description } = tool;

      // The MCP SDK uses one schema object both to advertise the tool and to validate arguments in
      // Node before the handler runs. Our schemas are codecs that read grid geometry off
      // `window.Api`: they parse fine headless once unwrapped down to their public side, but the
      // full schema's `.parse()` would reach the codec's `decode` and throw `window is not defined`.
      // `tool.publicShape` projects the tool's real zod input schema into a shallow zod object —
      // cheap fields (primitives, enums, arrays of either) typed and checked here in Node,
      // structured fields advertised as `z.any()` — so each tool advertises its real top-level
      // parameters by name instead of one opaque `params` blob. Full validation still only runs
      // page-side, in `tool.run`.
      const registeredSchema = tool.publicShape;

      if (tool instanceof BackendToolImplementation) {
        // Never touches the page, so it needs neither a session nor a tab.
        this.server.registerTool(
          name,
          { title, description, inputSchema: registeredSchema },
          (params): CallToolResult | Promise<CallToolResult> => tool.runOnBackend(params, backendResources),
        );
        continue;
      }

      this.server.registerTool(
        name,
        {
          title,
          description,
          inputSchema: { ...sessionSchema.shape, ...registeredSchema },
        },
        async (args: Record<string, unknown>): Promise<CallToolResult> => {
          const { sessionToken, extensionConnectionId, tabId } = sessionSchema.parse(args);
          const params = { ...args };
          delete params.sessionToken;
          delete params.extensionConnectionId;
          delete params.tabId;

          const tabController = new TabController(this.client, sessionToken, extensionConnectionId, tabId);

          const installationError = await tabController.installRuntime();
          if (installationError) {
            return toErrorResult(installationError, "install the page runtime");
          }

          return await tool.runOnBackend(tabController, params, backendResources);
        },
      );
    }
  }
}

// TODO: inline
const toErrorResult = (error: ExecuteJsError, action: string): CallToolResult => ({
  content: [
    {
      type: "text",
      text: `Failed to ${action}: ${error.name ? `${error.name}: ` : ""}${error.message}${
        error.stack ? `\n\n${error.stack}` : ""
      }`,
    },
  ],
  isError: true,
});
