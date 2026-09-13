// noinspection JSUnusedGlobalSymbols

import type * as types from "./types";

declare global {
  const customComponents: CustomComponents;
  const helpers: types.CustomComponentScopeHelpers;
  interface CustomComponents {}
}
