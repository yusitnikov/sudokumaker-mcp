import { ObjectNode } from "../ObjectNode";
import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import type { ObjectDescriptor } from "../ObjectDescriptor";
import { cellsDescriptor } from "./cells";
import { stringDescriptor } from "../generic/stringDescriptor";
import {
  getPlainObjectDescriptor,
  plainObjectDescriptor,
} from "../generic/plainObjectDescriptor";
import { getArrayDescriptor } from "../generic/arrayDescriptor";
import { elementDescriptor } from "./element";

/** The root node for a whole-puzzle read/diff: `render`/`renderDiff` at `RootT = Puzzle`. */
export const puzzleNode = (
  value: PuzzlePublic,
): ObjectNode<PuzzlePublic, PuzzlePublic> =>
  new ObjectNode(value, "", value, puzzleDescriptor);

const baseDescriptor = getPlainObjectDescriptor<PuzzlePublic, PuzzlePublic>({
  childMap: {
    name: stringDescriptor,
    author: stringDescriptor,
    comment: stringDescriptor,
    messages: plainObjectDescriptor,
    spec: plainObjectDescriptor,
    cells: cellsDescriptor,
    allElements: getArrayDescriptor({
      itemDescriptor: elementDescriptor,
      key: (element) => String(element.id),
      countLabel: "elements",
      sizeLimit: 1000,
    }),
    // TODO: other fields?
  },
  allowOtherKeys: false,
});

/** Puzzle - the header lines, then cells and each element, in printing order. */
export const puzzleDescriptor: ObjectDescriptor<PuzzlePublic, PuzzlePublic> = {
  ...baseDescriptor,
  diff(from, to) {
    // Special case for the puzzle node - the callers don't check if there's any diff
    if (JSON.stringify(from.value) === JSON.stringify(to.value)) {
      return "no changes";
    }

    return baseDescriptor.diff(from, to);
  },
};
