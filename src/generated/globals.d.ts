// noinspection JSUnusedGlobalSymbols

import type * as types from "./types";

type CellId = types.CellId;
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
  class AsymmetricalPairComponent extends types.Component {
    constructor(
      name: string,
      filterOrMapping: ((d1: number, d2: number) => boolean) | DigitSet[],
      cell1: CellId,
      cell2: CellId,
    );
  }
  class BetweenComponent extends types.Component {
    constructor(name: string, endPoints: [CellId, CellId], midPoints: CellId[]);
  }
  class ConsecutiveDigitsComponent extends types.Component {
    constructor(name: string, cells: CellId[]);
  }
  class ConsecutiveDigitsSetComponent extends types.Component {
    constructor(name: string, cells: CellId[]);
  }
  class CountDigitComponent extends types.Component {
    constructor(name: string, digit: number, counterCell: CellId, targetCells: CellId[]);
  }
  class CountDigitsComponent extends types.Component {
    constructor(name: string, digits: DigitSet, counterCell: CellId, targetCells: CellId[]);
  }
  class DifferenceComponent extends types.Component {
    constructor(name: string, difference: number | number[], cell1: CellId, cell2: CellId);
  }
  class DifferentCombinationsComponent extends types.Component {
    constructor(name: string, cellGroups: CellId[][]);
  }
  class DifferentDigitsComponent extends types.Component {
    constructor(name: string, cells: CellId[]);
  }
  class DifferentGroupsComponent extends types.Component {
    constructor(name: string, groups: DigitSet[], cells: CellId[]);
  }
  class DiverseGroupsComponent extends types.Component {
    constructor(name: string, groups: DigitSet[], cells: CellId[]);
  }
  class ExactDigitCountComponent extends types.Component {
    constructor(name: string, value: number, count: number, cells: CellId[]);
  }
  class ForbiddenCandidatesComponent extends types.Component {
    constructor(name: string, candidates: DigitSet, cellOrCells: CellId | CellId[]);
  }
  class GreaterThanComponent extends types.Component {
    constructor(name: string, lesserCell: CellId, greaterCell: CellId);
  }
  class GreaterThanOrEqualsComponent extends types.Component {
    constructor(name: string, lesserCell: CellId, greaterCell: CellId);
  }
  class HouseComponent extends types.Component {
    constructor(name: string, cells: CellId[]);
  }
  class IndexComponent extends types.Component {
    constructor(name: string, valueToIndex: number, indexerCell: CellId, cells: CellId[]);
  }
  class LessThanComponent extends types.Component {
    constructor(name: string, lesserCell: CellId, greaterCell: CellId);
  }
  class MaxDigitCountComponent extends types.Component {
    constructor(name: string, value: number, maxCount: number, cells: CellId[]);
  }
  class MaximumDifferenceComponent extends types.Component {
    constructor(name: string, maxDifference: number, cell1: CellId, cell2: CellId);
  }
  class MinimumDifferenceComponent extends types.Component {
    constructor(name: string, minDifference: number, cell1: CellId, cell2: CellId);
  }
  class NegativeBetweenComponent extends types.Component {
    constructor(name: string, endPoints: [CellId, CellId], midPoints: CellId[]);
  }
  class NegativeDifferenceComponent extends types.Component {
    constructor(name: string, differences: number[], cell1: CellId, cell2: CellId);
  }
  class NegativeIndexComponent extends types.Component {
    constructor(name: string, valueToNotIndex: number, indexerCell: CellId, cells: CellId[]);
  }
  class NegativeRatioComponent extends types.Component {
    constructor(name: string, ratios: number[], cell1: CellId, cell2: CellId);
  }
  class NegativeSumComponent extends types.Component {
    constructor(name: string, sums: number[], cells: CellId[]);
  }
  class PairComponent extends types.Component {
    constructor(
      name: string,
      filterOrMapping: ((d1: number, d2: number) => boolean) | DigitSet[],
      cell1: CellId,
      cell2: CellId,
    );
  }
  class PredefinedCandidatesComponent extends types.Component {
    constructor(name: string, candidates: DigitSet, cellOrCells: CellId[]);
  }
  class ProductComponent extends types.Component {
    constructor(name: string, productOrProducts: number | number[], cells: CellId[]);
  }
  class RatioComponent extends types.Component {
    constructor(name: string, ratioOrRatios: number | number[], cell1: CellId, cell2: CellId);
  }
  class RequiredDigitsComponent extends types.Component {
    constructor(name: string, values: number[], cells: CellId[]);
  }
  class RequiredGroupsComponent extends types.Component {
    constructor(name: string, groups: DigitSet[], cells: CellId[]);
  }
  class SameDigitComponent extends types.Component {
    constructor(name: string, cells: CellId[]);
  }
  class SameGroupComponent extends types.Component {
    constructor(name: string, groups: DigitSet[], cells: CellId[]);
  }
  class SameSumComponent extends types.Component {
    constructor(
      name: string,
      groups: { name: string; cells: CellId[]; weights?: Map<CellId, number>; asNumber?: boolean }[],
    );
  }
  class SandwichSumComponent extends types.Component {
    constructor(name: string, sum: number, sandwichDigits: [number, number], cells: CellId[]);
  }
  class SelfCountingComponent extends types.Component {
    constructor(name: string, cells: CellId[]);
  }
  class SequenceComponent extends types.Component {
    constructor(name: string, cells: CellId[]);
  }
  class SkyscraperComponent extends types.Component {
    constructor(name: string, amount: number, cells: CellId[]);
  }
  class SumComponent extends types.Component {
    constructor(name: string, sumOrSums: number | number[], cells: CellId[]);
  }
  class WeakLinkComponent extends types.Component {
    constructor(name: string, cell1: CellId, value1: number, cell2: CellId, value2: number);
  }
  class WeakLinksComponent extends types.Component {
    constructor(name: string, cells1: CellId | CellId[], value1: DigitSet, cells2: CellId | CellId[], value2: DigitSet);
  }
  class WeightedSumComponent extends types.Component {
    constructor(name: string, sumOrSums: number | number[], cellWeightMapping: Map<CellId, number>);
  }
  class XSumComponent extends types.Component {
    constructor(name: string, sum: number, xCell: CellId, cells: CellId[]);
  }
}
