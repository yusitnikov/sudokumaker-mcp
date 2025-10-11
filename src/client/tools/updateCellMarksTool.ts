import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import {
  type CellCoords,
  CellId,
  CellSchemaNoId,
} from "../../SudokuMakerSchemas";
import {
  copyCells,
  getPuzzle,
  toShortCellNotation,
  updatePuzzle,
} from "../utils";

export const updateCellMarksTool = new ToolImplementation(
  {
    definition: {
      name: "update_cell_marks",
      title: "Update cell marks and colors",
      description:
        "Modify (add, update or delete) the marks (candidates, corner marks, colors) in the grid cells",
    },
  },
  z.object({
    operationDescription: z
      .string()
      .optional()
      .describe(
        "Human-readable summary of what this operation does. " +
          "This helps the non-technical user understand the action they're approving.",
      ),
    cells: z.array(CellId).describe("Cells to modify"),
    operation: z
      .enum(["add", "replace", "remove"])
      .describe(
        "Operation to apply to existing cell marks: " +
          '"add" - add given marks to the existing cell marks, ' +
          '"replace" - replace (override) the existing cell marks with the given marks, ' +
          '"remove" - subtract the given marks from the existing cell marks. ' +
          'Use the "replace" operation with an empty array to remove all marks of a kind',
      ),
    candidates: CellSchemaNoId.shape.candidates.optional(),
    cornerPencilMarks: CellSchemaNoId.shape.cornerPencilMarks.optional(),
    colors: CellSchemaNoId.shape.colors.optional(),
  }),
  ({
    operationDescription,
    cells,
    operation,
    candidates,
    cornerPencilMarks,
    colors,
  }) => {
    const updatedCells: CellCoords[] = [];
    const skippedCells: CellCoords[] = [];

    updatePuzzle(
      (puzzle) => {
        for (const coords of cells) {
          const { row, column } = coords;
          const cell = puzzle.cells[row - 1][column - 1];

          if (cell.value !== undefined && (candidates || cornerPencilMarks)) {
            skippedCells.push(coords);
            continue;
          }

          const update = (
            key: "candidates" | "cornerPencilMarks" | "colors",
            value: number[] | undefined,
          ) => {
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
      },
      (from, to) => copyCells(from.cells, to.cells),
      operationDescription || "Update marks for " + toShortCellNotation(cells),
    );

    const newCells = getPuzzle().cells;
    const updatedCellsDescription =
      updatedCells.length && operation !== "replace"
        ? [
            {
              type: "text" as const,
              text:
                "Here are the cells marks after the update:\n" +
                updatedCells
                  .map((coords) => {
                    const cell = newCells[coords.row - 1][coords.column - 1];

                    return (
                      `- ${toShortCellNotation(coords)}: ` +
                      // describe only mark types that were requested to change
                      [
                        candidates &&
                          `candidates - ${JSON.stringify(cell.candidates)}`,
                        cornerPencilMarks &&
                          `corner marks - ${JSON.stringify(cell.cornerPencilMarks)}`,
                        colors && `colors - ${JSON.stringify(cell.colors)}`,
                      ]
                        .filter(Boolean)
                        .join(", ") +
                      "."
                    );
                  })
                  .join("\n"),
            },
          ]
        : [];

    if (skippedCells.length === 0) {
      return {
        content: [
          { type: "text", text: "Updated successfully." },
          ...updatedCellsDescription,
        ],
      };
    }

    if (updatedCells.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to update the cells because they all contain value.",
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
          text: `Failed to update cells ${toShortCellNotation(skippedCells)} because they contain value.`,
        },
        ...updatedCellsDescription,
      ],
    };
  },
);
