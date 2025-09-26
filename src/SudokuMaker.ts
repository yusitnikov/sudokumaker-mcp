export interface Puzzle {
  author: string;
  spec: unknown;
  allConstraints: Constraint[];
  helpers: unknown;
}

export interface Constraint {
  // TODO
}

export const Api = (window as any).Api as {
  getPuzzle(): Puzzle;

  updatePuzzle(
    updater: (puzzle: Puzzle) => void,
    operationDescription?: string,
  ): void;

  PuzzleElementType: Record<number, string>;
};
