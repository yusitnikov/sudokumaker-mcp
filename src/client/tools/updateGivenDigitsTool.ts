import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { CellId } from "../../SudokuMakerSchemas";
import { copyCells, toShortCellNotation, updatePuzzle } from "../utils";
import { updateGivenDigitsToolName } from "./toolNames";

export const updateGivenDigitsTool = new ToolImplementation(
  {
    definition: {
      name: updateGivenDigitsToolName,
      title: "Update given digits",
      description:
        // language=markdown
        `
Set or clear the given digits in one or more grid cells.

Setting a given digit also clears any candidates/corner marks already in that cell.
Marking a cell as given wipes any solver-entered value there and replaces it with the given digit.
`.trim(),
    },
  },
  z.object({
    cells: z.array(CellId).describe("Target cells."),
    digit: z.number().int().min(-1).describe(
      // language=markdown
      `The given digit to place in each target cell, or \`-1\` to remove the given digit from each target cell.`,
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
