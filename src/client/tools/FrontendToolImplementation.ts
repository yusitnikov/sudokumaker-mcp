import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { TabController } from "../../TabController";
import { TabState, TabStateChangedError } from "../tabState";
import { type PuzzlePublic, PuzzleSchema } from "../../SudokuMakerPuzzleSchema";
import { ClueMatch, getElementWithClueById } from "./elementUtils";
import { getByPath, setByPath } from "../../PathToObject";
import { ToolImplementation } from "./ToolImplementation";
import type { ParsedExecuteJsResponse } from "../../ParsedExecuteJsResponse";
import type { BackendResources } from "../../BackendResources";
import { clearSudokuMakerErrors, getSudokuMakerErrors } from "../../SudokuMakerErrors";

/**
 * The callable members of `T`, keyed by name.
 *
 * The value is the rebuilt signature rather than `T[K]`, which would keep the map homomorphic over `T`:
 * indexing a homomorphic map collapses back to `T[K]`, dropping the filter over a deferred `this`.
 */
type FrontendMethodsOf<T> = {
  [K in `${string}OnFrontend` & keyof T]: T[K] extends (...args: infer ArgsT) => infer ReturnT
    ? (...args: ArgsT) => ReturnT
    : never;
};

export abstract class FrontendToolImplementation<SchemaT extends z.ZodSchema> extends ToolImplementation<SchemaT> {
  protected async callFrontend<
    ThisT extends FrontendToolImplementation<SchemaT>,
    MethodNameT extends keyof FrontendMethodsOf<ThisT>,
  >(
    tabController: TabController,
    timeout: number | undefined,
    methodName: MethodNameT,
    ...args: Parameters<FrontendMethodsOf<ThisT>[MethodNameT]>
  ) {
    return await tabController.callToolMethod<Awaited<ReturnType<FrontendMethodsOf<ThisT>[MethodNameT]>>>(
      this.name,
      methodName,
      args,
      timeout,
    );
  }

  async runOnBackend(
    tabController: TabController,
    params: unknown,
    resources: BackendResources,
  ): Promise<CallToolResult> {
    const initResult = await this.callFrontend(tabController, 1000, "initOnFrontend", params);
    if (!initResult.success) {
      return this.formatErrorResponse(initResult.message);
    }

    const runResult = await this.runLogicOnBackend(tabController, initResult.result, resources);
    if (!runResult.success) {
      return this.formatErrorResponse(runResult.message);
    }
    const { result } = runResult;

    const diffResult = await this.callFrontend(tabController, 1000, "getTabStateDiffOnFrontend");
    if (!diffResult.success) {
      return this.formatErrorResponse(diffResult.message);
    }
    const { diff, errors } = diffResult.result;
    const addWarningText = (warningText: string) => {
      if (result.isError) {
        result.content.push({
          type: "text",
          text: "\n\n" + warningText,
        });
      } else {
        result.content.unshift({
          type: "text",
          text: warningText + "\n\n",
        });
      }
    };
    if (diff) {
      addWarningText(`[WARNING] The tab state changed since the last tool call: ${diff}`);
    }
    if (errors.length) {
      addWarningText(
        "[WARNING] SudokuMaker reported errors while running this tool:\n" +
          errors.map(({ context, message }) => `- ${context}: ${message}`).join("\n"),
      );
    }

    return result;
  }

  protected abstract runLogicOnBackend(
    tabController: TabController,
    params: z.input<SchemaT>,
    resources: BackendResources,
  ): Promise<ParsedExecuteJsResponse<CallToolResult>>;

  initOnFrontend(params: unknown) {
    clearSudokuMakerErrors();
    this.prevTabState = undefined;
    return this.validateParams(params);
  }

  async getTabStateDiffOnFrontend() {
    // Wait a bit to ensure that the errors arrive if any
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      diff: this.prevTabState?.puzzleChanged ? (this.prevTabState.formattedDiff ?? "") : "",
      // Flattened here, because an `Error` doesn't survive the JSON trip to the backend
      errors: getSudokuMakerErrors().map(({ context, error }) => ({
        context,
        message: error instanceof Error ? error.message : String(error),
      })),
    };
  }

  private prevTabState?: TabState;

  protected checkPrevTabState(allowChanges = false) {
    this.prevTabState = TabState.read();

    if (!allowChanges && this.prevTabState.puzzleChanged) {
      throw new TabStateChangedError(this.prevTabState);
    }

    return this.prevTabState;
  }

  formatErrorResponse(error: unknown): CallToolResult {
    if (error instanceof TabStateChangedError) {
      const tabState = error.tabState;

      return {
        content: [
          {
            type: "text",
            text:
              error.message +
              (tabState.puzzleIdChanged
                ? `\nHere's the new tab state:\n${tabState.formattedSnapshot}`
                : `\nHere's what changed:\n${tabState.formattedDiff}`),
          },
        ],
        isError: true,
      };
    }

    return super.formatErrorResponse(error);
  }

  protected async updatePuzzle(
    updateCallback: (puzzle: PuzzlePublic) => { puzzle?: PuzzlePublic } | void,
    copyCallback: (from: z.output<typeof PuzzleSchema>, to: z.output<typeof PuzzleSchema>) => void,
    operationDescription: string | ((puzzle: PuzzlePublic) => string),
  ): Promise<{ tabState: TabState }>;
  protected async updatePuzzle<UpdateResultT>(
    updateCallback: (puzzle: PuzzlePublic) => {
      puzzle?: PuzzlePublic;
      result: UpdateResultT;
    },
    copyCallback: (
      from: z.output<typeof PuzzleSchema>,
      to: z.output<typeof PuzzleSchema>,
      updateResult: UpdateResultT,
    ) => void,
    operationDescription: string | ((puzzle: PuzzlePublic, updateResult: UpdateResultT) => string),
  ): Promise<{ tabState: TabState; result: UpdateResultT }>;
  protected async updatePuzzle<UpdateResultT>(
    updateCallback: (puzzle: PuzzlePublic) => { puzzle?: PuzzlePublic; result?: UpdateResultT } | void,
    copyCallback: (
      from: z.output<typeof PuzzleSchema>,
      to: z.output<typeof PuzzleSchema>,
      updateResult: UpdateResultT,
    ) => void,
    operationDescription: string | ((puzzle: PuzzlePublic, updateResult?: UpdateResultT) => string),
  ): Promise<{ tabState: TabState; result?: UpdateResultT }> {
    const tabState = this.checkPrevTabState(false);

    const run = (puzzle: PuzzlePublic) => {
      const result = updateCallback(puzzle);

      const updatedPuzzle = result?.puzzle ?? puzzle;

      const updatedSudokuMakerPuzzle = PuzzleSchema.decode(updatedPuzzle);

      return {
        updatedSudokuMakerPuzzle,
        updatePuzzleResult: result?.result,
      };
    };

    // Dry run on a copy of the current state to check for errors without calling the actual SudokuMaker API
    const dryRunResult = run(JSON.parse(JSON.stringify(tabState.puzzle)));

    let updatePuzzleResult: UpdateResultT | undefined;

    window.Api.updatePuzzle(
      (sudokuMakerPuzzle) => {
        const puzzle = PuzzleSchema.encode(sudokuMakerPuzzle);

        const result = run(puzzle);
        updatePuzzleResult = result.updatePuzzleResult;

        copyCallback(result.updatedSudokuMakerPuzzle, sudokuMakerPuzzle, updatePuzzleResult!);
      },
      typeof operationDescription === "function"
        ? operationDescription(tabState.puzzle, dryRunResult.updatePuzzleResult)
        : operationDescription,
    );

    return {
      tabState: await TabState.waitAndRead(),
      result: updatePuzzleResult,
    };
  }

  // TODO: move to independent class
  protected async updateCluesByCellGroups(
    elementId: number,
    clueMatches: z.input<typeof ClueMatch>[],
    updateCallback: (
      clues: any[],
      matchingIndexGroups: number[][],
      allMatchingIndexes: Set<number>,
      puzzle: PuzzlePublic,
    ) => any[] | void,
    operationDescription: string,
  ) {
    const {
      tabState,
      result: { index, matchingClues, allMatchingIndexes },
    } = await this.updatePuzzle(
      (puzzle) => {
        const { index, targetElement, clueType } = getElementWithClueById(puzzle, elementId);

        const cluesKey = clueType.key;
        const clues = ((targetElement.config as any)[cluesKey] as any[]).map((clue, index) => ({
          index,
          clue,
          cells: clueType.getAffectedCells(clue),
        }));
        const matchingClues = clueMatches.map((match, groupIndex) => {
          if ("clueCells" in match) {
            return clues.filter((clue) => match.clueCells.every((cell) => clue.cells.includes(cell)));
          }

          const groupMatches = match.positions.map((position) => clues[position - 1]);
          if (groupMatches.some((item) => !item)) {
            throw new Error(
              `Group #${groupIndex + 1}: invalid positions provided - this element has ${clues.length} clues.`,
            );
          }
          return groupMatches;
        });
        const allMatchingIndexes = new Set(matchingClues.flat().map(({ index }) => index));

        if (allMatchingIndexes.size === 0) {
          const allClueCells = clues.map(({ cells }) => `(${cells.join(", ") || "none"})`);

          throw new Error(
            `No matching clues found, please check the filters. There are clues with the following affected cells - you can target only these cells: ${allClueCells.join("; ") || "none"}`,
          );
        }

        const config = puzzle.allElements[index].config as any;
        const result = updateCallback(
          config[cluesKey],
          matchingClues.map((group) => group.map(({ index }) => index)),
          allMatchingIndexes,
          puzzle,
        );
        if (result) {
          config[cluesKey] = result;
        }

        return {
          result: {
            index,
            cluesInternalPath: clueType.internalPath ?? [cluesKey],
            matchingClues,
            allMatchingIndexes,
          },
        };
      },
      (from, to, { index, cluesInternalPath }) => {
        setByPath(
          to.allConstraints[index].config as any,
          cluesInternalPath,
          getByPath(from.allConstraints[index].config as any, cluesInternalPath),
        );
      },
      operationDescription,
    );

    const updatedElement = tabState.puzzle.allElements[index];

    const messages: string[] = [];
    for (const [groupIndex, matches] of matchingClues.entries()) {
      if ("clueCells" in clueMatches[groupIndex]) {
        const formattedClues = matches.map(({ index, cells }) => `position ${index + 1}: ${cells.join(" ")}`);
        messages.push(`Group #${groupIndex + 1} - targeted ${matches.length} clues: [${formattedClues.join(", ")}]`);
      }
    }
    if (messages.length) {
      messages.push(
        "If some of the targeted clues above don't match your expectations, UNDO THE OPERATION IMMEDIATELY!",
      );
    }

    return {
      tabState,
      allMatchingIndexes,
      updatedElement,
      messages,
    };
  }
}
