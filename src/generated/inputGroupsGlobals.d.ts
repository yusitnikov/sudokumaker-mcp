/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedGlobalSymbols,ES6UnusedImports

import type * as types from "./types";

declare global {
  const input: {
    groups: {
      cells: number[];
      value: string;
    }[];
  };
}
