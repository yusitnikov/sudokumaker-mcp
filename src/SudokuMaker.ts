import type {
  Puzzle as PuzzleSchema,
  ConstraintType,
} from "./SudokuMakerSchemas.ts";
import { z } from "zod";

export type Puzzle = z.infer<typeof PuzzleSchema> & {
  helpers: unknown;
};

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
