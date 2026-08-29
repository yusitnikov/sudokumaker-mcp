import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { copyCells, getPuzzle, updatePuzzle } from "../utils";
import { puzzleDiffSummary } from "../format/puzzle/diffSummary";
import { operationDescriptionParam } from "./descriptionSnippets";
import { updatePuzzleMetadataToolName } from "./toolNames";

export const updatePuzzleMetadataTool = new ToolImplementation(
  {
    definition: {
      name: updatePuzzleMetadataToolName,
      title: "Update Sudoku Maker puzzle metadata",
      description:
        // language=markdown
        `
Change the puzzle's title, author, rules text, completion message, or digit range.
Every field is optional - skip whatever you're not changing.

This tool does not cover the puzzle's grid dimensions - resizing is not supported by any tool by design.
`.trim(),
    },
  },
  z.object({
    operationDescription: operationDescriptionParam,
    name: z.string().optional().describe("Puzzle title, shown to the solver."),
    author: z
      .string()
      .optional()
      .describe("Puzzle author/setter name, shown to the solver."),
    comment: z
      .string()
      .optional()
      .describe(
        "Rules text, shown to the solver. Usually describes the puzzle's rules, but can hold any text.",
      ),
    completionMessage: z
      .string()
      .optional()
      .describe(
        "Message shown to the solver after they successfully complete the puzzle. Pass an empty string to remove it.",
      ),
    minDigit: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        "Lowest digit allowed in the grid (e.g. 1 for standard sudoku, 0 for a 0-indexed variant).",
      ),
    maxDigit: z
      .number()
      .int()
      .optional()
      .describe(
        "Highest digit allowed in the grid (e.g. 9 for standard sudoku).",
      ),
  }),
  ({
    operationDescription,
    name,
    author,
    comment,
    completionMessage,
    minDigit,
    maxDigit,
  }) => {
    const before = getPuzzle();

    const effectiveMinDigit = minDigit ?? before.spec.minDigit;
    const effectiveMaxDigit = maxDigit ?? before.spec.maxDigit;
    if (
      (minDigit !== undefined || maxDigit !== undefined) &&
      effectiveMinDigit > effectiveMaxDigit
    ) {
      return {
        content: [
          {
            type: "text",
            text: `minDigit must be not greater than maxDigit; the resulting range would be ${effectiveMinDigit}..${effectiveMaxDigit}.`,
          },
        ],
        isError: true,
      };
    }

    let clearedCellsCount = 0;

    updatePuzzle(
      (puzzle) => {
        if (name !== undefined) {
          puzzle.name = name;
        }
        if (author !== undefined) {
          puzzle.author = author;
        }
        if (comment !== undefined) {
          puzzle.comment = comment;
        }
        if (completionMessage !== undefined) {
          puzzle.messages.completion = completionMessage || undefined;
        }
        if (minDigit !== undefined) {
          puzzle.spec.minDigit = minDigit;
        }
        if (maxDigit !== undefined) {
          puzzle.spec.maxDigit = maxDigit;
        }
        if (minDigit !== undefined || maxDigit !== undefined) {
          puzzle.spec.digitCount =
            puzzle.spec.maxDigit + 1 - puzzle.spec.minDigit;
        }

        // Automatically remove out of range digits after changing the digits range
        if (minDigit !== undefined || maxDigit !== undefined) {
          const isOutOfRange = (digit: number) =>
            digit < effectiveMinDigit || digit > effectiveMaxDigit;

          for (const row of puzzle.cells) {
            for (const cell of row) {
              let fixed = false;

              if (cell.value !== undefined && isOutOfRange(cell.value)) {
                cell.value = undefined;
                cell.given = false;
                fixed = true;
              }

              if (cell.candidates.some(isOutOfRange)) {
                cell.candidates = cell.candidates.filter(
                  (digit) => !isOutOfRange(digit),
                );
                fixed = true;
              }

              if (cell.cornerPencilMarks.some(isOutOfRange)) {
                cell.cornerPencilMarks = cell.cornerPencilMarks.filter(
                  (digit) => !isOutOfRange(digit),
                );
                fixed = true;
              }

              if (fixed) {
                clearedCellsCount++;
              }
            }
          }
        }
      },
      (from, to) => {
        to.name = from.name;
        to.author = from.author;
        to.comment = from.comment;
        to.messages = from.messages;
        // Sudoku Maker bug: unlike every other field written here, changes to `spec` aren't recorded
        // on the app's undo stack - `undo`/`redo` skip right over them.
        // Nothing to work around from this side; cells cleared below by the range
        // change are still undoable normally, only the `spec` write itself isn't.
        to.spec = from.spec;
        copyCells(from.cells, to.cells);
      },
      operationDescription,
    );

    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: [
            `Updated metadata of puzzle "${after.name || "(untitled)"}".`,
            clearedCellsCount > 0 &&
              `Cleared values/candidates/corner marks that fell outside the new digit range in ${clearedCellsCount} ${clearedCellsCount === 1 ? "cell" : "cells"} - check the diff below and undo if that wasn't intended.`,
            puzzleDiffSummary(before, after),
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);
