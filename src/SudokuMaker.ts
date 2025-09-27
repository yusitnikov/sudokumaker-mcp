import type { ConstraintType } from "./SudokuMakerSchemas.ts";

export interface Puzzle {
  author: string;
  spec: unknown;
  allConstraints: Constraint[];
  helpers: unknown;
}

export interface Constraint {
  // TODO
}

declare global {
  interface Window {
    Api: {
      getPuzzle(): Puzzle;

      updatePuzzle(
        updater: (puzzle: Puzzle) => void,
        operationDescription?: string,
      ): void;

      PuzzleElementType: typeof ConstraintType;
    };
  }
}
