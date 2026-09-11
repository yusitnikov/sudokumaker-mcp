import { z } from "zod";
import { type CellNotation, CellId, CellSchemaNoId, parseCellNotation } from "../../SudokuMakerSchemas";
import { operationDescriptionParam } from "./descriptionSnippets";
import { updateCellMarksToolName } from "./toolNames";
import { cellsDiffSummary } from "../format/puzzle/diffSummary";
import { copyCells } from "../copyCells";
import { FrontendCallbackToolImplementation } from "./FrontendCallbackToolImplementation";

export const updateCellMarksTool = new FrontendCallbackToolImplementation(
  {
    name: updateCellMarksToolName,
    title: "Update cell marks and colors",
    description:
      // language=markdown
      `
Add, replace, or remove pencil marks and/or cell colors in one or more grid cells:
candidates (center marks), corner pencil marks, and cell background colors.

A solved cell has no pencil marks, so candidates/\`cornerPencilMarks\` changes don't apply to cells
that already contain a value; colors can still be applied to such cells.
`.trim(),
    inputSchema: z.object({
      operationDescription: operationDescriptionParam,
      cells: z.array(CellId).describe("Target cells."),
      operation: z.enum(["add", "replace", "remove"]).describe(
        // language=markdown
        `
How to combine the given values with each cell's existing marks:

- \`"add"\` unions them in.
- \`"replace"\` overwrites the mark list outright (use an empty array to clear all marks of a kind).
- \`"remove"\` subtracts them out.
`.trim(),
      ),
      candidates: CellSchemaNoId.shape.candidates.optional().describe(
        // language=markdown
        `
        Set of possible candidates for the cell.
        Omit to leave candidates untouched.
`.trim(),
      ),
      cornerPencilMarks: CellSchemaNoId.shape.cornerPencilMarks.optional().describe(
        // language=markdown
        `
          ${CellSchemaNoId.shape.cornerPencilMarks.description}
          
          Omit to leave corner marks untouched.
`.trim(),
      ),
      colors: CellSchemaNoId.shape.colors.optional().describe(
        // language=markdown
        `
        ${CellSchemaNoId.shape.colors.description}
        
        Omit to leave colors untouched.
`.trim(),
      ),
    }),
  },
  async function ({ operationDescription, cells, operation, candidates, cornerPencilMarks, colors }) {
    const {
      tabState,
      result: { updatedCells, skippedCells },
    } = await this.updatePuzzle(
      (puzzle) => {
        const updatedCells: CellNotation[] = [];
        const skippedCells: CellNotation[] = [];

        for (const coords of cells) {
          const { row, column } = parseCellNotation(coords);
          const cell = puzzle.cells[row - 1][column - 1];

          if (cell.value !== undefined && (candidates || cornerPencilMarks)) {
            skippedCells.push(coords);
            continue;
          }

          const update = (key: "candidates" | "cornerPencilMarks" | "colors", value: number[] | undefined) => {
            if (value === undefined) {
              return;
            }

            switch (operation) {
              case "add":
                cell[key] = Array.from(new Set([...cell[key], ...value]));
                break;
              case "replace":
                cell[key] = value;
                break;
              case "remove":
                cell[key] = cell[key].filter((digit) => !value.includes(digit));
                break;
            }
          };
          update("candidates", candidates);
          update("cornerPencilMarks", cornerPencilMarks);
          update("colors", colors);

          updatedCells.push(coords);
        }

        return { result: { updatedCells, skippedCells } };
      },
      (from, to) => copyCells(from.cells, to.cells),
      operationDescription,
    );

    const diffText = cellsDiffSummary(tabState);

    if (skippedCells.length === 0) {
      return {
        updatedPuzzle: tabState.puzzle,
        response: {
          content: [
            {
              type: "text",
              text: [`Updated cell marks in puzzle "${tabState.puzzle.name || "(untitled)"}".`, diffText].join("\n"),
            },
          ],
        },
      };
    }

    if (updatedCells.length === 0) {
      return {
        updatedPuzzle: tabState.puzzle,
        response: {
          content: [
            {
              type: "text",
              text: "Failed to update the cells because they all contain value.",
            },
          ],
          isError: true,
        },
      };
    }

    return {
      updatedPuzzle: tabState.puzzle,
      response: {
        content: [
          {
            type: "text",
            text: [
              `Updated cells ${updatedCells.join(", ")} in puzzle "${tabState.puzzle.name || "(untitled)"}".`,
              diffText,
              "",
              `Failed to update cells ${skippedCells.join(", ")} because they contain value.`,
            ].join("\n"),
          },
        ],
      },
    };
  },
);
