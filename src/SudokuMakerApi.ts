// noinspection JSUnusedGlobalSymbols

import type { ConstraintType } from "./SudokuMakerConstraint";
import { z } from "zod";
import { PuzzleSchema } from "./SudokuMakerPuzzleSchema";

type Puzzle = z.infer<typeof PuzzleSchema> & {
  helpers: unknown;
};

declare class DigitSet implements Iterable<number> {
  constructor(set?: DigitSet | number);
  get size(): number;
  add(digit: number): void;
  delete(digit: number): void;
  clear(): void;
  union(set: DigitSet | number): this;
  intersect(set: DigitSet | number): this;
  xor(set: DigitSet | number): this;
  subtract(set: DigitSet | number): this;
  has(digit: number): boolean;
  equals(set: DigitSet | number): boolean;
  isSubsetOf(set: DigitSet | number): boolean;
  isSupersetOf(set: DigitSet | number): boolean;
  isDisjointFrom(set: DigitSet | number): boolean;
  intersects(set: DigitSet | number): boolean;
  getSmallestDigit(): number;
  getLargestDigit(): number;
  valueOf(): number;
  [Symbol.iterator](): Iterator<number>;
  static from(digits: Iterable<number>): DigitSet;
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

      DigitSet: typeof DigitSet;
    };
  }
}
