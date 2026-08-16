import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { type CellCoords, CellId } from "../../SudokuMakerSchemas";
import { copyCells, toShortCellNotation, updatePuzzle } from "../utils";

export const updateCellValuesTool = new ToolImplementation(
  {
    definition: {
      name: "update_cell_values",
      title: "Update cell values",
      description:
        // language=markdown
        `
Set or clear the solver-entered value (a hand-entered digit, not a given/fixed clue)
in one or more grid cells - what a human solver would type in while solving.

To change given digits instead, use \`update_given_digits\`.

Setting a value also clears any candidates/corner marks already in that cell.
`.trim(),
    },
  },
  z.object({
    cells: z.array(CellId).describe("Target cells."),
    digit: z.number().int().min(-1).describe(
      // language=markdown
      `The digit to place in each target cell, or \`-1\` to clear the cell's value.`,
    ),
  }),
  ({ cells, digit }) => {
    const updatedCells: CellCoords[] = [];
    const skippedCells: CellCoords[] = [];

    updatePuzzle(
      (puzzle) => {
        for (const coords of cells) {
          const { row, column } = coords;
          const cell = puzzle.cells[row - 1][column - 1];

          if (cell.given) {
            skippedCells.push(coords);
            continue;
          }

          cell.value = digit === -1 ? undefined : digit;
          cell.candidates = [];
          cell.cornerPencilMarks = [];
          updatedCells.push(coords);
        }
      },
      (from, to) => copyCells(from.cells, to.cells),
      (digit === -1 ? "Remove values from " : `Put value ${digit} into `) +
        toShortCellNotation(cells),
    );

    if (skippedCells.length === 0) {
      return {
        content: [{ type: "text", text: "Updated successfully." }],
      };
    }

    if (updatedCells.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to update the cells because they all contain given digits.",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Updated cells ${toShortCellNotation(updatedCells)} successfully.`,
        },
        {
          type: "text",
          text: `Failed to update cells ${toShortCellNotation(skippedCells)} because they contain given digits.`,
        },
      ],
    };
  },
);
