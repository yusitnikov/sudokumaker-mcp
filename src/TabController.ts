import { ExtensionAutomationClient } from "@sitnikov/browser-automation";
import { createHash } from "crypto";
// eslint-disable-next-line import-x/no-unresolved
import runtimeCode from "injected:./client/runtime";
import { runtimeGlobal } from "./client/runtimeGlobal";
import type { Runtime } from "./client/runtime";

/** Runs code in one SudokuMaker tab, on behalf of one session. */
export class TabController {
  constructor(
    private readonly client: ExtensionAutomationClient,
    private readonly sessionToken: string,
    private readonly extensionConnectionId: string,
    private readonly tabId: number,
  ) {}

  private executeJs(code: string, codeTimeout?: number) {
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

  /**
   * Calls a method of the page runtime, which `installRuntime` must have put in the tab first,
   * and returns what it returned or the failure that running it reported.
   */
  async callRuntimeMethod<NameT extends RuntimeMethodName>(
    methodName: NameT,
    args: Parameters<Runtime[NameT]>,
    codeTimeout?: number,
  ) {
    const result = await this.executeJs(
      `${runtimeRef}.${methodName}(${args.map((arg) => JSON.stringify(arg)).join(",")})`,
      codeTimeout,
    );

    return result.success
      ? {
          success: true as const,
          result: JSON.parse(result.result) as Awaited<ReturnType<Runtime[NameT]>>,
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

/** The names of the page runtime's callable members, excluding its plain data properties. */
type RuntimeMethodName = {
  [K in keyof Runtime]-?: Runtime[K] extends (...args: any[]) => any ? K : never;
}[keyof Runtime];
