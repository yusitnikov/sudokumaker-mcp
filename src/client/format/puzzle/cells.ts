import { type PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import {
  type CellPublic,
  parseCellNotation,
} from "../../../SudokuMakerSchemas";
import {
  type ElementByType,
  ElementType,
  RegionsElement,
} from "../../../SudokuMakerElement";
import { NoSuchHandleError } from "../NoSuchHandleError";
import type { FormatOpts } from "../FormatOpts";
import { ObjectNode } from "../ObjectNode";
import type { ObjectDescriptor } from "../ObjectDescriptor";
import { childHandle } from "../childHandle";
import { leafNode } from "../generic/leafNode";
import { gridNotationTopicName } from "../../tools/docs/topicNames";
import { indent } from "../generic/indent";
import { formatHandleMarker } from "../formatHandleMarker";

/** Points the reader at the `grid-notation` docs topic - appended once, after any grid rendering. */
const gridNotationFooterLine = `Read \`${gridNotationTopicName}\` topic for how to read this, DO NOT GUESS!`;

// TODO: malformed copy of the real colors - fix!
const colorNames = [
  "white",
  "red",
  "orange",
  "yellow",
  "light green",
  "green",
  "light blue",
  "blue",
  "purple",
  "magenta",
  "light grey",
  "dark grey",
  "black",
  "bright pink",
  "brown",
  "lime green",
  "teal",
  "royal blue",
  "violet",
];

/** Compacts a list of small positive integers: runs of 3+ consecutive collapse to `first-last`. */
const compactRuns = (values: number[]): string[] => {
  const sorted = [...values].sort((a, b) => a - b);
  const parts: string[] = [];
  let index = 0;
  while (index < sorted.length) {
    let end = index;
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[end] + 1) {
      end++;
    }
    if (end - index >= 2) {
      parts.push(`${sorted[index]}-${sorted[end]}`);
    } else {
      for (let i = index; i <= end; i++) {
        parts.push(String(sorted[i]));
      }
    }
    index = end + 1;
  }
  return parts;
};

/** One cell's full state, in the `grid-notation` token grammar: given/solved digit, candidates, corner marks, colors, validity. */
export const formatCellToken = (cell: CellPublic): string => {
  let core: string;
  if (cell.given && cell.value !== undefined) {
    core = `*${cell.value}`;
  } else if (cell.value !== undefined) {
    core = `[${cell.value}]`;
  } else if (
    !cell.candidates.length &&
    !cell.cornerPencilMarks.length &&
    !cell.colors.length
  ) {
    core = ".";
  } else {
    const parts: string[] = [];
    if (cell.candidates.length) {
      parts.push(compactRuns(cell.candidates).join(""));
    }
    if (cell.cornerPencilMarks.length) {
      parts.push(`^${compactRuns(cell.cornerPencilMarks).join("")}`);
    }
    if (cell.colors.length) {
      parts.push(`#${compactRuns(cell.colors).join(",")}`);
    }
    core = parts.join("") || ".";
  }
  return cell.valid ? core : `X${core}`;
};

const colorLegend = (cellsGrid: CellPublic[][]): string | undefined => {
  const colors = [
    ...new Set(cellsGrid.flatMap((row) => row.flatMap((cell) => cell.colors))),
  ].sort((a, b) => a - b);
  if (!colors.length) {
    return undefined;
  }
  return `Colors: ${colors.map((c) => `${c}=${colorNames[c] ?? c}`).join(", ")}`;
};

/** Reads the enabled `Regions` element off the whole puzzle (`root`), for separators. undefined if none/disabled. */
const findRegionsGrid = (root: PuzzlePublic): number[][] | undefined => {
  const element = root.allElements.find(
    (e): e is ElementByType<ElementType.Regions> =>
      e.config.type === RegionsElement.typeName && e.enabled,
  );
  return element ? element.config.regions : undefined;
};

const regionAt = (
  regions: number[][] | undefined,
  row: number,
  column: number,
): number => (regions ? (regions[row - 1]?.[column - 1] ?? 0) : 0);

const columnWidths = (cellsGrid: CellPublic[][]): number[] => {
  const columnCount = cellsGrid[0]?.length ?? 0;
  const widths = new Array<number>(columnCount).fill(1);
  for (const row of cellsGrid) {
    row.forEach((cell, columnIndex) => {
      widths[columnIndex] = Math.max(
        widths[columnIndex],
        formatCellToken(cell).length,
      );
    });
  }
  return widths;
};

/** Renders one grid row, column-aligned, with `| ` separators wherever the region number differs across the boundary. */
const formatRow = (
  row: CellPublic[],
  rowNumber: number,
  regions: number[][] | undefined,
  widths: number[],
): string => {
  const parts: string[] = [];
  row.forEach((cell, columnIndex) => {
    parts.push(formatCellToken(cell).padEnd(widths[columnIndex]));
    if (columnIndex < row.length - 1) {
      const sameRegion =
        regionAt(regions, rowNumber, columnIndex + 1) ===
        regionAt(regions, rowNumber, columnIndex + 2);
      parts.push(sameRegion ? " " : "| ");
    }
  });
  return parts.join("").trimEnd();
};

const horizontalSeparator = (
  cellsGrid: CellPublic[][],
  rowIndex: number,
  regions: number[][] | undefined,
  widths: number[],
): string | undefined => {
  if (rowIndex >= cellsGrid.length - 1 || !regions) {
    return undefined;
  }
  const columnCount = cellsGrid[0].length;
  let differs = false;
  for (let column = 1; column <= columnCount; column++) {
    if (
      regionAt(regions, rowIndex + 1, column) !==
      regionAt(regions, rowIndex + 2, column)
    ) {
      differs = true;
      break;
    }
  }
  if (!differs) {
    return undefined;
  }
  const width = widths.reduce((sum, w) => sum + w, 0) + (widths.length - 1) * 2;
  return "-".repeat(width);
};

/** Renders the whole grid (or a single-row slice): one line if `opts.collapse`, else windowed by the size floor. */
const formatGridRows = (
  node: ObjectNode<CellPublic[][], PuzzlePublic>,
  opts: FormatOpts,
): string => {
  const cellsGrid = node.value;

  if (opts.collapse) {
    const height = cellsGrid.length;
    const width = cellsGrid[0].length;
    return `${width}×${height} grid${formatHandleMarker(node, opts)}`;
  }

  const regions = findRegionsGrid(node.root);
  const widths = columnWidths(cellsGrid);

  const result: string[] = [""];

  cellsGrid.forEach((row, rowIndex) => {
    result.push(formatRow(row, rowIndex + 1, regions, widths));
    const separator = horizontalSeparator(cellsGrid, rowIndex, regions, widths);
    if (separator) {
      result.push(separator);
    }
  });

  const legend = colorLegend(cellsGrid);
  if (legend) {
    result.push(legend);
  }

  result.push(gridNotationFooterLine);

  return indent(result.join("\n"));
};

const diffGridRows = (
  fromGrid: CellPublic[][],
  toGrid: CellPublic[][],
  root: PuzzlePublic,
): string => {
  const regions = findRegionsGrid(root);
  const widths = columnWidths(toGrid);

  const changedLines: string[] = [];
  toGrid.forEach((row, rowIndex) => {
    const fromRow = fromGrid[rowIndex];
    const changed = row.some(
      (cell, colIndex) =>
        JSON.stringify(cell) !== JSON.stringify(fromRow[colIndex]),
    );
    if (!changed) {
      return;
    }
    const rowNumber = rowIndex + 1;
    changedLines.push(
      `r${rowNumber} - ${formatRow(fromRow, rowNumber, regions, widths)}`,
    );
    changedLines.push(
      `r${rowNumber} + ${formatRow(row, rowNumber, regions, widths)}`,
    );
  });

  const lines: string[] = [""];

  lines.push(...changedLines);

  const legend = colorLegend(toGrid);
  if (legend) {
    lines.push(legend);
  }

  lines.push(gridNotationFooterLine);

  return lines.join("\n");
};

const cellChild = (
  cellsGrid: CellPublic[][],
  node: ObjectNode<CellPublic[][], PuzzlePublic>,
  segment: string,
): ObjectNode<any, PuzzlePublic> => {
  const rowOnly = /^r(-?\d+)$/.exec(segment);
  if (rowOnly) {
    const rowIndex = Number(rowOnly[1]) - 1;
    const row = cellsGrid[rowIndex];
    if (!row) {
      throw new NoSuchHandleError(
        node.handle,
        "cell notation, e.g. r2c3 or r2",
      );
    }
    // Wrapped in a one-row grid, which is what `formatGridRows` and `cellRowDescriptor` take;
    // the setter unwraps it again so the write lands on the grid rather than on the wrapper.
    return new ObjectNode(
      [row],
      ([newRow]) => {
        cellsGrid[rowIndex] = newRow;
      },
      childHandle(node.handle, segment),
      node.root,
      cellRowDescriptor,
    );
  }

  let coords;
  try {
    coords = parseCellNotation(segment);
  } catch {
    throw new NoSuchHandleError(node.handle, "cell notation, e.g. r2c3 or r2");
  }
  const row = cellsGrid[coords.row - 1];
  const cell = row?.[coords.column - 1];
  if (!cell) {
    throw new NoSuchHandleError(node.handle, "cell notation, e.g. r2c3 or r2");
  }
  return leafNode(
    cell,
    (value) => {
      row[coords.column - 1] = value;
    },
    childHandle(node.handle, segment),
    node.root,
  );
};

/** Cells - one grid, one token per cell, separators from root.allElements. */
export const cellsDescriptor: ObjectDescriptor<CellPublic[][], PuzzlePublic> = {
  child(node, segment) {
    return cellChild(node.value, node, segment);
  },
  format(node, opts) {
    return formatGridRows(node, opts);
  },
  diff(from, to) {
    return diffGridRows(from.value, to.value, to.root);
  },
};

/** A single-row slice, addressed as `cells.r2`, whose own children are `c3` (column) segments. */
const cellRowDescriptor: ObjectDescriptor<CellPublic[][], PuzzlePublic> = {
  child(node, segment) {
    const columnOnly = /^c(-?\d+)$/.exec(segment);
    if (!columnOnly) {
      throw new NoSuchHandleError(node.handle, "column notation, e.g. c3");
    }
    const row = node.value[0];
    const columnIndex = Number(columnOnly[1]) - 1;
    const cell = row?.[columnIndex];
    if (!cell) {
      throw new NoSuchHandleError(node.handle, "column notation, e.g. c3");
    }
    return leafNode(
      cell,
      (value) => {
        row[columnIndex] = value;
      },
      childHandle(node.handle, segment),
      node.root,
    );
  },
  format(node, opts) {
    return formatGridRows(node, opts);
  },
  diff(from, to) {
    return diffGridRows(from.value, to.value, to.root);
  },
};
