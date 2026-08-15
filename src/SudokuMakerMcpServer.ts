import {
  BrowserMcpServer,
  type ExecuteJsError,
} from "@sitnikov/browser-automation";
import { createHash } from "crypto";
import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import runtimeCode from "injected:./client/runtime";
import { runtimeGlobal } from "./client/runtimeGlobal";
import { tools } from "./client/tools";

const sudokuMakerHostname = "sudokumaker.app";

/**
 * The page runtime is installed once per tab rather than shipped per call: it carries zod plus the
 * whole puzzle schema graph, so sending it every time would cost ~110 KB a call. `window` survives
 * between calls because the extension evals in the MAIN world, so the tab keeps the runtime until
 * it navigates or reloads.
 *
 * The bundle cannot know its own hash, so the server stamps it on after installing and probes for
 * it before each call. A rebuilt server produces a different hash and re-installs automatically.
 */
const runtimeHash = createHash("sha256")
  .update(runtimeCode)
  .digest("hex")
  .slice(0, 16);

const runtimeRef = `window.${runtimeGlobal}`;

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
        title: "Sudoku Maker",
        description: "MCP for controlling Sudoku Maker tabs in the browser",
      },
      serverOptions: {
        instructions:
          "This server controls Sudoku Maker puzzles open in browser tabs (sudokumaker.app). " +
          "Start every session with: (1) initiate_session, (2) list_tabs to find the target tab, " +
          "(3) the docs tool with topic \"intro\" — it explains the workflow, who the user is, " +
          "the terminology, and indexes all documentation topics.",
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

    for (const tool of tools) {
      const { definition, global, timeout } = tool.definition;
      const { name, title, description, inputSchema } = definition;

      // The MCP SDK uses one schema object both to advertise the tool and to validate arguments in
      // Node before the handler runs. Our schemas are codecs that read grid geometry off
      // `window.Api`: they render to JSON Schema headless, but parsing throws `window is not
      // defined`. Registering a permissive schema that carries the real JSON Schema as metadata
      // keeps the advertised shape exact and defers validation to the page, where it can work.
      //
      // The tool's arguments are nested under `params` rather than sitting at the top level: the
      // metadata is only honored when it hangs off a *field*, so a whole-object schema carrying the
      // same metadata renders as an empty object and the tool advertises no arguments at all.
      // Optional so that tools taking no arguments can be called with nothing at all: `z.any()`
      // still rejects a missing value in Zod v4, which turns an argument-less call into a
      // validation error before the handler ever runs.
      const registeredSchema = { params: z.any().meta(inputSchema).optional() };

      if (global) {
        // Never touches the page, so it needs neither a session nor a tab.
        this.server.registerTool(
          name,
          { title, description, inputSchema: registeredSchema },
          // `params ?? {}` for the same reason as the dispatch below: the field is optional, but a
          // tool's own schema may still require an object, so an argument-less call has to arrive as
          // an empty one rather than as `undefined`.
          ({ params }): CallToolResult | Promise<CallToolResult> =>
            tool.run(params ?? {}, { tabId: 0 }),
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
          const { sessionToken, extensionConnectionId, tabId } =
            sessionSchema.parse(args);
          const { params } = args;

          // Only the dispatch gets the tool's timeout: the solver tools poll in the page for longer
          // than the transport's default wait, so it has to outlast them or the caller sees a
          // transport timeout instead of the page's own "still running" answer. Probe and install
          // are short calls either way, and stretching them would only delay reporting a dead tab.
          const run = (code: string, codeTimeout?: number) =>
            this.client.executeJs(
              sessionToken,
              extensionConnectionId,
              tabId,
              code,
              codeTimeout,
            );

          const installed = await run(`${runtimeRef}?.h ?? null`);
          if (
            !installed.success ||
            (JSON.parse(installed.result) as unknown) !== runtimeHash
          ) {
            const installation = await run(
              `${runtimeCode};${runtimeRef}.h=${JSON.stringify(runtimeHash)}`,
            );
            if (!installation.success) {
              return toErrorResult(installation, "install the page runtime");
            }
          }

          const response = await run(
            `${runtimeRef}.call(${JSON.stringify(name)},${JSON.stringify(params ?? {})},{tabId:${tabId}})`,
            timeout,
          );
          if (!response.success) {
            return toErrorResult(response, `run ${name}`);
          }

          // The extension JSON-stringifies whatever the page returned, which here is the tool's
          // own CallToolResult.
          return JSON.parse(response.result) as CallToolResult;
        },
      );
    }
  }
}

const toErrorResult = (
  error: ExecuteJsError,
  action: string,
): CallToolResult => ({
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
