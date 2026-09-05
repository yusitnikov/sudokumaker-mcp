import { ElementType } from "./ElementType";
import { CellsArray, CellsRectangle, parseCellNotation, PuzzleTypeNative } from "../SudokuMakerSchemas";
import { LineStyle } from "./LineStyle";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";
import { NoSuchHandleError } from "../client/format/NoSuchHandleError";
import { leafNode } from "../client/format/generic/leafNode";
import { childHandle } from "../client/format/childHandle";
import { formatHandleMarker } from "../client/format/formatHandleMarker";

const sudokuRulesRedundantOnSudokuTypeReason = `
A puzzle whose type is "${PuzzleTypeNative.Sudoku}" already implies row/column uniqueness
without this element present - adding it there is redundant.
This element only has an effect on a "${PuzzleTypeNative.Custom}"-type puzzle,
where nothing about rows or columns is implicit.
`.trim();

export const SudokuRulesElement = new SudokuMakerElement({
  type: ElementType.SudokuRules,
  schema: z.object({
    areas: z
      .array(CellsRectangle)
      .optional()
      .describe("Rectangles the rule is restricted to. If omitted, the rule applies to the whole grid."),
  }),
  main: {
    title: "Rows and columns",
    description: "All rows and columns must contain different digits.",
  },
  extraDocs: [
    {
      header: "Availability",
      contents: sudokuRulesRedundantOnSudokuTypeReason,
    },
  ],
  getRefuseAddReason: (spec) =>
    spec.type === PuzzleTypeNative.Sudoku ? sudokuRulesRedundantOnSudokuTypeReason : undefined,
});

export const GivensElement = new SudokuMakerElement({
  type: ElementType.Givens,
  main: {
    title: "Given digits",
    description:
      "This elements doesn't do anything, just indicates that the setter wants to place some given digits. " +
      "The actual given digits are being placed by editing the grid cells.",
  },
});

export const RegionsElement = new SudokuMakerElement({
  type: ElementType.Regions,
  schema: z.object({
    regions: CellsArray(
      // Transform internal zero-based region index to the visible region number
      z
        .codec(z.number(), z.number(), {
          encode: (value) => value + 1,
          decode: (value) => value - 1,
        })
        .describe(
          "Region number assigned to the cell. " +
            "Cells that have the same index are part of the same region. " +
            "0 means no region.",
        ),
    ),
  }),
  configFormat: {
    regions: {
      child(node, segment) {
        let coords;
        try {
          coords = parseCellNotation(segment);
        } catch {
          throw new NoSuchHandleError(node.handle, "cell notation, e.g. r2c3");
        }
        const row = node.value[coords.row - 1];
        const columnIndex = coords.column - 1;
        if (row?.[columnIndex] === undefined) {
          throw new NoSuchHandleError(node.handle, "cell notation, e.g. r2c3");
        }
        return leafNode(
          row[columnIndex],
          (value) => {
            row[columnIndex] = value;
          },
          childHandle(node.handle, segment),
          node.root,
        );
      },

      format(node, opts) {
        if (opts.collapse) {
          const height = node.value.length;
          const width = node.value[0]?.length ?? 0;
          return `${width}×${height} regions${formatHandleMarker(node, opts)}`;
        }

        return "\n" + node.value.map((row) => "  " + row.map((v) => (v === 0 ? "." : v)).join(" ")).join("\n");
      },

      diff(from, to) {
        const lines: string[] = [""];
        to.value.forEach((row, rowIndex) => {
          const fromRow = from.value[rowIndex];
          if (JSON.stringify(row) === JSON.stringify(fromRow)) {
            return;
          }
          const rowNumber = rowIndex + 1;
          lines.push(`  r${rowNumber} - ${fromRow.map((v) => (v === 0 ? "." : String(v))).join(" ")}`);
          lines.push(`  r${rowNumber} + ${row.map((v) => (v === 0 ? "." : String(v))).join(" ")}`);
        });
        return lines.join("\n");
      },
    },
  },
  main: {
    title: "Regions",
    description: "Digits cannot repeat in marked regions.",
    defaultConfig: {
      // TODO: construct dynamically based on spec
      regions: [
        [1, 1, 1, 2, 2, 2, 3, 3, 3],
        [1, 1, 1, 2, 2, 2, 3, 3, 3],
        [1, 1, 1, 2, 2, 2, 3, 3, 3],
        [4, 4, 4, 5, 5, 5, 6, 6, 6],
        [4, 4, 4, 5, 5, 5, 6, 6, 6],
        [4, 4, 4, 5, 5, 5, 6, 6, 6],
        [7, 7, 7, 8, 8, 8, 9, 9, 9],
        [7, 7, 7, 8, 8, 8, 9, 9, 9],
        [7, 7, 7, 8, 8, 8, 9, 9, 9],
      ],
    },
  },
});

export const DiagonalMinusElement = new SudokuMakerElement({
  type: ElementType.DiagonalMinus,
  schema: z.object({
    style: LineStyle,
  }),
  main: {
    title: "Negative diagonal",
    description: "Digits cannot repeat along the negative diagonal",
    defaultConfig: {
      style: {
        color: "#34bbe6ff",
        thickness: 0.02,
      },
    },
  },
});

export const DiagonalPlusElement = new SudokuMakerElement({
  type: ElementType.DiagonalPlus,
  schema: z.object({
    style: LineStyle,
  }),
  main: {
    title: "Positive diagonal",
    description: "Digits cannot repeat along the positive diagonal",
    defaultConfig: {
      style: {
        color: "#34bbe6ff",
        thickness: 0.02,
      },
    },
  },
});

export const AntikingElement = new SudokuMakerElement({
  type: ElementType.Antiking,
  main: {
    title: "Antiking",
    description: "Cells separated by a king’s move in chess cannot have the same digit.",
  },
});

export const AntiknightElement = new SudokuMakerElement({
  type: ElementType.Antiknight,
  main: {
    title: "Antiknight",
    description: "Cells separated by a knight’s move in chess cannot have the same digit.",
  },
});

export const DisjointGroupsElement = new SudokuMakerElement({
  type: ElementType.DisjointGroups,
  main: {
    title: "Disjoint groups",
    description: "Cells with the same position within the boxes contain all the numbers 1 to 9",
  },
});

export const NonconsecutiveElement = new SudokuMakerElement({
  type: ElementType.Nonconsecutive,
  main: {
    title: "Non-consecutive",
    description: "Cells that are orthogonally adjacent cannot contain consecutive digits.",
  },
});
