import { z } from "zod";
import type { CellCoordsTransformHelper } from "./SudokuMakerApi.ts";

/*
  AI comment about critical documentation investment areas:
  =========================================================

  Critical Ambiguities

  1. CornerId, EdgeId, OuterCellId (lines 68-79) - These have empty descriptions. I can't understand what these represent or how they map to the grid coordinate system.
  2. DiagonalType naming (lines 85-89) - The comment mentions the names don't align with the actual coordinate system and were named for "historical reasons." This could cause confusion when users
  refer to diagonals.
  3. Cell ID calculation (lines 63-67) - While the formula is given (row * width + column), the example calculation seems off: "cell in row 2 column 3 of a 6x6 puzzle would be 8 (1 * 6 + 2 = 8)" -
  this suggests 1-based rows but 0-based columns, which is inconsistent.
  4. Candidates/Corner marks bitmap (lines 950-954) - The example shows digits 0, 3, 4 for number 25, but sudoku typically uses digits 1-9. Are these 0-based digit indices?
  5. Color palette mapping (lines 955-959) - The long description of color indices is complex and the logic for choosing between main/secondary palettes when colors exist in both is unclear.

  Missing Context

  6. Custom constraint structure (lines 9-39) - The relationship between CustomConstraintInput, CustomConstraintBackend, and CustomConstraintComponent is unclear. How do these pieces work together?
  7. Regions array (line 326) - What do the numbers in the regions array represent? Cell IDs? Region IDs?
  8. Global entropy groups (line 384) - What do these group numbers represent?
  9. Arrow bulb indexing (line 131) - "index 0 is 1s, index 1 is 10s, etc" - this seems to refer to digit place values but isn't clearly explained.
  10. Fog clearing patterns (lines 709-751) - The relationship between patterns, overrides, triggers, and effects in custom fog clearing is complex and underdocumented.

  Minor Clarifications Needed

  11. Rectangle coordinates (lines 41-50) - Uses center point coordinates, which differs from typical top-left coordinate systems.
  12. SudokuLayer enum (lines 204-213) - The layer ordering and when each layer is used isn't clear.
  13. Export settings (lines 1042-1062) - The SudokuPad export settings structure seems incomplete (TODO comment on line 1050).

  These are the areas where additional documentation would be most valuable for understanding how to properly construct and manipulate puzzle objects.
 */

export const CellsRectangle = z
  .object({
    x: z.number().describe("Horizontal coordinate of rectangle's left point"),
    y: z.number().describe("Vertical coordinate of rectangle's top point"),
    width: z.number().describe("Rectangle width"),
    height: z.number().describe("Rectangle height"),
  })
  .meta({
    id: "CellsRectangle",
    description:
      "Coordinates of one rectangle in the grid. The coordinate system starts in the top left corner of the grid and go right and down from there. Each grid cell is 1x1, so the cell size is the unit of the coordinate system.",
  });

export const IVector2 = z
  .object({
    x: z.number().describe("Horizontal coordinate"),
    y: z.number().describe("Vertical coordinate"),
  })
  .meta({
    id: "IVector2",
    description:
      "Coordinates of one point in the grid. The coordinate system starts in the top left corner of the grid and go right and down from there. Each grid cell is 1x1, so the cell size is the unit of the coordinate system.",
  });

const CellIdInternal = z.number().meta({
  id: "CellId",
  description:
    "Unique numeric identification of a grid cell. " +
    "It corresponds to the zero-based cell index in the flat cells array, starting from the top left cell, and going in the reading order (left to right, top to bottom). " +
    "So, the top left cell ID is 0, and cell in row 2 column 3 of a 6x6 puzzle would be 8 (row index 1 multiplied by columns number 6, plus column index 2: 1 * 6 + 2 = 8).",
});
export const CellIdPublic = z
  .object({
    row: z.number().describe("Row number, starting from the top"),
    column: z.number().describe("Column number, starting from the left"),
  })
  .meta({
    id: "CellCoords",
    description: "Coordinates of a cell in the grid",
  });
export type CellCoords = z.input<typeof CellIdPublic>;
// noinspection JSUnusedGlobalSymbols
const getCellCoordsCodecParams = (helper: () => CellCoordsTransformHelper) => ({
  encode: (cellId: number) => {
    const { x, y } = helper().getCoordsFromId(cellId);

    return {
      row: y + 1,
      column: x + 1,
    };
  },
  decode: ({ column, row }: CellCoords) =>
    helper().getIdFromCoords({
      x: column - 1,
      y: row - 1,
    }),
});
export const CellId: z.ZodCodec<typeof CellIdPublic, typeof CellIdInternal> =
  z.codec(
    CellIdPublic,
    CellIdInternal,
    getCellCoordsCodecParams(() => window.Api.getPuzzle().helpers.cellIds),
  );

const CornerIdInternal = z.number().meta({
  id: "CornerId",
  description: "",
});
export const CornerId: z.ZodCodec<
  typeof CellIdPublic,
  typeof CornerIdInternal
> = z.codec(
  CellIdPublic.describe(
    "The desired corner is the top-left corner of this cell (could be a cell outside the grid)",
  ),
  CornerIdInternal,
  getCellCoordsCodecParams(() => {
    const helper = window.Api.getPuzzle().helpers.cornerIds;

    return {
      getCoordsFromId: (id) => helper.getCoordsFromId(id),
      getIdFromCoords: (coords) => helper.getIdFromCornerCoords(coords),
    };
  }),
);

const EdgeIdInternal = z.number().meta({
  id: "EdgeId",
  description: "",
});
const EdgeIdPublic = z.tuple([CellIdPublic, CellIdPublic]).meta({
  id: "EdgeCells",
  description:
    "Coordinates of one cell grid edge, defined by coordinates of 2 cells that share the edge. One of the cells might be outside the grid.",
});
export const EdgeId: z.ZodCodec<typeof EdgeIdPublic, typeof EdgeIdInternal> =
  z.codec(EdgeIdPublic, EdgeIdInternal, {
    encode: (cellId) => {
      const { x, y } =
        window.Api.getPuzzle().helpers.edgeIds.getCoordsFromId(cellId);

      return x % 1 === 0
        ? [
            {
              row: y + 0.5,
              column: x,
            },
            {
              row: y + 0.5,
              column: x + 1,
            },
          ]
        : [
            {
              row: y,
              column: x + 0.5,
            },
            {
              row: y + 1,
              column: x + 0.5,
            },
          ];
    },
    decode: ([cell1, cell2]) =>
      window.Api.getPuzzle().helpers.edgeIds.getIdFromCoords({
        x: (cell1.column + cell2.column) / 2 - 0.5,
        y: (cell1.row + cell2.row) / 2 - 0.5,
      }),
  });

const OuterCellIdInternal = z.number().meta({
  id: "OuterCellId",
  description: "",
});
export const OuterCellId: z.ZodCodec<
  typeof CellIdPublic,
  typeof OuterCellIdInternal
> = z.codec(
  CellIdPublic.describe(
    "Coordinates of a cell outside the grid (row/column would be 0 for top/left cells, or greater than grid height/width for bottom/right cells)",
  ),
  OuterCellIdInternal,
  getCellCoordsCodecParams(() => window.Api.getPuzzle().helpers.outerCellIds),
);

export enum DiagonalTypeNative {
  // noinspection JSUnusedGlobalSymbols
  PositiveDiagonal = 1,
  NegativeDiagonal = -1,
}
export const DiagonalType = z.enum(DiagonalTypeNative).meta({
  id: "DiagonalType",
  description:
    "Diagonal type. Positive diagonal is between bottom left and top right. Negative diagonal is between top left and bottom right. Note that the names don't align with the actual coordinate system of the grid (which starts at top left) - it was named like that for historical reasons. Users will refer to diagonals the way they are named here.",
});

export enum SudokuLayerNative {
  // noinspection JSUnusedGlobalSymbols
  Background = "background",
  Default = "default",
  Foreground = "foreground",
  Grid = "grid",
}
export const SudokuLayer = z.enum(SudokuLayerNative).meta({
  id: "SudokuLayer",
  description: "",
});

export enum PuzzleTypeNative {
  // noinspection JSUnusedGlobalSymbols
  Sudoku = "sudoku", // Each row, column and region (if applicable) must be of size <number of digits> and filled with all digits
  Custom = "custom", // Anything goes
}
export const PuzzleType = z.enum(PuzzleTypeNative).meta({
  id: "PuzzleType",
  description:
    "Puzzle type: sudoku or custom. Having a puzzle of type \"sudoku\" means having implicit SudokuRules constraint that enforces unique digits in every row and column, but otherwise it's the same (it's not really sudoku, just a latin square, since sudoku regions (boxes) are still controlled by a separate constraint).",
});

export const DigitSetSchema = z.codec(
  z.array(z.number()).meta({
    id: "DigitsList",
    description:
      "A set of digits (usually cell candidates, but not restricted to that)",
  }),
  z.number().meta({
    id: "DigitSet",
    description:
      "Integer number that uniquely represents a set of digits (usually used for cell candidates or corner marks). " +
      "It's a bitmap, each bit of it means that the relevant digit is present in the set. " +
      "For instance, number 25 means a set of digits 0, 3 and 4 because it binary representation is 11001 - " +
      "positions with zero-based index 0, 3 and 4 have bits there.",
  }),
  {
    encode: (mask) => Array.from(new window.Api.SmallNumberSet(mask)),
    decode: (list) => +window.Api.SmallNumberSet.from(list),
  },
);
export const ColorsSet = DigitSetSchema.meta({
  id: "ColorsSet",
  description:
    "A set of cell background colors, represented by color's index in the palette. " +
    "The default palette is: 0 - white, 1 - red, 2 - orange, 3 - yellow, 4 - light green, 5 - green, 6 - light blue, 7 - blue, 8 - purple, 9 - magenta, " +
    "10 - light grey, 11 - dark grey, 12 - black (or very dark grey), 13 - bright pink / fuchsia, 14 - brown, 15 - lime green, 16 - teal/cyan, 17 - royal blue, 18 - violet. " +
    "Colors 1 - 9 are on the main palette, colors 10-18 are not the secondary palette, white is on both palettes. " +
    "Note: if the puzzle doesn't contain any color from the secondary palette yet and the user names a color shade that has analogues on both palettes, " +
    "then the user is likely referencing the color of the main palette. " +
    "Remember, naming colors is subjective, so please be smart when determining which color the user refers to.",
});

export const Cell = z
  .intersection(
    z.object({
      given: z.boolean().describe(""),
      value: z.number().optional().describe(""),
      candidates: DigitSetSchema.describe(""),
      cornerPencilMarks: DigitSetSchema.describe(""),
      colors: ColorsSet.describe(""),
      valid: z.boolean().describe(""),
    }),
    z
      .codec(
        CellIdPublic,
        z.object({
          id: CellId.out,
          x: z.number(),
          y: z.number(),
        }),
        {
          encode: ({ x, y }) => ({ row: y + 1, column: x + 1 }),
          decode: (cell) => ({
            x: cell.column - 1,
            y: cell.row - 1,
            id: CellId.decode(cell),
          }),
        },
      )
      .readonly(),
  )
  .describe("");

export const Spec = z
  .object({
    type: PuzzleType.describe(""),
    minDigit: z.number().describe(""),
    maxDigit: z.number().describe(""),
    digitCount: z.number().readonly().describe(""),
    size: z
      .object({
        width: z.number().describe(""),
        height: z.number().describe(""),
      })
      .describe(""),
  })
  .meta({
    id: "Spec",
    description:
      "Puzzle specification - essential information about puzzle type and dimensions",
  });
