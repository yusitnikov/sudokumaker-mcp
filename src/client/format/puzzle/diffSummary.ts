import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import { puzzleNode } from "./puzzle";
import { resolveHandle } from "../resolveHandle";
import type { ObjectNode } from "../ObjectNode";

/** `leadInText` followed by the diff between `from` and `to`, or `noChangesText` alone if they're equal. */
const summarize = <T>(
  from: ObjectNode<T, PuzzlePublic>,
  to: ObjectNode<T, PuzzlePublic>,
  leadInText: string,
  noChangesText: string,
): string =>
  JSON.stringify(from.value) === JSON.stringify(to.value)
    ? noChangesText
    : `${leadInText}\n${from.diff(to)}`;

/** Diffs the whole puzzle between `before` and `after`, prefixed with `leadInText`. */
export const puzzleDiffSummary = (
  before: PuzzlePublic,
  after: PuzzlePublic,
  leadInText = "This is what changed:",
): string =>
  summarize(
    puzzleNode(before),
    puzzleNode(after),
    leadInText,
    "Nothing changed in the puzzle.",
  );

/** Diffs `allElements` between `before` and `after`. */
export const elementsDiffSummary = (
  before: PuzzlePublic,
  after: PuzzlePublic,
): string =>
  summarize(
    resolveHandle(puzzleNode(before), "allElements"),
    resolveHandle(puzzleNode(after), "allElements"),
    "This is what changed:",
    "Nothing changed in the elements.",
  );

/** Diffs `cells` between `before` and `after`. */
export const cellsDiffSummary = (
  before: PuzzlePublic,
  after: PuzzlePublic,
): string =>
  summarize(
    resolveHandle(puzzleNode(before), "cells"),
    resolveHandle(puzzleNode(after), "cells"),
    "This is what changed in the cells:",
    "Nothing changed in the cells.",
  );
