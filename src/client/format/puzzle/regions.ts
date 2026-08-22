import type { ObjectDescriptor } from "../ObjectDescriptor";
import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import { parseCellNotation } from "../../../SudokuMakerSchemas";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { leafNode } from "../generic/leafNode";
import { childHandle } from "../childHandle";

/** Regions - the character grid. */
export const regionsDescriptor: ObjectDescriptor<number[][], PuzzlePublic> = {
  child(node, segment) {
    let coords;
    try {
      coords = parseCellNotation(segment);
    } catch {
      throw new NoSuchHandleError(node.handle, "cell notation, e.g. r2c3");
    }
    const value = node.value[coords.row - 1]?.[coords.column - 1];
    if (value === undefined) {
      throw new NoSuchHandleError(node.handle, "cell notation, e.g. r2c3");
    }
    return leafNode(value, childHandle(node.handle, segment), node.root);
  },

  format(node, opts) {
    if (opts.collapse) {
      const height = node.value.length;
      const width = node.value[0]?.length ?? 0;
      return `${width}×${height} regions`;
    }

    return (
      "\n" +
      node.value
        .map((row) => "  " + row.map((v) => (v === 0 ? "." : v)).join(" "))
        .join("\n")
    );
  },

  diff(from, to) {
    const lines: string[] = [""];
    to.value.forEach((row, rowIndex) => {
      const fromRow = from.value[rowIndex];
      if (JSON.stringify(row) === JSON.stringify(fromRow)) {
        return;
      }
      const rowNumber = rowIndex + 1;
      lines.push(
        `  r${rowNumber} - ${fromRow.map((v) => (v === 0 ? "." : String(v))).join(" ")}`,
      );
      lines.push(
        `  r${rowNumber} + ${row.map((v) => (v === 0 ? "." : String(v))).join(" ")}`,
      );
    });
    return lines.join("\n");
  },
};
