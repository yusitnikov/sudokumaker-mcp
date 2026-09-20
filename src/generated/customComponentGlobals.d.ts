// noinspection JSUnusedGlobalSymbols

import type * as types from "./types";

declare global {
  const customComponents: CustomComponents;
  const helpers: types.CustomComponentScopeHelpers;
  interface CustomComponents {}
  type CellId = types.CellId;
  interface Puzzle extends types.CustomComponentPuzzle {}
  interface Instance extends types.CustomComponentInstance {}
  interface DynamicInstance extends Instance {
    [member: string]: any;
  }
  type Change = types.Change;
}
