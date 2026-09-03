import { type ElementWithClue } from "../../../SudokuMakerElement";
import type { ObjectDescriptor } from "../ObjectDescriptor";
import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import { getUnknownDescriptor } from "../generic/unknownDescriptor";
import { isPlainObject } from "../generic/isPlainObject";
import { formatCellNotation } from "../../../SudokuMakerSchemas";
import { formatHandleMarker } from "../formatHandleMarker";

/** Labels a clue by the cells it touches, falling back to no label. */
const clueLabel = (clue: unknown, elementType: ElementWithClue): string => {
  // TODO: fix this mess

  if (elementType.clue) {
    try {
      const cells = elementType.clue.getAffectedCells(clue as any);
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
    const point = (clue.position ?? (Array.isArray(clue.points) ? clue.points[0] : undefined)) as
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

export const getClueDescriptor = (elementType: ElementWithClue): ObjectDescriptor<unknown, PuzzlePublic> => {
  const baseDescriptor = getUnknownDescriptor<unknown, PuzzlePublic>();

  return {
    ...baseDescriptor,

    format(node, opts, isRoot) {
      if (opts.collapse) {
        const label = clueLabel(node.value, elementType);
        if (label) {
          return label + formatHandleMarker(node, opts);
        }
      }

      return baseDescriptor.format(node, opts, isRoot);
    },

    getSummary(node) {
      const affectedCellsCount = elementType.clue?.getAffectedCells(node.value as any)?.length;
      if (affectedCellsCount) {
        return `${affectedCellsCount} cells`;
      }

      return baseDescriptor.getSummary?.(node);
    },
  };
};
