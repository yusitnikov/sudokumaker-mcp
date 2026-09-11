import { ExtensionAutomationClient } from "@sitnikov/browser-automation";
import { createHash } from "crypto";
// eslint-disable-next-line import-x/no-unresolved
import runtimeCode from "injected:./client/runtime";
import { runtimeGlobal } from "./client/runtimeGlobal";
import type { ParsedExecuteJsResponse } from "./ParsedExecuteJsResponse";

/** Runs code in one SudokuMaker tab, on behalf of one session. */
export class TabController {
  constructor(
    private readonly client: ExtensionAutomationClient,
    private readonly sessionToken: string,
    private readonly extensionConnectionId: string,
    private readonly tabId: number,
  ) {}

  executeJs(code: string, codeTimeout?: number) {
    return this.client.executeJs(this.sessionToken, this.extensionConnectionId, this.tabId, code, codeTimeout);
  }

  /**
   * Installs the page runtime unless the tab already carries this build's,
   * and returns the failure if that didn't work out.
   */
  async installRuntime() {
    const installed = await this.executeJs(`${runtimeRef}?.h ?? null`);
    if (!installed.success || (JSON.parse(installed.result) as unknown) !== runtimeHash) {
      const installation = await this.executeJs(`${runtimeCode};${runtimeRef}.h=${JSON.stringify(runtimeHash)}`);
      if (!installation.success) {
        return installation;
      }
    }

    return undefined;
  }

  async callToolMethod<ResultT>(
    toolName: string,
    methodName: string,
    args: any[],
    timeout?: number,
  ): Promise<ParsedExecuteJsResponse<ResultT>> {
    const getToolCode = `${runtimeRef}.getTool(${JSON.stringify(toolName)})`;
    const callMethodCode = `${methodName}(${args.map((arg) => JSON.stringify(arg)).join(",")})`;
    const result = await this.executeJs(`${getToolCode}.${callMethodCode}`, timeout);

    return result.success
      ? {
          success: true,
          result: JSON.parse(result.result),
        }
      : result;
  }
}

/**
 * The page runtime is installed once per tab rather than shipped per call: it carries zod plus the
 * whole puzzle schema graph, so sending it every time would cost ~110 KB a call. `window` survives
 * between calls because the extension evals in the MAIN world, so the tab keeps the runtime until
 * it navigates or reloads.
 *
 * The bundle cannot know its own hash, so the server stamps it on after installing and probes for
 * it before each call. A rebuilt server produces a different hash and re-installs automatically.
 */
const runtimeHash = createHash("sha256").update(runtimeCode).digest("hex").slice(0, 16);

const runtimeRef = `window.${runtimeGlobal}`;
