// noinspection JSUnusedGlobalSymbols

export declare class CellIdsHelper {
  areValidCoords: (arg1: unknown) => any;
  getAllCellIds: () => any;
  getCellCenterFromId: (arg1: unknown) => any;
  getCoordsFromId: (arg1: unknown) => any;
  getIdFromCoords: (arg1: unknown) => any;
  getIdFromCoordsSafe: (arg1: unknown) => any;
  getX: (arg1: unknown) => any;
  getY: (arg1: unknown) => any;
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
  getCoordsFromId: (arg1: unknown) => any;
  getIdFromCornerCoords: (arg1: unknown) => any;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
}

export declare class CustomComponentPuzzleBase extends PuzzleBase {
  filterCandidatesInCell: (arg1: unknown, arg2: unknown) => any;
  filterCandidatesInCells: (arg1: unknown, arg2: unknown) => any;
  getCandidates: (arg1: unknown) => any;
  getCandidatesBitMask: (arg1: unknown) => any;
  getCellsAreFilled: (arg1: unknown) => any;
  getFriendlyCandidates: (arg1: unknown) => any;
  getValue: (arg1: unknown) => any;
  hasValue: (arg1: unknown) => any;
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
  getAdjacentCells: (arg1: unknown, arg2?: unknown) => Generator<any>;
  getAllColumns: () => Generator<any>;
  getAllDiagonallyAdjacentPairs: () => Generator<any>;
  getAllDominoes: () => Generator<any>;
  getAllKingsMovePairs: () => Generator<any>;
  getAllKnightMovePairs: () => Generator<any>;
  getAllPairsWithOffset: (arg1: unknown, arg2: unknown) => Generator<any>;
  getAllQuadruples: () => Generator<any>;
  getAllRows: () => Generator<any>;
  getCellsAreKingsMoveApart: (arg1: unknown, arg2: unknown) => any;
  getCellsInColumn: (arg1: unknown) => Generator<any>;
  getCellsInColumnOfCell: (arg1: unknown) => Generator<any>;
  getCellsInDiagonal: (arg1: unknown, arg2: unknown) => Generator<any>;
  getCellsInRow: (arg1: unknown) => Generator<any>;
  getCellsInRowOfCell: (arg1: unknown) => Generator<any>;
  getCellsKnightsMoveAwayFromCell: (arg1: unknown) => Generator<any>;
  getCellsPointedAtByOuterClue: (arg1: unknown, arg2: unknown) => Generator<any>;
  getCellsTouchingCorner: (arg1: unknown) => Generator<any>;
  getCellsTouchingEdge: (arg1: unknown) => any;
  getCoordsInDiagonal: (arg1: unknown, arg2: unknown) => Generator<any>;
  getCoordsPointedAtByOuterClue: (arg1: unknown, arg2: unknown) => Generator<any>;
  getDiagonallyAdjacentCells: (arg1: unknown) => Generator<any>;
  getManhattanDistanceBetweenCells: (arg1: unknown, arg2: unknown) => any;
  getOrthogonallyAdjacentCells: (arg1: unknown) => Generator<any>;
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
  getCoordsFromId: (arg1: unknown) => any;
  getIdFromCoords: (arg1: unknown) => any;
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
  getBranchingLineName: (arg1: unknown, arg2: unknown) => any;
  getCageName: (arg1: unknown, arg2: unknown) => any;
  getCellName: (arg1: unknown) => any;
  getCellsDescription: (arg1: unknown) => any;
  getColumnName: (arg1: unknown) => any;
  getDigitFilterDescription: (arg1: unknown) => any;
  getDigitSetDescription: (arg1: unknown, arg2?: unknown) => any;
  getEdgeClueName: (arg1: unknown, arg2: unknown) => any;
  getEdgeClueNameFromDomino: (arg1: unknown, arg2: unknown) => any;
  getLineName: (arg1: unknown, arg2: unknown) => any;
  getOuterClueName: (arg1: unknown, arg2: unknown) => any;
  getRowName: (arg1: unknown) => any;
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
  getAllAttributes: (arg1: unknown) => any;
  getCellCenterFromId: (arg1: unknown) => any;
  getCoordsFromId: (arg1: unknown) => any;
  getIdFromCoords: (arg1: unknown) => any;
  getSide: (arg1: unknown) => any;
  getSideFromCoords: (arg1: unknown) => any;
  getX: (arg1: unknown) => any;
  getY: (arg1: unknown) => any;
  height: number;
  width: number;
}

export declare class PuzzleBase {
  get digitCount(): number;
  getCellAt: (arg1: unknown, arg2: unknown) => any;
  getCellsCanHaveRepeats: (arg1: unknown) => any;
  getCellsDiagonallyAdjacentToCell: (arg1: unknown) => Generator<any>;
  getCellsDiagonallyAdjacentToCoords: (arg1: unknown, arg2: unknown) => Generator<any>;
  getCellsOrthogonallyAdjacentToCell: (arg1: unknown) => Generator<any>;
  getCellsOrthogonallyAdjacentToCoords: (arg1: unknown, arg2: unknown) => Generator<any>;
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
  add: (arg1: unknown) => any;
  clear: () => any;
  delete: (arg1: unknown) => any;
  equals: (arg1: unknown) => any;
  getLargestNumber: () => any;
  getSmallestNumber: () => any;
  has: (arg1: unknown) => any;
  intersect: (arg1: unknown) => any;
  intersects: (arg1: unknown) => any;
  isDisjointFrom: (arg1: unknown) => any;
  isSubsetOf: (arg1: unknown) => any;
  isSupersetOf: (arg1: unknown) => any;
  get size(): unknown;
  subtract: (arg1: unknown) => any;
  union: (arg1: unknown) => any;
  xor: (arg1: unknown) => any;
  static from: (arg1: unknown) => any;
  static getIntersection: (arg1: unknown) => any;
  static getUnion: (arg1: unknown) => any;
}

export declare class SumsHelper {
  getCombinationsForSumWithoutRepeat: (arg1: unknown, arg2: unknown) => any;
  getCombinationsForSumsWithoutRepeat: (arg1: unknown, arg2: unknown) => any;
  getExtremeSumsWithRepeat: (arg1: unknown, arg2: unknown) => any;
  getExtremeSumsWithoutRepeat: (arg1: unknown, arg2: unknown) => any;
  getMaximumSumWithoutRepeat: (arg1: unknown, arg2: unknown) => any;
  getMinimumSumWithoutRepeat: (arg1: unknown, arg2: unknown) => any;
  maxDigit: number;
  minDigit: number;
}

export declare class XSumsHelper {
  getXSumPossibilities: (arg1: unknown) => Generator<any>;
  maxDigit: number;
  sumHelper: SumsHelper;
}

export type ArrayUtils = {
  areSameLength: (...rest: unknown[]) => any;
  chunk: (arg1: unknown, arg2: unknown) => any;
  count: (arg1: unknown, arg2: unknown, arg3?: unknown) => any;
  countWhere: (arg1: unknown, arg2: unknown) => any;
  createFilledArray: (arg1: unknown, arg2: unknown) => any;
  ensureArray: (arg1: unknown) => any;
  hasDuplicates: (arg1: unknown, arg2: unknown) => any;
  includesEvery: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  includesSome: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  mapIterable: (arg1: unknown, arg2: unknown) => any;
  remove: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  removeFirst: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  removeFirstWhere: (arg1: unknown, arg2: unknown) => any;
  removeWhere: (arg1: unknown, arg2: unknown) => any;
  shuffled: (arg1: unknown) => any;
  sliceWrapped: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  withoutAll: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  withoutDuplicates: (arg1: unknown, arg2: unknown) => any;
};

export type CombinatoricUtils = {
  getCombinationsForSum: (arg1: unknown, arg2: unknown, arg3?: unknown, arg4?: unknown) => Generator<any>;
};

export type CustomComponentInstance = {
  cellIds: number[];
  cells: number[];
  name: string;
  get allowsEmptyCells(): boolean;
  getExclusionGroup: (arg1: unknown) => any;
  getIsDone: (arg1: unknown) => any;
  initialize: (arg1: unknown) => Generator<any>;
  onValueSet: (arg1: unknown, arg2: unknown, arg3: unknown) => Generator<any>;
  update: (arg1: unknown) => Generator<any>;
  validate: (arg1: unknown) => any;
  get validateDuringSolve(): boolean;
};

export type CustomComponentScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper;
};

export type GetAffectedCellsArgs = {};

export type InitialCodePuzzle = PuzzleBase & {
  helpers: InitialCodeScopeHelpers;
  addConstraintComponent: (arg1: unknown) => any;
  getConstraintComponentsAt: (arg1: unknown) => any;
  removeConstraintComponent: (arg1: unknown) => any;
  setRegions: (arg1: unknown) => any;
};

export type InitialCodeScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper & {
    sudoku: PuzzleState;
    getSubsetsPerRegion: (arg1: unknown) => any;
  };
  lines: {
    getAllPairsAlongLines: (arg1: unknown) => Generator<any>;
    getCellsBetweenLineEnds: (arg1: unknown) => any;
    getLineEnds: (arg1: unknown) => any;
  };
  misc: {
    cellIdHelper: CellIdsHelper;
    cornerIdHelper: CornerIdsHelper;
    edgeIdHelper: EdgeIdsHelper;
    geometryHelper: CustomComponentScopeGeometryHelper;
    outerCellIdHelper: OuterCellIdsHelper;
    spec: PuzzleSpec;
    getCellGroupsFromLines: (arg1: unknown) => any;
    getEdgesForNegativeConstraint: (arg1: unknown) => Generator<any>;
  };
};

export type InitializeArgs = {
  instance: CustomComponentInstance;
  puzzle: CustomComponentPuzzleBase;
};

export type IterationUtils = {
  getBest: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  getCombinations: (arg1: unknown, arg2: unknown) => Generator<any>;
  getCounts: (arg1: unknown) => any;
  getOne: (arg1: unknown) => any;
  getRange: (arg1: unknown, arg2: unknown) => Generator<any>;
  getRangeInclusive: (arg1: unknown, arg2: unknown) => Generator<any>;
};

export type MathUtils = {
  clamp: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  getFactors: (arg1: unknown) => any;
  isPrime: (arg1: unknown) => any;
  lerp: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  mod: (arg1: unknown, arg2: unknown) => any;
  product: (arg1: unknown) => any;
  sum: (arg1: unknown) => any;
  toDegrees: (arg1: unknown) => any;
  toRadians: (arg1: unknown) => any;
  triangularNumber: (arg1: unknown) => any;
};

export type SetParamsArgs = {
  instance: CustomComponentInstance;
};

export type SetUtils = {
  addAll: (arg1: unknown, arg2: unknown) => any;
  deleteAll: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  difference: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  filter: (arg1: unknown, arg2: unknown) => any;
  hasAll: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  hasSome: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  hasSomeWhere: (arg1: unknown, arg2: unknown) => any;
  intersection: (arg1: unknown, arg2: unknown) => any;
  isEqual: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  symmetricDifference: (arg1: unknown, arg2: unknown) => any;
  takeOne: (arg1: unknown) => any;
  union: (arg1: unknown, arg2: unknown) => any;
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
  compareVectors: (arg1: unknown, arg2: unknown) => any;
  difference: (arg1: unknown, arg2: unknown) => any;
  getAngle: (arg1: unknown, arg2: unknown) => any;
  getAverage: (arg1: unknown) => any;
  getClamped: (arg1: unknown, arg2: unknown) => any;
  getDistance: (arg1: unknown, arg2: unknown) => any;
  getDotProduct: (arg1: unknown, arg2: unknown) => any;
  getMagnitude: (arg1: unknown) => any;
  getManhattanDistance: (arg1: unknown, arg2: unknown) => any;
  getRotated: (arg1: unknown, arg2: unknown) => any;
  isVectorGreaterThan: (arg1: unknown, arg2: unknown) => any;
  normalized: (arg1: unknown) => any;
  scaled: (arg1: unknown, arg2: unknown) => any;
  scaledSum: (arg1: unknown, arg2: unknown, arg3: unknown) => any;
  sum: (arg1: unknown, arg2: unknown) => any;
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
