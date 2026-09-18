// noinspection JSUnusedGlobalSymbols

export declare class CellIdsHelper {
  areValidCoords: (arg1: unknown) => boolean;
  getAllCellIds: () => number[];
  getCellCenterFromId: (arg1: unknown) => { x: number; y: number };
  getCoordsFromId: (arg1: unknown) => { x: number; y: number };
  getIdFromCoords: (arg1: unknown) => any;
  getIdFromCoordsSafe: (arg1: unknown) => any;
  getX: (arg1: unknown) => number;
  getY: (arg1: unknown) => number;
  height: number;
  width: number;
  spec: PuzzleSpec;
}

export declare class ConnectivityHelper {
  getOrthogonallyConnectedGroups: (arg1: unknown) => any;
  spec: PuzzleSpec;
  geometryHelper: CustomComponentScopeGeometryHelper;
}

export declare class CornerIdsHelper {
  getCoordsFromId: (arg1: unknown) => { x: number; y: number };
  getIdFromCornerCoords: (arg1: unknown) => any;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
}

export declare class CustomComponentPuzzleBase extends PuzzleBase {
  filterCandidatesInCell: (arg1: unknown, arg2: unknown) => any;
  filterCandidatesInCells: (arg1: unknown, arg2: unknown) => any;
  getCandidates: (arg1: unknown) => any;
  getCandidatesBitMask: (arg1: unknown) => any;
  getCellsAreFilled: (arg1: unknown) => boolean;
  getFriendlyCandidates: (arg1: unknown) => any;
  getValue: (arg1: unknown) => any;
  hasValue: (arg1: unknown) => boolean;
  removeCandidateFromCell: (arg1: unknown, arg2: unknown) => any;
  removeCandidateFromCells: (arg1: unknown, arg2: unknown) => any;
  removeCandidatesFromCell: (arg1: unknown, arg2: unknown) => any;
  removeCandidatesFromCells: (arg1: unknown, arg2: unknown) => any;
  removeComponent: () => any;
  replaceComponent: (arg1: unknown, arg2: unknown) => any;
  stop: (arg1: unknown, arg2: unknown) => any;
  helpers: CustomComponentScopeHelpers;
  instance: CustomComponentInstance;
}

export declare class CustomComponentScopeGeometryHelper {
  getAdjacentCells: (arg1: unknown, arg2?: unknown) => Generator<any, void, undefined>;
  getAllColumns: () => Generator<any[], void, undefined>;
  getAllDiagonallyAdjacentPairs: () => Generator<any[], void, undefined>;
  getAllDominoes: () => Generator<any[], void, undefined>;
  getAllKingsMovePairs: () => Generator<any[], void, undefined>;
  getAllKnightMovePairs: () => Generator<any[], void, undefined>;
  getAllPairsWithOffset: (arg1: unknown, arg2: unknown) => Generator<any[], void, undefined>;
  getAllQuadruples: () => Generator<any[], void, undefined>;
  getAllRows: () => Generator<any[], void, undefined>;
  getCellsAreKingsMoveApart: (arg1: unknown, arg2: unknown) => boolean;
  getCellsInColumn: (arg1: unknown) => Generator<any, void, undefined>;
  getCellsInColumnOfCell: (arg1: unknown) => Generator<any, void, undefined>;
  getCellsInDiagonal: (arg1: unknown, arg2: unknown) => Generator<any, void, undefined>;
  getCellsInRow: (arg1: unknown) => Generator<any, void, undefined>;
  getCellsInRowOfCell: (arg1: unknown) => Generator<any, void, undefined>;
  getCellsKnightsMoveAwayFromCell: (arg1: unknown) => Generator<any, void, undefined>;
  getCellsPointedAtByOuterClue: (arg1: unknown, arg2: unknown) => Generator<any, void, undefined>;
  getCellsTouchingCorner: (arg1: unknown) => Generator<any, any[], undefined>;
  getCellsTouchingEdge: (arg1: unknown) => any[];
  getCoordsInDiagonal: (arg1: unknown, arg2: unknown) => Generator<{ x: any; y: number }, void, undefined>;
  getCoordsPointedAtByOuterClue: (arg1: unknown, arg2: unknown) => Generator<{ x: any; y: any }, void, undefined>;
  getDiagonallyAdjacentCells: (arg1: unknown) => Generator<any, void, undefined>;
  getManhattanDistanceBetweenCells: (arg1: unknown, arg2: unknown) => any;
  getOrthogonallyAdjacentCells: (arg1: unknown) => Generator<any, void, undefined>;
  height: number;
  width: number;
  outerCellIdHelper: OuterCellIdsHelper;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
  cornerIdHelper: CornerIdsHelper;
  edgeIdHelper: EdgeIdsHelper;
}

export declare class DigitSet extends SmallNumberSet {
  getLargestDigit: () => any;
  getSmallestDigit: () => any;
}

export declare class DigitsHelper {
  createEvensDigitSet: () => any;
  createFilteredDigitSet: (arg1: unknown) => any;
  createFullDigitSet: () => any;
  createModuloDigitSet: (arg1: unknown, arg2: unknown) => any;
  createOddsDigitSet: () => any;
  allDigitsMask: number;
  maxDigit: number;
  minDigit: number;
}

export declare class EdgeIdsHelper {
  getCoordsFromId: (arg1: unknown) => { x: number; y: number };
  getIdFromCoords: (arg1: unknown) => number;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
}

export declare class Env {
  verboseSolving: boolean;
}

export declare class Helpers {
  digits: DigitsHelper;
  outerCellIds: OuterCellIdsHelper;
  sums: SumsHelper;
  xSums: XSumsHelper;
  cellIds: CellIdsHelper;
  cornerIds: CornerIdsHelper;
  edgeIds: EdgeIdsHelper;
  connectivity: ConnectivityHelper;
  naming: NamingHelper;
}

export declare class NamingHelper {
  getBranchingLineName: (arg1: unknown, arg2: unknown) => string;
  getCageName: (arg1: unknown, arg2: unknown) => string;
  getCellName: (arg1: unknown) => never;
  getCellsDescription: (arg1: unknown) => any;
  getColumnName: (arg1: unknown) => string;
  getDigitFilterDescription: (arg1: unknown) => string;
  getDigitSetDescription: (arg1: unknown, arg2?: unknown) => any;
  getEdgeClueName: (arg1: unknown, arg2: unknown) => string;
  getEdgeClueNameFromDomino: (arg1: unknown, arg2: unknown) => string;
  getLineName: (arg1: unknown, arg2: unknown) => string;
  getOuterClueName: (arg1: unknown, arg2: unknown) => string | undefined;
  getRowName: (arg1: unknown) => string;
  getTupleName: (arg1: unknown) => any;
  getTupleNameBySize: (arg1: unknown) => any;
  names: string[];
  digitsHelper: DigitsHelper;
  outerCellIdHelper: OuterCellIdsHelper;
  spec: PuzzleSpec;
  edgeIdHelper: EdgeIdsHelper;
  geometryHelper: CustomComponentScopeGeometryHelper;
}

export declare class OuterCellIdsHelper {
  getAllAttributes: (arg1: unknown) => { x: any; y: any; side: any };
  getCellCenterFromId: (arg1: unknown) => any;
  getCoordsFromId: (arg1: unknown) => any;
  getIdFromCoords: (arg1: unknown) => any;
  getSide: (arg1: unknown) => any;
  getSideFromCoords: (arg1: unknown) => any;
  getX: (arg1: unknown) => number;
  getY: (arg1: unknown) => number;
  height: number;
  width: number;
}

export declare class PuzzleBase {
  get digitCount(): number;
  getCellAt: (arg1: unknown, arg2: unknown) => any;
  getCellsCanHaveRepeats: (arg1: unknown) => any;
  getCellsDiagonallyAdjacentToCell: (arg1: unknown) => Generator<any, void, undefined>;
  getCellsDiagonallyAdjacentToCoords: (arg1: unknown, arg2: unknown) => Generator<any, void, undefined>;
  getCellsOrthogonallyAdjacentToCell: (arg1: unknown) => Generator<any, void, undefined>;
  getCellsOrthogonallyAdjacentToCoords: (arg1: unknown, arg2: unknown) => Generator<any, void, undefined>;
  getCellsSeeEachOther: (arg1: unknown) => any;
  getCellsSeenByCell: (arg1: unknown, arg2: unknown) => any;
  getColumn: (arg1: unknown) => any;
  getFriendlyDigitsForCell: (arg1: unknown) => any;
  getRegion: (arg1: unknown) => any;
  getRegionAt: (arg1: unknown, arg2: unknown) => any;
  getRegionCells: (arg1: unknown) => any;
  getRegions: () => any;
  getRow: (arg1: unknown) => any;
  getX: (arg1: unknown) => any;
  getY: (arg1: unknown) => any;
  hasRegions: () => any;
  get height(): number;
  get maxDigit(): number;
  get minDigit(): number;
  get puzzleType(): string;
  get size(): number;
  unsafeGetCellAt: (arg1: unknown, arg2: unknown) => any;
  get width(): number;
  state: PuzzleState;
  spec: PuzzleSpec;
}

export declare class PuzzleSpec {
  digitCount: number;
  maxDigit: number;
  minDigit: number;
  type: string;
  size: PuzzleSpecSize;
}

export declare class PuzzleSpecSize {
  height: number;
  width: number;
}

export declare class SmallNumberSet {
  constructor(value?: number | SmallNumberSet);
  mask: number;
  valueOf(): number;
  [Symbol.iterator](): Generator<number, void, undefined>;
  add: (arg1: unknown) => void;
  clear: () => void;
  delete: (arg1: unknown) => void;
  equals: (arg1: unknown) => boolean;
  getLargestNumber: () => any;
  getSmallestNumber: () => any;
  has: (arg1: unknown) => boolean;
  intersect: (arg1: unknown) => this;
  intersects: (arg1: unknown) => boolean;
  isDisjointFrom: (arg1: unknown) => boolean;
  isSubsetOf: (arg1: unknown) => boolean;
  isSupersetOf: (arg1: unknown) => boolean;
  get size(): number;
  subtract: (arg1: unknown) => this;
  union: (arg1: unknown) => this;
  xor: (arg1: unknown) => this;
  static from: <T extends SmallNumberSet>(this: new (...args: any[]) => T, arg1: Iterable<number>) => T;
  static getIntersection: <T extends SmallNumberSet>(
    this: new (...args: any[]) => T,
    arg1: Iterable<number | SmallNumberSet>,
  ) => T;
  static getUnion: <T extends SmallNumberSet>(
    this: new (...args: any[]) => T,
    arg1: Iterable<number | SmallNumberSet>,
  ) => T;
}

export declare class SumsHelper {
  getCombinationsForSumWithoutRepeat: (arg1: unknown, arg2: unknown) => any[];
  getCombinationsForSumsWithoutRepeat: (arg1: unknown, arg2: unknown) => any[];
  getExtremeSumsWithRepeat: (arg1: unknown, arg2: unknown) => { minSum: number; maxSum: number };
  getExtremeSumsWithoutRepeat: (arg1: unknown, arg2: unknown) => { minSum: any; maxSum: any } | null;
  getMaximumSumWithoutRepeat: (arg1: unknown, arg2: unknown) => any;
  getMinimumSumWithoutRepeat: (arg1: unknown, arg2: unknown) => any;
  maxDigit: number;
  minDigit: number;
}

export declare class XSumsHelper {
  getXSumPossibilities: (arg1: unknown) => Generator<{ x: number; combinations: any[] }, void, undefined>;
  maxDigit: number;
  sumHelper: SumsHelper;
}

export type ArrayUtils = {
  areSameLength: (...rest: unknown[]) => boolean;
  chunk: (arg1: unknown, arg2: unknown) => any[][];
  count: (arg1: unknown, arg2: unknown, arg3?: unknown) => any;
  countWhere: (arg1: unknown, arg2: unknown) => any;
  createFilledArray: (arg1: unknown, arg2: unknown) => any[];
  ensureArray: (arg1: unknown) => any[];
  hasDuplicates: (arg1: unknown, arg2: unknown) => any;
  includesEvery: (arg1: unknown, arg2: unknown, arg3: unknown) => boolean;
  includesSome: (arg1: unknown, arg2: unknown, arg3: unknown) => boolean;
  mapIterable: (arg1: unknown, arg2: unknown) => any[];
  remove: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  removeFirst: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  removeFirstWhere: (arg1: unknown, arg2: unknown) => any;
  removeWhere: (arg1: unknown, arg2: unknown) => any;
  shuffled: (arg1: unknown) => any;
  sliceWrapped: (arg1: unknown, arg2: unknown, arg3: unknown) => any[];
  withoutAll: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  withoutDuplicates: (arg1: unknown, arg2: unknown) => any;
};

export type CombinatoricUtils = {
  getCombinationsForSum: (
    arg1: unknown,
    arg2: unknown,
    arg3?: unknown,
    arg4?: unknown,
  ) => Generator<any, void, undefined>;
};

export type CustomComponentInstance = {
  cellIds: number[];
  cells: number[];
  name: string;
  get allowsEmptyCells(): boolean;
  getExclusionGroup: (arg1: unknown) => never[];
  getIsDone: (arg1: unknown) => any;
  initialize: (arg1: unknown) => Generator<any, void, undefined>;
  onValueSet: (arg1: unknown, arg2: unknown, arg3: unknown) => Generator<never, void, undefined>;
  update: (arg1: unknown) => Generator<never, void, undefined>;
  validate: (arg1: unknown) => any;
  get validateDuringSolve(): boolean;
};

export type CustomComponentScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper;
};

export type GetAffectedCellsArgs = {};

export type InitialCodePuzzle = PuzzleBase & {
  helpers: InitialCodeScopeHelpers;
  addConstraintComponent: (arg1: unknown) => void;
  getConstraintComponentsAt: (arg1: unknown) => any;
  removeConstraintComponent: (arg1: unknown) => void;
  setRegions: (arg1: unknown) => void;
};

export type InitialCodeScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper & {
    sudoku: PuzzleState;
    getSubsetsPerRegion: (arg1: unknown) => Map<any, any>;
  };
  lines: {
    getAllPairsAlongLines: (arg1: unknown) => Generator<any[], void, undefined>;
    getCellsBetweenLineEnds: (arg1: unknown) => any;
    getLineEnds: (arg1: unknown) => any[];
  };
  misc: {
    cellIdHelper: CellIdsHelper;
    cornerIdHelper: CornerIdsHelper;
    edgeIdHelper: EdgeIdsHelper;
    geometryHelper: CustomComponentScopeGeometryHelper;
    outerCellIdHelper: OuterCellIdsHelper;
    spec: PuzzleSpec;
    getCellGroupsFromLines: (arg1: unknown) => any[];
    getEdgesForNegativeConstraint: (arg1: unknown) => Generator<any, void, undefined>;
  };
};

export type InitializeArgs = {
  instance: CustomComponentInstance;
  puzzle: CustomComponentPuzzleBase;
};

export type IterationUtils = {
  getBest: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  getCombinations: (arg1: unknown, arg2: unknown) => Generator<any[], void, undefined>;
  getCounts: (arg1: unknown) => Map<any, any>;
  getOne: (arg1: unknown) => any;
  getRange: (arg1: unknown, arg2: unknown) => Generator<any, void, undefined>;
  getRangeInclusive: (arg1: unknown, arg2: unknown) => Generator<any, void, undefined>;
};

export type MathUtils = {
  clamp: (arg1: unknown, arg2: unknown, arg3: unknown) => number;
  getFactors: (arg1: unknown) => any[];
  isPrime: (arg1: unknown) => any;
  lerp: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  mod: (arg1: unknown, arg2: unknown) => number;
  product: (arg1: unknown) => number;
  sum: (arg1: unknown) => number;
  toDegrees: (arg1: unknown) => number;
  toRadians: (arg1: unknown) => number;
  triangularNumber: (arg1: unknown) => number;
};

export type SetParamsArgs = {
  instance: CustomComponentInstance;
};

export type SetUtils = {
  addAll: (arg1: unknown, arg2: unknown) => any;
  deleteAll: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  difference: (arg1: unknown, arg2: unknown, arg3: unknown) => Set<unknown>;
  filter: (arg1: unknown, arg2: unknown) => any;
  hasAll: (arg1: unknown, arg2: unknown, arg3: unknown) => boolean;
  hasSome: (arg1: unknown, arg2: unknown, arg3: unknown) => boolean;
  hasSomeWhere: (arg1: unknown, arg2: unknown) => boolean;
  intersection: (arg1: unknown, arg2: unknown) => Set<unknown>;
  isEqual: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  symmetricDifference: (arg1: unknown, arg2: unknown) => any;
  takeOne: (arg1: unknown) => any;
  union: (arg1: unknown, arg2: unknown) => Set<unknown>;
};

export type UpdateArgs = {
  instance: CustomComponentInstance;
  puzzle: CustomComponentPuzzleBase;
};

export type ValidateArgs = {
  instance: CustomComponentInstance;
  puzzle: CustomComponentPuzzleBase;
};

export type Vector2Funcs = {
  compareVectors: (arg1: unknown, arg2: unknown) => number;
  difference: (arg1: unknown, arg2: unknown) => { x: number; y: number };
  getAngle: (arg1: unknown, arg2: unknown) => number;
  getAverage: (arg1: unknown) => { x: number; y: number };
  getClamped: (arg1: unknown, arg2: unknown) => { x: any; y: any };
  getDistance: (arg1: unknown, arg2: unknown) => number;
  getDotProduct: (arg1: unknown, arg2: unknown) => number;
  getMagnitude: (arg1: unknown) => number;
  getManhattanDistance: (arg1: unknown, arg2: unknown) => number;
  getRotated: (arg1: unknown, arg2: unknown) => { x: number; y: number };
  isVectorGreaterThan: (arg1: unknown, arg2: unknown) => boolean;
  normalized: (arg1: unknown) => { x: number; y: number };
  scaled: (arg1: unknown, arg2: unknown) => { x: number; y: number };
  scaledSum: (arg1: unknown, arg2: unknown, arg3: unknown) => { x: any; y: any };
  sum: (arg1: unknown, arg2: unknown) => { x: any; y: any };
};

export declare enum DiagonalType {
  NegativeDiagonal = -1,
  PositiveDiagonal = 1,
}

export declare enum OuterPosition {
  Top = 0,
  Right = 1,
  Bottom = 2,
  Left = 3,
  TopLeft = 4,
  TopRight = 5,
  BottomRight = 6,
  BottomLeft = 7,
}

export type PuzzleState = never;
