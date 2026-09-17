import { frontendTools } from "./tools/frontendTools";
import { runtimeGlobal } from "./runtimeGlobal";
import type { ToolImplementation } from "./tools/ToolImplementation";
import type { TabStateSnapshot } from "./tabState";

/**
 * The page-side entry point. This module is bundled by the `injected` plugin (see vite.config.ts)
 * and eval'd in the SudokuMaker tab once per build, rather than per tool call: the bundle carries
 * zod plus the whole puzzle schema graph, so shipping it on every call would cost ~110 KB a time.
 *
 * It installs itself on `window`, which survives between `execute_js` calls because the extension
 * evals in the MAIN world. The server probes for `__smMcp.h` (stamped on by the server after this
 * code runs, since the bundle cannot know its own hash) and only re-installs when it is missing or
 * stale — after a page reload, say.
 */

const toolsByName = new Map(frontendTools.map((tool) => [tool.name, tool]));

/** What the server probes for and dispatches through. */
export interface Runtime {
  /** Build hash, stamped on by the server right after installing this bundle. */
  h?: string;
  getTool: (toolName: string) => ToolImplementation<any>;
  /** The tab state as of the last `getTabState` call - see tabState.ts. */
  lastTabStateSnapshot?: TabStateSnapshot;
}

declare global {
  interface Window {
    [runtimeGlobal]: Runtime;
  }
}

// Spelled out rather than `window[runtimeGlobal]`, so the assignment survives minification as a
// static member expression — that literal is what the `injected` plugin asserts on.
window.__smMcp = {
  getTool: (toolName) => {
    const tool = toolsByName.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return tool;
  },
};
