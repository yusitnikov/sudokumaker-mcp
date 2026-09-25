// noinspection JSUnusedGlobalSymbols,ES6UnusedImports

import type * as types from "./types";

declare global {
  const ArrayUtils: types.ArrayUtils;
  const CombinatoricUtils: types.CombinatoricUtils;
  const DiagonalType: typeof types.DiagonalType;
  const DigitSet: typeof types.DigitSet;
  const IterationUtils: types.IterationUtils;
  const MathUtils: types.MathUtils;
  const OuterPosition: typeof types.OuterPosition;
  const SetUtils: types.SetUtils;
  const SmallNumberSet: typeof types.SmallNumberSet;
  const SudokuDigitSet: typeof types.DigitSet;
  const Vector2Funcs: types.Vector2Funcs;
  const env: types.Env;
}
