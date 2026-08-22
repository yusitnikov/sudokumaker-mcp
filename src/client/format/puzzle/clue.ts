import { getElementByTypeName } from "../../../SudokuMakerElement";
import type { ObjectDescriptor } from "../ObjectDescriptor";
import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import { unknownDescriptor } from "../generic/unknownDescriptor";
import { isPlainObject } from "../generic/isPlainObject";
import { formatCellNotation } from "../../../SudokuMakerSchemas";

/** Labels a clue by the cells it touches, falling back to no label. */
const clueLabel = (
  clue: unknown,
  elementType: ReturnType<typeof getElementByTypeName>,
): string => {
  // TODO: fix this mess

  if (elementType.clue) {
    try {
      // `elementType` is one of 46 concrete element types, each with its own clue shape - `clue`'s
      // real type depends on which one this is, which is exactly the "heterogeneous, resolved only
      // at runtime" case `ObjectNode<any, RootT>` covers at node edges generally.
      const cells = (
        elementType.clue.getAffectedCells as (clue: any) => string[]
      )(clue);
      if (cells.length) {
        return cells.join(" ");
      }
    } catch {
      // Not this clue array's own type, or malformed - fall through to the structural rules below.
    }
  }
  if (isPlainObject(clue)) {
    if (Array.isArray(clue.cells) && clue.cells.length) {
      return (clue.cells as string[]).join(" ");
    }
    const point = (clue.position ??
      (Array.isArray(clue.points) ? clue.points[0] : undefined)) as
      | { x: number; y: number }
      | undefined;
    if (point) {
      return `near ${formatCellNotation({ row: Math.floor(point.y) + 1, column: Math.floor(point.x) + 1 })}`;
    }
    if (typeof clue.name === "string" && clue.name) {
      return clue.name;
    }
  }
  return "";
};

export const getClueDescriptor = (
  elementType: ReturnType<typeof getElementByTypeName>,
): ObjectDescriptor<unknown, PuzzlePublic> => {
  return {
    ...unknownDescriptor,

    format(node, opts) {
      if (opts.collapse) {
        const label = clueLabel(node.value, elementType);
        if (label) {
          return label;
        }
      }

      return unknownDescriptor.format(node, opts);
    },
  };
};
