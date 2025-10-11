import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { CellId } from "../../SudokuMakerSchemas";
import { copyCells, toShortCellNotation, updatePuzzle } from "../utils";

export const updateGivenDigitsTool = new ToolImplementation(
  {
    definition: {
      name: "update_given_digits",
      title: "Update given digits",
      description: "Modify (add, update or delete) given digits in the cells",
    },
  },
  z.object({
    cells: z.array(CellId).describe("Cells to modify"),
    digit: z
      .number()
      .int()
      .min(-1)
      .describe(
        "The digit to place into the cells, or -1 to remove given digits from the specified cells",
      ),
  }),
  ({ cells, digit }) => {
    updatePuzzle(
      (puzzle) => {
        for (const { row, column } of cells) {
          const cell = puzzle.cells[row - 1][column - 1];

          cell.given = digit !== -1;
          cell.value = digit === -1 ? undefined : digit;
          cell.candidates = [];
          cell.cornerPencilMarks = [];
        }
      },
      (from, to) => copyCells(from.cells, to.cells),
      (digit === -1
        ? "Remove given digits from "
        : `Put given ${digit} into `) + toShortCellNotation(cells),
    );

    return {
      content: [{ type: "text", text: "Updated successfully." }],
    };
  },
);
