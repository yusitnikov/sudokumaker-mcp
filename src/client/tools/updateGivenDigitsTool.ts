import { CallbackToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { CellId, parseCellNotation } from "../../SudokuMakerSchemas";
import { updateGivenDigitsToolName } from "./toolNames";
import { cellsDiffSummary } from "../format/puzzle/diffSummary";
import { copyCells } from "../copyCells";

export const updateGivenDigitsTool = new CallbackToolImplementation(
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
  async function ({ cells, digit }) {
    const cellsStr = cells.join(", ");

    const { tabState } = await this.updatePuzzle(
      (puzzle) => {
        for (const cellStr of cells) {
          const { row, column } = parseCellNotation(cellStr);
          const cell = puzzle.cells[row - 1][column - 1];

          cell.given = digit !== -1;
          cell.value = digit === -1 ? undefined : digit;
          cell.candidates = [];
          cell.cornerPencilMarks = [];
        }
      },
      (from, to) => copyCells(from.cells, to.cells),
      digit === -1 ? `Remove given digits from ${cellsStr}` : `Put given ${digit} into ${cellsStr}`,
    );

    return {
      content: [
        {
          type: "text",
          text: [
            `Updated the given digits in puzzle "${tabState.puzzle.name || "(untitled)"}".`,
            cellsDiffSummary(tabState),
          ].join("\n"),
        },
      ],
    };
  },
);
