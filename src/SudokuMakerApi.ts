// noinspection JSUnusedGlobalSymbols

import type { ElementType } from "./SudokuMakerElement.ts";
import { z } from "zod";
import { PuzzleSchema } from "./SudokuMakerPuzzleSchema";

type CellId = number;
interface Coords {
  x: number;
  y: number;
}
export interface CellCoordsTransformHelper {
  getIdFromCoords(coords: Coords): CellId;
  getCoordsFromId(id: CellId): Coords;
}
interface CellCoordsTransformHelperXY extends CellCoordsTransformHelper {
  getX(id: CellId): number;
  getY(id: CellId): number;
}

type Puzzle = z.infer<typeof PuzzleSchema> & {
  helpers: {
    cellIds: CellCoordsTransformHelperXY;
    outerCellIds: CellCoordsTransformHelperXY;
    cornerIds: {
      getIdFromCornerCoords(coords: Coords): CellId;
      getCoordsFromId(id: CellId): Coords;
    };
    edgeIds: CellCoordsTransformHelper;
  };
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

type TriggerableAction =
  | "undo"
  | "redo"
  | "selectAll"
  | "delete"
  | "setEnterDigits"
  | "setEnterCornerPencilMarks"
  | "setEnterCandidates"
  | "setEnterColorMarks"
  | "newConstraint"
  | "openNextConstraint"
  | "openPreviousConstraint"
  | "removeConstraint"
  | "exitConstraintEditor"
  | "clearGrid"
  | "doSingleLogicalStep"
  | "doAllLogicalSteps"
  | "findSolutions"
  | "checkValidity"
  | "stopSolver"
  | "toggleFog";

declare global {
  interface Window {
    Api: {
      getPuzzle(): Puzzle;

      updatePuzzle(
        updater: (puzzle: Puzzle) => void,
        operationDescription?: string,
      ): void;

      triggerAction(action: TriggerableAction): void;

      PuzzleElementType: typeof ElementType;

      DigitSet: typeof DigitSet;
      SmallNumberSet: typeof DigitSet;

      busy: {
        readonly value: boolean;
      };
    };
  }
}
