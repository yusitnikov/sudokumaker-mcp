import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import { puzzleNode } from "./puzzle";
import type { ObjectNode } from "../ObjectNode";
import { stringifyValue } from "../generic/stringifyValue";
import type { TabState } from "../../tabState";

/** `leadInText` followed by the diff between `from` and `to`, or `noChangesText` alone if they're equal. */
const summarize = <T>(
  from: ObjectNode<T, PuzzlePublic> | undefined,
  to: ObjectNode<T, PuzzlePublic>,
  leadInText: string,
  noChangesText: string,
): string =>
  from === undefined || stringifyValue(from.value) === stringifyValue(to.value)
    ? noChangesText
    : `${leadInText}\n${from.diff(to)}`;

/** Diffs the whole puzzle between `before` and `after`, prefixed with `leadInText`. */
export const puzzleDiffSummary = (
  tabState: TabState,
  leadInText = "This is what changed:",
): string =>
  summarize(
    tabState.previousPuzzle && puzzleNode(tabState.previousPuzzle),
    puzzleNode(tabState.puzzle),
    leadInText,
    "Nothing changed in the puzzle.",
  );

/** Diffs `allElements` between `before` and `after`. */
export const elementsDiffSummary = ({
  puzzle,
  previousPuzzle,
}: TabState): string =>
  summarize(
    previousPuzzle && puzzleNode(previousPuzzle).child("allElements"),
    puzzleNode(puzzle).child("allElements"),
    "This is what changed:",
    "Nothing changed in the elements.",
  );

/** Diffs `cells` between `before` and `after`. */
export const cellsDiffSummary = (
  { puzzle, previousPuzzle }: TabState,
  leadInText = "This is what changed in the cells:",
): string =>
  summarize(
    previousPuzzle && puzzleNode(previousPuzzle).child("cells"),
    puzzleNode(puzzle).child("cells"),
    leadInText,
    "Nothing changed in the cells.",
  );
