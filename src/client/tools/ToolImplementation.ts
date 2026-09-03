import { z } from "zod";
import type {
  CallToolResult,
  Tool as SdkTool,
} from "@modelcontextprotocol/sdk/types.js";
import { TabState, TabStateChangedError } from "../tabState";
import { type PuzzlePublic, PuzzleSchema } from "../../SudokuMakerPuzzleSchema";
import { ClueMatch, getElementWithClueById } from "./elementUtils";

export interface Tool {
  definition: SdkTool;
  global?: boolean;
  timeout?: number;
}

/**
 * Registry of hand-written advertised-schema replacements, keyed by the real field schema. Used for
 * fields too large to advertise as-is (`add_element`'s 52-branch element union) or environment-
 * dependent (a codec reading `window.Api`). A private registry rather than `.meta()`, so the
 * replacement doesn't leak into `tool.definition`'s JSON Schema, which reflects the true shape.
 *
 * Value typed `unknown`, not `z.ZodType`: storing a `z.ZodType` as metadata blows up TS's
 * instantiation depth. `withAdvertisedSchema` enforces the real type at the boundary instead.
 */
const advertisedSchemaOverrides = z.registry<{ advertisedSchema: unknown }>();

/**
 * Registers `advertisedSchema` as the `publicShape` replacement for `realSchema`, and returns `realSchema` unchanged.
 */
export const withAdvertisedSchema = <T extends z.ZodType>(
  realSchema: T,
  advertisedSchema: z.ZodType,
): T => {
  advertisedSchemaOverrides.add(realSchema, { advertisedSchema });
  return realSchema;
};

/**
 * Data that only the Node side knows, passed inward to the page on every call.
 */
export interface ToolContext {
  tabId: number;
}

/**
 * Unwraps `ZodOptional`/`ZodDefault`/`ZodCodec` (to its input side, `.def.in`) down to the shape-carrying node.
 */
const stripNonShapeWrappers = (schema: z.core.$ZodType): z.ZodType => {
  let current: z.core.$ZodType = schema;

  while (true) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodDefault) {
      current = current.unwrap();
    } else if (current instanceof z.ZodCodec) {
      current = current.def.in;
    } else {
      break;
    }
  }

  // `ZodCodec.def.in` types as `core.$ZodType`; every codec here is a classic `ZodType` at runtime.
  if (!(current instanceof z.ZodType)) {
    throw new Error("Encountered a non-classic zod schema while unwrapping");
  }

  return current;
};

export class ToolImplementation<SchemaT extends z.ZodSchema> {
  constructor(
    private readonly tool: Omit<Tool, "definition"> & {
      definition: Omit<Tool["definition"], "inputSchema">;
    },
    private readonly inputSchema: SchemaT,
    private readonly _run: (
      this: ToolImplementation<SchemaT>,
      params: z.input<SchemaT>,
      context: ToolContext,
    ) => CallToolResult | Promise<CallToolResult>,
  ) {}

  get name() {
    return this.tool.definition.name;
  }

  get definition(): Tool {
    return {
      ...this.tool,
      definition: {
        ...this.tool.definition,
        inputSchema: z.toJSONSchema(this.inputSchema, { io: "input" }),
      } as Tool["definition"],
    };
  }

  /**
   * Projects this tool's real input schema into a shallow zod object `registerTool` can advertise -
   * real top-level parameter names instead of one opaque `params` blob. Each field advertises its
   * real type unless overridden via `withAdvertisedSchema`, but is registered as `z.any().meta(...)`
   * carrying that type's JSON Schema: `registerTool` validates arguments in Node against whatever
   * schema it's given, and some fields are (or contain) codecs that read `window.Api`, which doesn't
   * exist in Node. Validation still only happens page-side, in `tool.run`; `z.any()` just advertises.
   */
  get publicShape(): Record<string, z.ZodType> {
    if (!(this.inputSchema instanceof z.ZodObject)) {
      throw new Error("publicShape expects an object schema");
    }

    const shape: Record<string, z.ZodType> = {};

    for (const [key, rawField] of Object.entries(this.inputSchema.shape)) {
      const unwrapped = stripNonShapeWrappers(rawField);

      // Cast is safe: `withAdvertisedSchema` is the only writer, and only accepts a `z.ZodType`.
      const override = advertisedSchemaOverrides.get(unwrapped)
        ?.advertisedSchema as z.ZodType | undefined;

      const advertisedField = override ?? rawField;
      const isOptional =
        advertisedField instanceof z.ZodOptional ||
        advertisedField instanceof z.ZodDefault;

      // `z.any()` still rejects a missing value in Zod v4, so optionality has to be reapplied here.
      let publicField: z.ZodType = z.any().meta(
        z.toJSONSchema(advertisedField, {
          io: "input",
        }) as z.core.JSONSchemaMeta,
      );
      if (isOptional) {
        publicField = publicField.optional();
      }

      shape[key] = publicField;
    }

    return shape;
  }

  async run(params: unknown, context: ToolContext): Promise<CallToolResult> {
    try {
      const validatedParams = this.inputSchema.parse(params);

      const result = await this._run(
        this.inputSchema.encode(validatedParams),
        context,
      );

      if (this.prevTabState?.puzzleChanged) {
        const warningText = `[WARNING] The tab state changed since the last tool call: ${this.prevTabState.formattedDiff}`;
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
      }

      return result;
    } catch (error: unknown) {
      if (error instanceof TabStateChangedError) {
        const tabState = error.tabState;

        let text = error.message;
        if (tabState.puzzleIdChanged) {
          text += `\nHere's the new tab state:\n${tabState.formattedSnapshot}`;
        } else {
          text += `\nHere's what changed:\n${tabState.formattedDiff}`;
        }

        return {
          content: [
            {
              type: "text",
              text,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `${error instanceof Error ? error.message : String(error)}\n\nTechnical error: fix the call and retry; don't relay this to the user.`,
          },
        ],
        isError: true,
      };
    }
  }

  private prevTabState?: TabState;

  protected checkPrevTabState(allowChanges = false) {
    this.prevTabState = TabState.read();

    if (!allowChanges && this.prevTabState.puzzleChanged) {
      throw new TabStateChangedError(this.prevTabState);
    }

    return this.prevTabState;
  }

  protected async updatePuzzle(
    updateCallback: (puzzle: PuzzlePublic) => { puzzle?: PuzzlePublic } | void,
    copyCallback: (
      from: z.output<typeof PuzzleSchema>,
      to: z.output<typeof PuzzleSchema>,
    ) => void,
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
    operationDescription:
      | string
      | ((puzzle: PuzzlePublic, updateResult: UpdateResultT) => string),
  ): Promise<{ tabState: TabState; result: UpdateResultT }>;
  protected async updatePuzzle<UpdateResultT>(
    updateCallback: (
      puzzle: PuzzlePublic,
    ) => { puzzle?: PuzzlePublic; result?: UpdateResultT } | void,
    copyCallback: (
      from: z.output<typeof PuzzleSchema>,
      to: z.output<typeof PuzzleSchema>,
      updateResult: UpdateResultT,
    ) => void,
    operationDescription:
      | string
      | ((puzzle: PuzzlePublic, updateResult?: UpdateResultT) => string),
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

        copyCallback(
          result.updatedSudokuMakerPuzzle,
          sudokuMakerPuzzle,
          updatePuzzleResult!,
        );
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
        const { index, targetElement, clueType } = getElementWithClueById(
          puzzle,
          elementId,
        );

        const cluesKey = clueType.key;
        const clues = ((targetElement.config as any)[cluesKey] as any[]).map(
          (clue, index) => ({
            index,
            clue,
            cells: clueType.getAffectedCells(clue),
          }),
        );
        const matchingClues = clueMatches.map((match, groupIndex) => {
          if ("clueCells" in match) {
            return clues.filter((clue) =>
              match.clueCells.every((cell) => clue.cells.includes(cell)),
            );
          }

          const groupMatches = match.positions.map(
            (position) => clues[position - 1],
          );
          if (groupMatches.some((item) => !item)) {
            throw new Error(
              `Group #${groupIndex + 1}: invalid positions provided - this element has ${clues.length} clues.`,
            );
          }
          return groupMatches;
        });
        const allMatchingIndexes = new Set(
          matchingClues.flat().map(({ index }) => index),
        );

        if (allMatchingIndexes.size === 0) {
          const allClueCells = clues.map(
            ({ cells }) => `(${cells.join(", ") || "none"})`,
          );

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
          result: { index, cluesKey, matchingClues, allMatchingIndexes },
        };
      },
      (from, to, { index, cluesKey }) => {
        (to.allConstraints[index].config as any)[cluesKey] = (
          from.allConstraints[index].config as any
        )[cluesKey];
      },
      operationDescription,
    );

    const updatedElement = tabState.puzzle.allElements[index];

    const messages: string[] = [];
    for (const [groupIndex, matches] of matchingClues.entries()) {
      if ("clueCells" in clueMatches[groupIndex]) {
        const formattedClues = matches.map(
          ({ index, cells }) => `position ${index + 1}: ${cells.join(" ")}`,
        );
        messages.push(
          `Group #${groupIndex + 1} - targeted ${matches.length} clues: [${formattedClues.join(", ")}]`,
        );
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
