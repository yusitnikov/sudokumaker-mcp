import type { ObjectDescriptor } from "../ObjectDescriptor";
import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import { getUnknownDescriptor } from "../generic/unknownDescriptor";
import { formatHandleMarker } from "../formatHandleMarker";
import type { ElementWithClue } from "../../../elements/types";

export const getClueDescriptor = (elementType: ElementWithClue): ObjectDescriptor<unknown, PuzzlePublic> => {
  const baseDescriptor = getUnknownDescriptor<unknown, PuzzlePublic>();

  return {
    ...baseDescriptor,

    format(node, opts, isRoot) {
      if (opts.collapse) {
        const affectedCells = elementType.clue?.getAffectedCells(node.value as any);
        if (affectedCells?.length) {
          return affectedCells.join(" ") + formatHandleMarker(node, opts);
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
