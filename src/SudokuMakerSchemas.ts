import { z } from "zod";
import type { CellCoordsTransformHelper } from "./SudokuMakerApi";
import { introTopicName } from "./client/tools/docs/topicNames";

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
    description:
      "Coordinates of one rectangle in the grid. The coordinate system starts in the top left corner of the grid and go right and down from there. Each grid cell is 1x1, so the cell size is the unit of the coordinate system.",
  });

export const IVector2 = z
  .object({
    x: z.number().describe("Horizontal coordinate"),
    y: z.number().describe("Vertical coordinate"),
  })
  .meta({
    description:
      "Coordinates of one point in the grid. The coordinate system starts in the top left corner of the grid and go right and down from there. Each grid cell is 1x1, so the cell size is the unit of the coordinate system.",
  });

const CellIdInternal = z.number().meta({
  description:
    "Unique numeric identification of a grid cell. " +
    "It corresponds to the zero-based cell index in the flat cells array, starting from the top left cell, and going in the reading order (left to right, top to bottom). " +
    "So, the top left cell ID is 0, and cell in row 2 column 3 of a 6x6 puzzle would be 8 (row index 1 multiplied by columns number 6, plus column index 2: 1 * 6 + 2 = 8).",
});

/** Plain `{row, column}` pair, 1-based. Not a schema of its own - it's the shape every cell-like codec below computes internally between parsing/formatting the public "rXcY" string and doing its own row/column math. */
export interface CellCoords {
  row: number;
  column: number;
}

/** The public "rXcY" cell-coordinate string - what `CellIdPublic` (and, riding on it, `CellId`, `CornerId`, `OuterCellId`, and each side of `EdgeId`) encodes to and decodes from. */
export type CellNotation = string;

const shortCellNotationPattern = /^r(-?\d+)c(-?\d+)$/;

/** Parses a public "rXcY" string into its row/column. Throws with a message spelling out the expected format, since this is where every cell-like codec's format errors originate. */
export const parseCellNotation = (cellStr: CellNotation): CellCoords => {
  const match = shortCellNotationPattern.exec(cellStr);
  if (!match) {
    throw new Error(
      `Invalid cell coordinates "${cellStr}" - expected "rXcY" notation, e.g. "r2c3".`,
    );
  }

  const [, row, column] = match;
  return { row: Number(row), column: Number(column) };
};

/** Formats a `{row, column}` pair back into the public "rXcY" string. */
export const formatCellNotation = ({ row, column }: CellCoords): CellNotation =>
  `r${row}c${column}`;

export const CellIdPublic = z
  .string()
  .regex(shortCellNotationPattern, {
    error: `Cell IDs must be specified in the Snider notation - see the \`${introTopicName}\` documentation topic`,
  })
  .meta({
    description:
      'A cell coordinate string in "rXcY" notation, e.g. "r2c3" is row 2, column 3 (both 1-based, counting from the top-left). ' +
      "Row/column may be 0 or negative, or greater than the grid size, for cells outside the grid.",
  });

const getCellCoordsCodecParams = (helper: () => CellCoordsTransformHelper) => ({
  encode: (cellId: number) => {
    const { x, y } = helper().getCoordsFromId(cellId);

    return formatCellNotation({
      row: y + 1,
      column: x + 1,
    });
  },
  decode: (cellStr: CellNotation) => {
    const { row, column } = parseCellNotation(cellStr);

    return helper().getIdFromCoords({
      x: column - 1,
      y: row - 1,
    });
  },
});

// cellIds is the only helper with a "safe" coordinate lookup (returns undefined instead of throwing for
// out-of-grid coordinates), so CellId - unlike CornerId/OuterCellId below - gets its own codec that reports
// out-of-grid cells as a proper zod issue instead of an uncaught throw.
export const CellId: z.ZodCodec<typeof CellIdPublic, typeof CellIdInternal> =
  z.codec(CellIdPublic, CellIdInternal, {
    encode: (cellId) => {
      const { x, y } =
        window.Api.getPuzzle().helpers.cellIds.getCoordsFromId(cellId);

      return formatCellNotation({ row: y + 1, column: x + 1 });
    },
    decode: (cellStr, payload) => {
      const { row, column } = parseCellNotation(cellStr);

      const cellId = window.Api.getPuzzle().helpers.cellIds.getIdFromCoordsSafe(
        { x: column - 1, y: row - 1 },
      );
      if (cellId === undefined) {
        payload.issues.push({
          code: "custom",
          message: `Cell "${cellStr}" is outside the grid.`,
          input: cellStr,
        });
        return z.NEVER;
      }

      return cellId;
    },
  });

const CornerIdInternal = z.number().meta({
  description: "",
});
export const CornerId: z.ZodCodec<
  typeof CellIdPublic,
  typeof CornerIdInternal
> = z.codec(
  CellIdPublic.describe(
    'A cell coordinate string in "rXcY" notation, but naming the cell\'s top-left corner rather than the cell itself ' +
      '(e.g. the corner shared by r2c3, r2c4, r3c3 and r3c4 is named by "r3c4" - the cell below-right of that corner). ' +
      "The named cell may be outside the grid.",
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
  description: "",
});
const EdgeIdPublic = z.tuple([CellIdPublic, CellIdPublic]).meta({
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
            formatCellNotation({
              row: y + 0.5,
              column: x,
            }),
            formatCellNotation({
              row: y + 0.5,
              column: x + 1,
            }),
          ]
        : [
            formatCellNotation({
              row: y,
              column: x + 0.5,
            }),
            formatCellNotation({
              row: y + 1,
              column: x + 0.5,
            }),
          ];
    },
    decode: ([cell1Str, cell2Str]) => {
      const cell1 = parseCellNotation(cell1Str),
        cell2 = parseCellNotation(cell2Str);

      return window.Api.getPuzzle().helpers.edgeIds.getIdFromCoords({
        x: (cell1.column + cell2.column) / 2 - 0.5,
        y: (cell1.row + cell2.row) / 2 - 0.5,
      });
    },
  });

const OuterCellIdInternal = z.number().meta({
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
  description: "",
});

export enum PuzzleTypeNative {
  // noinspection JSUnusedGlobalSymbols
  Sudoku = "sudoku", // Each row, column and region (if applicable) must be of size <number of digits> and filled with all digits
  Custom = "custom", // Anything goes
}
export const PuzzleType = z.enum(PuzzleTypeNative).meta({
  description:
    "Puzzle type: sudoku or custom. " +
    'Having a puzzle of type "sudoku" means having implicit SudokuRules ("Rows and columns") constraint that enforces unique digits in every row and column, ' +
    "but otherwise it's the same (it's not really sudoku, just a latin square, " +
    "since sudoku regions (boxes) are still controlled by a separate constraint).",
});

export const DigitSetSchema = z.codec(
  z.array(z.number()).meta({
    description:
      "A set of digits (usually cell candidates, but not restricted to that)",
  }),
  z.number().meta({
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
  description:
    "A set of cell background colors, represented by color's index in the palette. " +
    "The default palette is: 0 - white, 1 - red, 2 - orange, 3 - yellow, 4 - light green, 5 - green, 6 - light blue, 7 - blue, 8 - purple, 9 - magenta, " +
    "10 - light grey, 11 - dark grey, 12 - black (or very dark grey), 13 - bright pink / fuchsia, 14 - brown, 15 - lime green, 16 - teal/cyan, 17 - royal blue, 18 - violet. " +
    "Colors 1 - 9 are on the main palette, colors 10-18 are not the secondary palette, white is on both palettes. " +
    "Note: if the puzzle doesn't contain any color from the secondary palette yet and the user names a color shade that has analogues on both palettes, " +
    "then the user is likely referencing the color of the main palette. " +
    "Remember, naming colors is subjective, so please be smart when determining which color the user refers to.",
});

export const CellSchemaNoId = z.object({
  given: z
    .boolean()
    .describe(
      'Does the cell contain a given digit? (goes together with the "value" field)',
    ),
  value: z
    .number()
    .optional()
    .describe(
      "The value of the cell: either a given digit or logically deduced value",
    ),
  candidates: DigitSetSchema.describe(
    "Logically deduced set of possible candidates for the cell. " +
      "Empty array means that the cell wasn't analyzed for candidates yet.",
  ),
  cornerPencilMarks: DigitSetSchema.describe(
    "Digits marked in the corners of the cell. " +
      "The meaning of the corner marks is subjective and free to interpretation.",
  ),
  colors: ColorsSet.describe(
    "Background colors of the cell. " +
      "The meaning of colors depends on context: " +
      "sometimes marking a set of cells with the same color means that these cells have the same digit or the same set of digits, " +
      "sometimes colors are purely cosmetic, sometimes it's something else. " +
      "Mixing a color together with white usually means that whatever is associated with the non-white color " +
      "could go in one of the cells marked with this color and white.",
  ),
  valid: z.boolean().describe(""),
});

export const CellSchema = z
  .intersection(
    CellSchemaNoId,
    z
      .codec(
        z.object({ coords: CellIdPublic.describe("This cell's coordinates") }),
        z.object({
          id: CellId.out,
          x: z.number(),
          y: z.number(),
        }),
        {
          encode: ({ x, y }) => ({
            coords: formatCellNotation({ row: y + 1, column: x + 1 }),
          }),
          decode: ({ coords }) => {
            const { row, column } = parseCellNotation(coords);

            return {
              x: column - 1,
              y: row - 1,
              id: CellId.decode(coords),
            };
          },
        },
      )
      .readonly(),
  )
  .describe("Contents of a grid cell");

/**
 * Array of cells:
 * - Internal format: plain array.
 * - Public format: 2D array.
 */
export const CellsArray = <ItemT extends z.ZodType>(itemSchema: ItemT) =>
  z.codec(
    z
      .array(z.array(itemSchema).describe("Row's cells, left to right"))
      .describe("Rows of cells, top to bottom"),
    z.array(itemSchema),
    {
      encode: (array) => {
        const mappedArray = array.map((item) => itemSchema.decode(item));

        const chunkSize = window.Api.getPuzzle().spec.size.width;
        const result: z.output<ItemT>[][] = [];

        for (let offset = 0; offset < mappedArray.length; offset += chunkSize) {
          result.push(mappedArray.slice(offset, offset + chunkSize));
        }

        return result;
      },
      decode: (array) => array.flat().map((item) => itemSchema.encode(item)),
    },
  );

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
    description:
      "Puzzle specification - essential information about puzzle type and dimensions",
  });
