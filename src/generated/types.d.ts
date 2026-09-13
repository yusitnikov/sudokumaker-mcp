// noinspection JSUnusedGlobalSymbols

export declare class CellIdsHelper {
  areValidCoords: (...args: unknown[]) => unknown;
  getAllCellIds: (...args: unknown[]) => unknown;
  getCellCenterFromId: (...args: unknown[]) => unknown;
  getCoordsFromId: (...args: unknown[]) => unknown;
  getIdFromCoords: (...args: unknown[]) => unknown;
  getIdFromCoordsSafe: (...args: unknown[]) => unknown;
  getX: (...args: unknown[]) => unknown;
  getY: (...args: unknown[]) => unknown;
  height: number;
  width: number;
  spec: PuzzleSpec;
}

export declare class ConnectivityHelper {
  getOrthogonallyConnectedGroups: (...args: unknown[]) => unknown;
  spec: PuzzleSpec;
  geometryHelper: CustomComponentScopeGeometryHelper;
}

export declare class CornerIdsHelper {
  getCoordsFromId: (...args: unknown[]) => unknown;
  getIdFromCornerCoords: (...args: unknown[]) => unknown;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
}

export declare class CustomComponentPuzzleBase extends PuzzleBase {
  filterCandidatesInCell: (...args: unknown[]) => unknown;
  filterCandidatesInCells: (...args: unknown[]) => unknown;
  getCandidates: (...args: unknown[]) => unknown;
  getCandidatesBitMask: (...args: unknown[]) => unknown;
  getCellsAreFilled: (...args: unknown[]) => unknown;
  getFriendlyCandidates: (...args: unknown[]) => unknown;
  getValue: (...args: unknown[]) => unknown;
  hasValue: (...args: unknown[]) => unknown;
  removeCandidateFromCell: (...args: unknown[]) => unknown;
  removeCandidateFromCells: (...args: unknown[]) => unknown;
  removeCandidatesFromCell: (...args: unknown[]) => unknown;
  removeCandidatesFromCells: (...args: unknown[]) => unknown;
  removeComponent: (...args: unknown[]) => unknown;
  replaceComponent: (...args: unknown[]) => unknown;
  stop: (...args: unknown[]) => unknown;
  helpers: CustomComponentScopeHelpers;
  instance: CustomComponentInstance;
}

export declare class CustomComponentScopeGeometryHelper {
  getAdjacentCells: (...args: unknown[]) => unknown;
  getAllColumns: (...args: unknown[]) => unknown;
  getAllDiagonallyAdjacentPairs: (...args: unknown[]) => unknown;
  getAllDominoes: (...args: unknown[]) => unknown;
  getAllKingsMovePairs: (...args: unknown[]) => unknown;
  getAllKnightMovePairs: (...args: unknown[]) => unknown;
  getAllPairsWithOffset: (...args: unknown[]) => unknown;
  getAllQuadruples: (...args: unknown[]) => unknown;
  getAllRows: (...args: unknown[]) => unknown;
  getCellsAreKingsMoveApart: (...args: unknown[]) => unknown;
  getCellsInColumn: (...args: unknown[]) => unknown;
  getCellsInColumnOfCell: (...args: unknown[]) => unknown;
  getCellsInDiagonal: (...args: unknown[]) => unknown;
  getCellsInRow: (...args: unknown[]) => unknown;
  getCellsInRowOfCell: (...args: unknown[]) => unknown;
  getCellsKnightsMoveAwayFromCell: (...args: unknown[]) => unknown;
  getCellsPointedAtByOuterClue: (...args: unknown[]) => unknown;
  getCellsTouchingCorner: (...args: unknown[]) => unknown;
  getCellsTouchingEdge: (...args: unknown[]) => unknown;
  getCoordsInDiagonal: (...args: unknown[]) => unknown;
  getCoordsPointedAtByOuterClue: (...args: unknown[]) => unknown;
  getDiagonallyAdjacentCells: (...args: unknown[]) => unknown;
  getManhattanDistanceBetweenCells: (...args: unknown[]) => unknown;
  getOrthogonallyAdjacentCells: (...args: unknown[]) => unknown;
  height: number;
  width: number;
  outerCellIdHelper: OuterCellIdsHelper;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
  cornerIdHelper: CornerIdsHelper;
  edgeIdHelper: EdgeIdsHelper;
}

export declare class DigitSet extends SmallNumberSet {
  getLargestDigit: (...args: unknown[]) => unknown;
  getSmallestDigit: (...args: unknown[]) => unknown;
}

export declare class DigitsHelper {
  createEvensDigitSet: (...args: unknown[]) => unknown;
  createFilteredDigitSet: (...args: unknown[]) => unknown;
  createFullDigitSet: (...args: unknown[]) => unknown;
  createModuloDigitSet: (...args: unknown[]) => unknown;
  createOddsDigitSet: (...args: unknown[]) => unknown;
  allDigitsMask: number;
  maxDigit: number;
  minDigit: number;
}

export declare class EdgeIdsHelper {
  getCoordsFromId: (...args: unknown[]) => unknown;
  getIdFromCoords: (...args: unknown[]) => unknown;
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
  getBranchingLineName: (...args: unknown[]) => unknown;
  getCageName: (...args: unknown[]) => unknown;
  getCellName: (...args: unknown[]) => unknown;
  getCellsDescription: (...args: unknown[]) => unknown;
  getColumnName: (...args: unknown[]) => unknown;
  getDigitFilterDescription: (...args: unknown[]) => unknown;
  getDigitSetDescription: (...args: unknown[]) => unknown;
  getEdgeClueName: (...args: unknown[]) => unknown;
  getEdgeClueNameFromDomino: (...args: unknown[]) => unknown;
  getLineName: (...args: unknown[]) => unknown;
  getOuterClueName: (...args: unknown[]) => unknown;
  getRowName: (...args: unknown[]) => unknown;
  getTupleName: (...args: unknown[]) => unknown;
  getTupleNameBySize: (...args: unknown[]) => unknown;
  names: string[];
  digitsHelper: DigitsHelper;
  outerCellIdHelper: OuterCellIdsHelper;
  spec: PuzzleSpec;
  edgeIdHelper: EdgeIdsHelper;
  geometryHelper: CustomComponentScopeGeometryHelper;
}

export declare class OuterCellIdsHelper {
  getAllAttributes: (...args: unknown[]) => unknown;
  getCellCenterFromId: (...args: unknown[]) => unknown;
  getCoordsFromId: (...args: unknown[]) => unknown;
  getIdFromCoords: (...args: unknown[]) => unknown;
  getSide: (...args: unknown[]) => unknown;
  getSideFromCoords: (...args: unknown[]) => unknown;
  getX: (...args: unknown[]) => unknown;
  getY: (...args: unknown[]) => unknown;
  height: number;
  width: number;
}

export declare class PuzzleBase {
  get digitCount(): number;
  getCellAt: (...args: unknown[]) => unknown;
  getCellsCanHaveRepeats: (...args: unknown[]) => unknown;
  getCellsDiagonallyAdjacentToCell: (...args: unknown[]) => unknown;
  getCellsDiagonallyAdjacentToCoords: (...args: unknown[]) => unknown;
  getCellsOrthogonallyAdjacentToCell: (...args: unknown[]) => unknown;
  getCellsOrthogonallyAdjacentToCoords: (...args: unknown[]) => unknown;
  getCellsSeeEachOther: (...args: unknown[]) => unknown;
  getCellsSeenByCell: (...args: unknown[]) => unknown;
  getColumn: (...args: unknown[]) => unknown;
  getFriendlyDigitsForCell: (...args: unknown[]) => unknown;
  getRegion: (...args: unknown[]) => unknown;
  getRegionAt: (...args: unknown[]) => unknown;
  getRegionCells: (...args: unknown[]) => unknown;
  getRegions: (...args: unknown[]) => unknown;
  getRow: (...args: unknown[]) => unknown;
  getX: (...args: unknown[]) => unknown;
  getY: (...args: unknown[]) => unknown;
  hasRegions: (...args: unknown[]) => unknown;
  get height(): number;
  get maxDigit(): number;
  get minDigit(): number;
  get puzzleType(): string;
  get size(): number;
  unsafeGetCellAt: (...args: unknown[]) => unknown;
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
  add: (...args: unknown[]) => unknown;
  clear: (...args: unknown[]) => unknown;
  delete: (...args: unknown[]) => unknown;
  equals: (...args: unknown[]) => unknown;
  getLargestNumber: (...args: unknown[]) => unknown;
  getSmallestNumber: (...args: unknown[]) => unknown;
  has: (...args: unknown[]) => unknown;
  intersect: (...args: unknown[]) => unknown;
  intersects: (...args: unknown[]) => unknown;
  isDisjointFrom: (...args: unknown[]) => unknown;
  isSubsetOf: (...args: unknown[]) => unknown;
  isSupersetOf: (...args: unknown[]) => unknown;
  get size(): unknown;
  subtract: (...args: unknown[]) => unknown;
  union: (...args: unknown[]) => unknown;
  xor: (...args: unknown[]) => unknown;
  static from: (...args: unknown[]) => unknown;
  static getIntersection: (...args: unknown[]) => unknown;
  static getUnion: (...args: unknown[]) => unknown;
}

export declare class SumsHelper {
  getCombinationsForSumWithoutRepeat: (...args: unknown[]) => unknown;
  getCombinationsForSumsWithoutRepeat: (...args: unknown[]) => unknown;
  getExtremeSumsWithRepeat: (...args: unknown[]) => unknown;
  getExtremeSumsWithoutRepeat: (...args: unknown[]) => unknown;
  getMaximumSumWithoutRepeat: (...args: unknown[]) => unknown;
  getMinimumSumWithoutRepeat: (...args: unknown[]) => unknown;
  maxDigit: number;
  minDigit: number;
}

export declare class XSumsHelper {
  getXSumPossibilities: (...args: unknown[]) => unknown;
  maxDigit: number;
  sumHelper: SumsHelper;
}

export type ArrayUtils = {
  areSameLength: (...args: unknown[]) => unknown;
  chunk: (...args: unknown[]) => unknown;
  count: (...args: unknown[]) => unknown;
  countWhere: (...args: unknown[]) => unknown;
  createFilledArray: (...args: unknown[]) => unknown;
  ensureArray: (...args: unknown[]) => unknown;
  hasDuplicates: (...args: unknown[]) => unknown;
  includesEvery: (...args: unknown[]) => unknown;
  includesSome: (...args: unknown[]) => unknown;
  mapIterable: (...args: unknown[]) => unknown;
  remove: (...args: unknown[]) => unknown;
  removeFirst: (...args: unknown[]) => unknown;
  removeFirstWhere: (...args: unknown[]) => unknown;
  removeWhere: (...args: unknown[]) => unknown;
  shuffled: (...args: unknown[]) => unknown;
  sliceWrapped: (...args: unknown[]) => unknown;
  withoutAll: (...args: unknown[]) => unknown;
  withoutDuplicates: (...args: unknown[]) => unknown;
};

export type CombinatoricUtils = {
  getCombinationsForSum: (...args: unknown[]) => unknown;
};

export type CustomComponentInstance = {
  cellIds: number[];
  cells: number[];
  name: string;
  get allowsEmptyCells(): boolean;
  getExclusionGroup: (...args: unknown[]) => unknown;
  getIsDone: (...args: unknown[]) => unknown;
  initialize: (...args: unknown[]) => unknown;
  onValueSet: (...args: unknown[]) => unknown;
  update: (...args: unknown[]) => unknown;
  validate: (...args: unknown[]) => unknown;
  get validateDuringSolve(): boolean;
};

export type CustomComponentScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper;
};

export type GetAffectedCellsArgs = {};

export type InitialCodePuzzle = PuzzleBase & {
  helpers: InitialCodeScopeHelpers;
  addConstraintComponent: (...args: unknown[]) => unknown;
  getConstraintComponentsAt: (...args: unknown[]) => unknown;
  removeConstraintComponent: (...args: unknown[]) => unknown;
  setRegions: (...args: unknown[]) => unknown;
};

export type InitialCodeScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper & {
    sudoku: PuzzleState;
    getSubsetsPerRegion: (...args: unknown[]) => unknown;
  };
  lines: {
    getAllPairsAlongLines: (...args: unknown[]) => unknown;
    getCellsBetweenLineEnds: (...args: unknown[]) => unknown;
    getLineEnds: (...args: unknown[]) => unknown;
  };
  misc: {
    cellIdHelper: CellIdsHelper;
    cornerIdHelper: CornerIdsHelper;
    edgeIdHelper: EdgeIdsHelper;
    geometryHelper: CustomComponentScopeGeometryHelper;
    outerCellIdHelper: OuterCellIdsHelper;
    spec: PuzzleSpec;
    getCellGroupsFromLines: (...args: unknown[]) => unknown;
    getEdgesForNegativeConstraint: (...args: unknown[]) => unknown;
  };
};

export type InitializeArgs = {
  instance: CustomComponentInstance;
  puzzle: CustomComponentPuzzleBase;
};

export type IterationUtils = {
  getBest: (...args: unknown[]) => unknown;
  getCombinations: (...args: unknown[]) => unknown;
  getCounts: (...args: unknown[]) => unknown;
  getOne: (...args: unknown[]) => unknown;
  getRange: (...args: unknown[]) => unknown;
  getRangeInclusive: (...args: unknown[]) => unknown;
};

export type MathUtils = {
  clamp: (...args: unknown[]) => unknown;
  getFactors: (...args: unknown[]) => unknown;
  isPrime: (...args: unknown[]) => unknown;
  lerp: (...args: unknown[]) => unknown;
  mod: (...args: unknown[]) => unknown;
  product: (...args: unknown[]) => unknown;
  sum: (...args: unknown[]) => unknown;
  toDegrees: (...args: unknown[]) => unknown;
  toRadians: (...args: unknown[]) => unknown;
  triangularNumber: (...args: unknown[]) => unknown;
};

export type SetParamsArgs = {
  instance: CustomComponentInstance;
};

export type SetUtils = {
  addAll: (...args: unknown[]) => unknown;
  deleteAll: (...args: unknown[]) => unknown;
  difference: (...args: unknown[]) => unknown;
  filter: (...args: unknown[]) => unknown;
  hasAll: (...args: unknown[]) => unknown;
  hasSome: (...args: unknown[]) => unknown;
  hasSomeWhere: (...args: unknown[]) => unknown;
  intersection: (...args: unknown[]) => unknown;
  isEqual: (...args: unknown[]) => unknown;
  symmetricDifference: (...args: unknown[]) => unknown;
  takeOne: (...args: unknown[]) => unknown;
  union: (...args: unknown[]) => unknown;
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
  compareVectors: (...args: unknown[]) => unknown;
  difference: (...args: unknown[]) => unknown;
  getAngle: (...args: unknown[]) => unknown;
  getAverage: (...args: unknown[]) => unknown;
  getClamped: (...args: unknown[]) => unknown;
  getDistance: (...args: unknown[]) => unknown;
  getDotProduct: (...args: unknown[]) => unknown;
  getMagnitude: (...args: unknown[]) => unknown;
  getManhattanDistance: (...args: unknown[]) => unknown;
  getRotated: (...args: unknown[]) => unknown;
  isVectorGreaterThan: (...args: unknown[]) => unknown;
  normalized: (...args: unknown[]) => unknown;
  scaled: (...args: unknown[]) => unknown;
  scaledSum: (...args: unknown[]) => unknown;
  sum: (...args: unknown[]) => unknown;
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
