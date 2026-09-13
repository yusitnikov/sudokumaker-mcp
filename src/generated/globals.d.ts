// noinspection JSUnusedGlobalSymbols

import type * as types from "./types";

type CellId = number;
type DigitSet = types.DigitSet;

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
  class AsymmetricalPairComponent {
    constructor(
      name: string,
      filterOrMapping: ((d1: number, d2: number) => boolean) | DigitSet[],
      cell1: CellId,
      cell2: CellId,
    );
  }
  class BetweenComponent {
    constructor(name: string, endPoints: [CellId, CellId], midPoints: CellId[]);
  }
  class ConsecutiveDigitsComponent {
    constructor(name: string, cells: CellId[]);
  }
  class ConsecutiveDigitsSetComponent {
    constructor(name: string, cells: CellId[]);
  }
  class CountDigitComponent {
    constructor(name: string, digit: number, counterCell: CellId, targetCells: CellId[]);
  }
  class CountDigitsComponent {
    constructor(name: string, digits: DigitSet, counterCell: CellId, targetCells: CellId[]);
  }
  class DifferenceComponent {
    constructor(name: string, difference: number | number[], cell1: CellId, cell2: CellId);
  }
  class DifferentCombinationsComponent {
    constructor(name: string, cellGroups: CellId[][]);
  }
  class DifferentDigitsComponent {
    constructor(name: string, cells: CellId[]);
  }
  class DifferentGroupsComponent {
    constructor(name: string, groups: DigitSet[], cells: CellId[]);
  }
  class DiverseGroupsComponent {
    constructor(name: string, groups: DigitSet[], cells: CellId[]);
  }
  class ExactDigitCountComponent {
    constructor(name: string, value: number, count: number, cells: CellId[]);
  }
  class ForbiddenCandidatesComponent {
    constructor(name: string, candidates: DigitSet, cellOrCells: CellId | CellId[]);
  }
  class GreaterThanComponent {
    constructor(name: string, lesserCell: CellId, greaterCell: CellId);
  }
  class GreaterThanOrEqualsComponent {
    constructor(name: string, lesserCell: CellId, greaterCell: CellId);
  }
  class HouseComponent {
    constructor(name: string, cells: CellId[]);
  }
  class IndexComponent {
    constructor(name: string, valueToIndex: number, indexerCell: CellId, cells: CellId[]);
  }
  class LessThanComponent {
    constructor(name: string, lesserCell: CellId, greaterCell: CellId);
  }
  class MaxDigitCountComponent {
    constructor(name: string, value: number, maxCount: number, cells: CellId[]);
  }
  class MaximumDifferenceComponent {
    constructor(name: string, maxDifference: number, cell1: CellId, cell2: CellId);
  }
  class MinimumDifferenceComponent {
    constructor(name: string, minDifference: number, cell1: CellId, cell2: CellId);
  }
  class NegativeBetweenComponent {
    constructor(name: string, endPoints: [CellId, CellId], midPoints: CellId[]);
  }
  class NegativeDifferenceComponent {
    constructor(name: string, differences: number[], cell1: CellId, cell2: CellId);
  }
  class NegativeIndexComponent {
    constructor(name: string, valueToNotIndex: number, indexerCell: CellId, cells: CellId[]);
  }
  class NegativeRatioComponent {
    constructor(name: string, ratios: number[], cell1: CellId, cell2: CellId);
  }
  class NegativeSumComponent {
    constructor(name: string, sums: number[], cells: CellId[]);
  }
  class PairComponent {
    constructor(
      name: string,
      filterOrMapping: ((d1: number, d2: number) => boolean) | DigitSet[],
      cell1: CellId,
      cell2: CellId,
    );
  }
  class PredefinedCandidatesComponent {
    constructor(name: string, candidates: DigitSet, cellOrCells: CellId[]);
  }
  class ProductComponent {
    constructor(name: string, productOrProducts: number | number[], cells: CellId[]);
  }
  class RatioComponent {
    constructor(name: string, ratioOrRatios: number | number[], cell1: CellId, cell2: CellId);
  }
  class RequiredDigitsComponent {
    constructor(name: string, values: number[], cells: CellId[]);
  }
  class RequiredGroupsComponent {
    constructor(name: string, groups: DigitSet[], cells: CellId[]);
  }
  class SameDigitComponent {
    constructor(name: string, cells: CellId[]);
  }
  class SameGroupComponent {
    constructor(name: string, groups: DigitSet[], cells: CellId[]);
  }
  class SameSumComponent {
    constructor(
      name: string,
      groups: { name: string; cells: CellId[]; weights?: Map<CellId, number>; asNumber?: boolean }[],
    );
  }
  class SandwichSumComponent {
    constructor(name: string, sum: number, sandwichDigits: [number, number], cells: CellId[]);
  }
  class SelfCountingComponent {
    constructor(name: string, cells: CellId[]);
  }
  class SequenceComponent {
    constructor(name: string, cells: CellId[]);
  }
  class SkyscraperComponent {
    constructor(name: string, amount: number, cells: CellId[]);
  }
  class SumComponent {
    constructor(name: string, sumOrSums: number | number[], cells: CellId[]);
  }
  class WeakLinkComponent {
    constructor(name: string, cell1: CellId, value1: number, cell2: CellId, value2: number);
  }
  class WeakLinksComponent {
    constructor(name: string, cells1: CellId | CellId[], value1: DigitSet, cells2: CellId | CellId[], value2: DigitSet);
  }
  class WeightedSumComponent {
    constructor(name: string, sumOrSums: number | number[], cellWeightMapping: Map<CellId, number>);
  }
  class XSumComponent {
    constructor(name: string, sum: number, xCell: CellId, cells: CellId[]);
  }
}
