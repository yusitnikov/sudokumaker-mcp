// noinspection JSUnusedGlobalSymbols,ES6UnusedImports

import type * as types from "./types";

declare global {
  const helpers: types.InitialCodeScopeHelpers;
  const puzzle: types.InitialCodePuzzle;
  const sudoku: types.InitialCodePuzzle;
}
