import { ObjectNode } from "../ObjectNode";
import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import { cellsDescriptor } from "./cells";
import { stringDescriptor } from "../generic/stringDescriptor";
import { getPlainObjectDescriptor } from "../generic/plainObjectDescriptor";
import { getArrayDescriptor } from "../generic/arrayDescriptor";
import { elementDescriptor } from "./element";

/** Object node for a puzzle object. */
export const puzzleNode = (
  value: PuzzlePublic,
): ObjectNode<PuzzlePublic, PuzzlePublic> =>
  new ObjectNode(
    value,
    () => {
      throw new Error("This puzzle snapshot is read-only");
    },
    "",
    value,
    puzzleDescriptor,
  );

/** Puzzle - the header lines, then cells and each element, in printing order. */
export const puzzleDescriptor = getPlainObjectDescriptor<
  PuzzlePublic,
  PuzzlePublic
>({
  childMap: {
    name: stringDescriptor,
    author: stringDescriptor,
    comment: stringDescriptor,
    messages: getPlainObjectDescriptor(),
    spec: getPlainObjectDescriptor(),
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
