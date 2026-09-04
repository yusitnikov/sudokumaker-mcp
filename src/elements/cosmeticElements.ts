import { ElementType } from "./ElementType";
import { LineStyle } from "./LineStyle";
import { formatCellNotation, IVector2, SudokuLayer } from "../SudokuMakerSchemas";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";

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
    style: z
      .intersection(
        LineStyle,
        z.object({
          layer: SudokuLayer.optional(), // Undefined means it's automatic - "on top" if edges are overlaying edges of the grid.
        }),
      )
      .describe(""),
  }),
  clue: {
    key: "lines",
    schema: z.array(IVector2).describe(""),
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

const SymbolCommonParams = z
  .object({
    angle: z.number().describe(""),
    fill: z.string().describe(""),
    stroke: z.string().describe(""),
    strokeWidth: z.number().describe(""),
  })
  .meta({
    description: "",
  });

const RectangleSymbolParams = z
  .intersection(
    SymbolCommonParams,
    z.object({
      type: z.literal(SymbolType.Rectangle).describe("Rectangle"),
      width: z.number().describe(""),
      height: z.number().describe(""),
      fill: z.string().describe(""),
    }),
  )
  .describe("");

const EllipseSymbolParams = z
  .intersection(
    SymbolCommonParams,
    z.object({
      type: z.literal(SymbolType.Ellipse).describe("Ellipse"),
      rx: z.number().describe(""),
      ry: z.number().describe(""),
    }),
  )
  .describe("");

const TextSymbolParams = z
  .intersection(
    SymbolCommonParams,
    z.object({
      type: z.literal(SymbolType.Text).describe("Text"),
      text: z.string().describe(""),
      size: z.number().describe(""),
    }),
  )
  .describe("");

const ArrowSymbolParams = z
  .intersection(
    SymbolCommonParams,
    z.object({
      type: z.literal(SymbolType.Arrow).describe("Arrow"),
      length: z.number().describe(""),
      headSize: z.number().describe(""),
    }),
  )
  .describe("");

const SymbolParams = z
  .union([RectangleSymbolParams, EllipseSymbolParams, TextSymbolParams, ArrowSymbolParams])
  .describe("");

export const CosmeticSymbol = z
  .object({
    position: IVector2,
    layer: SudokuLayer,
    params: SymbolParams,
  })
  .describe("");

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
