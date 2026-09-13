// noinspection JSUnusedGlobalSymbols

import type * as types from "./types";

declare global {
  const helpers: types.InitialCodeScopeHelpers;
  const input: {
    groups: {
      cells: number[];
      value: string;
    }[];
  };
  const puzzle: types.InitialCodePuzzle;
  const sudoku: types.InitialCodePuzzle;
}
