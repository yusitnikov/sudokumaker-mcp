import { ElementType } from "./ElementType";
import { LineStyle } from "./LineStyle";
import { formatCellNotation, IVector2, SudokuLayer } from "../SudokuMakerSchemas";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";
import { CssHexColor } from "./CssHexColor";

/**
 * Cells touched by one point.
 *
 * A point strictly inside a cell touches only that cell.
 * A point exactly on an edge or corner touches every cell that shares it.
 */
const getCellsTouchingPoint = ({ x, y }: z.input<typeof IVector2>) => {
  const columns = Number.isInteger(x) ? [x, x + 1] : [Math.ceil(x)];
  const rows = Number.isInteger(y) ? [y, y + 1] : [Math.ceil(y)];

  return rows.flatMap((row) => columns.map((column) => formatCellNotation({ row, column })));
};

export const CosmeticLineElement = new SudokuMakerElement({
  type: ElementType.CosmeticLine,
  schema: z.object({
    style: z.object({
      ...LineStyle.shape,
      layer: SudokuLayer.optional().describe(
        `${SudokuLayer.description} Omit for automatic placement: "foreground" if the line overlays grid lines, "default" otherwise.`,
      ),
    }),
  }),
  clue: {
    key: "lines",
    schema: z.array(IVector2).describe("Points the line passes through, in order."),
    // Naive: only looks at each segment's two endpoints, not the segment's actual path.
    getAffectedCells: (points) => [...new Set(points.flatMap(getCellsTouchingPoint))],
  },
  main: {
    title: "Cosmetic lines",
    description: "Place lines without any (programmed) logic associated with them.",
    defaultConfig: {
      style: {
        thickness: 0.15,
        color: "#ff6666",
      },
    },
  },
});

enum SymbolType {
  Rectangle = "rectangle",
  Ellipse = "ellipse",
  Text = "text",
  Arrow = "arrow",
}

const SymbolCommonParams = z.object({
  angle: z.number().describe("Rotation in degrees, clockwise."),
  fill: CssHexColor,
  stroke: CssHexColor,
  strokeWidth: z.number().describe("Stroke thickness, in cell-size units."),
});

const RectangleSymbolParams = z.intersection(
  SymbolCommonParams,
  z.object({
    type: z.literal(SymbolType.Rectangle).describe("Rectangle"),
    width: z.number().describe("Width, in cell-size units."),
    height: z.number().describe("Height, in cell-size units."),
    fill: CssHexColor,
  }),
);

const EllipseSymbolParams = z.intersection(
  SymbolCommonParams,
  z.object({
    type: z.literal(SymbolType.Ellipse).describe("Ellipse"),
    rx: z.number().describe("Horizontal radius, in cell-size units."),
    ry: z.number().describe("Vertical radius, in cell-size units."),
  }),
);

const TextSymbolParams = z.intersection(
  SymbolCommonParams,
  z.object({
    type: z.literal(SymbolType.Text).describe("Text"),
    text: z.string(),
    size: z.number().describe("Font size, in cell-size units."),
  }),
);

const ArrowSymbolParams = z.intersection(
  SymbolCommonParams,
  z.object({
    type: z.literal(SymbolType.Arrow).describe("Arrow"),
    length: z.number().describe("Arrow length, in cell-size units."),
    headSize: z.number().describe("Length of each of the arrowhead's two diagonal strokes, in cell-size units."),
  }),
);

const SymbolParams = z.union([RectangleSymbolParams, EllipseSymbolParams, TextSymbolParams, ArrowSymbolParams]);

export const CosmeticSymbol = z.object({
  position: IVector2.describe(`The symbol's center point - ${IVector2.description}`),
  layer: SudokuLayer,
  params: SymbolParams,
});

export const CosmeticSymbolElement = new SudokuMakerElement({
  type: ElementType.CosmeticSymbol,
  clue: {
    key: "symbols",
    schema: CosmeticSymbol,
    // Naive: only looks at the symbol's center point, not its size or rotation.
    getAffectedCells: (symbol) => getCellsTouchingPoint(symbol.position),
  },
  main: {
    title: "Cosmetic symbols",
    description: "Place symbols (squares, circles, text, arrows) without any (programmed) logic associated with them.",
  },
});
