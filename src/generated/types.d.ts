// noinspection JSUnusedGlobalSymbols

export declare class CellIdsHelper {
  constructor(...args: any[]);
  areValidCoords: (...args: unknown[]) => any;
  getAllCellIds: (...args: unknown[]) => any;
  getCellCenterFromId: (...args: unknown[]) => any;
  getCoordsFromId: (...args: unknown[]) => any;
  getIdFromCoords: (...args: unknown[]) => any;
  getIdFromCoordsSafe: (...args: unknown[]) => any;
  getX: (...args: unknown[]) => any;
  getY: (...args: unknown[]) => any;
  height: number;
  width: number;
  spec: PuzzleSpec;
}

export declare class ConnectivityHelper {
  constructor(...args: any[]);
  getOrthogonallyConnectedGroups: (...args: unknown[]) => any;
  spec: PuzzleSpec;
  geometryHelper: CustomComponentScopeGeometryHelper;
}

export declare class CornerIdsHelper {
  constructor(...args: any[]);
  getCoordsFromId: (...args: unknown[]) => any;
  getIdFromCornerCoords: (...args: unknown[]) => any;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
}

export declare class CustomComponentPuzzleBase extends PuzzleBase {
  constructor(...args: any[]);
  filterCandidatesInCell: (...args: unknown[]) => any;
  filterCandidatesInCells: (...args: unknown[]) => any;
  getCandidates: (...args: unknown[]) => any;
  getCandidatesBitMask: (...args: unknown[]) => any;
  getCellsAreFilled: (...args: unknown[]) => any;
  getFriendlyCandidates: (...args: unknown[]) => any;
  getValue: (...args: unknown[]) => any;
  hasValue: (...args: unknown[]) => any;
  removeCandidateFromCell: (...args: unknown[]) => any;
  removeCandidateFromCells: (...args: unknown[]) => any;
  removeCandidatesFromCell: (...args: unknown[]) => any;
  removeCandidatesFromCells: (...args: unknown[]) => any;
  removeComponent: (...args: unknown[]) => any;
  replaceComponent: (...args: unknown[]) => any;
  stop: (...args: unknown[]) => any;
  helpers: CustomComponentScopeHelpers;
  instance: CustomComponentInstance;
}

export declare class CustomComponentScopeGeometryHelper {
  constructor(...args: any[]);
  getAdjacentCells: (...args: unknown[]) => any;
  getAllColumns: (...args: unknown[]) => any;
  getAllDiagonallyAdjacentPairs: (...args: unknown[]) => any;
  getAllDominoes: (...args: unknown[]) => any;
  getAllKingsMovePairs: (...args: unknown[]) => any;
  getAllKnightMovePairs: (...args: unknown[]) => any;
  getAllPairsWithOffset: (...args: unknown[]) => any;
  getAllQuadruples: (...args: unknown[]) => any;
  getAllRows: (...args: unknown[]) => any;
  getCellsAreKingsMoveApart: (...args: unknown[]) => any;
  getCellsInColumn: (...args: unknown[]) => any;
  getCellsInColumnOfCell: (...args: unknown[]) => any;
  getCellsInDiagonal: (...args: unknown[]) => any;
  getCellsInRow: (...args: unknown[]) => any;
  getCellsInRowOfCell: (...args: unknown[]) => any;
  getCellsKnightsMoveAwayFromCell: (...args: unknown[]) => any;
  getCellsPointedAtByOuterClue: (...args: unknown[]) => any;
  getCellsTouchingCorner: (...args: unknown[]) => any;
  getCellsTouchingEdge: (...args: unknown[]) => any;
  getCoordsInDiagonal: (...args: unknown[]) => any;
  getCoordsPointedAtByOuterClue: (...args: unknown[]) => any;
  getDiagonallyAdjacentCells: (...args: unknown[]) => any;
  getManhattanDistanceBetweenCells: (...args: unknown[]) => any;
  getOrthogonallyAdjacentCells: (...args: unknown[]) => any;
  height: number;
  width: number;
  outerCellIdHelper: OuterCellIdsHelper;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
  cornerIdHelper: CornerIdsHelper;
  edgeIdHelper: EdgeIdsHelper;
}

export declare class DigitSet extends SmallNumberSet {
  constructor(...args: any[]);
  getLargestDigit: (...args: unknown[]) => any;
  getSmallestDigit: (...args: unknown[]) => any;
}

export declare class DigitsHelper {
  constructor(...args: any[]);
  createEvensDigitSet: (...args: unknown[]) => any;
  createFilteredDigitSet: (...args: unknown[]) => any;
  createFullDigitSet: (...args: unknown[]) => any;
  createModuloDigitSet: (...args: unknown[]) => any;
  createOddsDigitSet: (...args: unknown[]) => any;
  allDigitsMask: number;
  maxDigit: number;
  minDigit: number;
}

export declare class EdgeIdsHelper {
  constructor(...args: any[]);
  getCoordsFromId: (...args: unknown[]) => any;
  getIdFromCoords: (...args: unknown[]) => any;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
}

export declare class Env {
  constructor(...args: any[]);
  verboseSolving: boolean;
}

export declare class Helpers {
  constructor(...args: any[]);
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
  constructor(...args: any[]);
  getBranchingLineName: (...args: unknown[]) => any;
  getCageName: (...args: unknown[]) => any;
  getCellName: (...args: unknown[]) => any;
  getCellsDescription: (...args: unknown[]) => any;
  getColumnName: (...args: unknown[]) => any;
  getDigitFilterDescription: (...args: unknown[]) => any;
  getDigitSetDescription: (...args: unknown[]) => any;
  getEdgeClueName: (...args: unknown[]) => any;
  getEdgeClueNameFromDomino: (...args: unknown[]) => any;
  getLineName: (...args: unknown[]) => any;
  getOuterClueName: (...args: unknown[]) => any;
  getRowName: (...args: unknown[]) => any;
  getTupleName: (...args: unknown[]) => any;
  getTupleNameBySize: (...args: unknown[]) => any;
  names: string[];
  digitsHelper: DigitsHelper;
  outerCellIdHelper: OuterCellIdsHelper;
  spec: PuzzleSpec;
  edgeIdHelper: EdgeIdsHelper;
  geometryHelper: CustomComponentScopeGeometryHelper;
}

export declare class OuterCellIdsHelper {
  constructor(...args: any[]);
  getAllAttributes: (...args: unknown[]) => any;
  getCellCenterFromId: (...args: unknown[]) => any;
  getCoordsFromId: (...args: unknown[]) => any;
  getIdFromCoords: (...args: unknown[]) => any;
  getSide: (...args: unknown[]) => any;
  getSideFromCoords: (...args: unknown[]) => any;
  getX: (...args: unknown[]) => any;
  getY: (...args: unknown[]) => any;
  height: number;
  width: number;
}

export declare class PuzzleBase {
  constructor(...args: any[]);
  get digitCount(): number;
  getCellAt: (...args: unknown[]) => any;
  getCellsCanHaveRepeats: (...args: unknown[]) => any;
  getCellsDiagonallyAdjacentToCell: (...args: unknown[]) => any;
  getCellsDiagonallyAdjacentToCoords: (...args: unknown[]) => any;
  getCellsOrthogonallyAdjacentToCell: (...args: unknown[]) => any;
  getCellsOrthogonallyAdjacentToCoords: (...args: unknown[]) => any;
  getCellsSeeEachOther: (...args: unknown[]) => any;
  getCellsSeenByCell: (...args: unknown[]) => any;
  getColumn: (...args: unknown[]) => any;
  getFriendlyDigitsForCell: (...args: unknown[]) => any;
  getRegion: (...args: unknown[]) => any;
  getRegionAt: (...args: unknown[]) => any;
  getRegionCells: (...args: unknown[]) => any;
  getRegions: (...args: unknown[]) => any;
  getRow: (...args: unknown[]) => any;
  getX: (...args: unknown[]) => any;
  getY: (...args: unknown[]) => any;
  hasRegions: (...args: unknown[]) => any;
  get height(): number;
  get maxDigit(): number;
  get minDigit(): number;
  get puzzleType(): string;
  get size(): number;
  unsafeGetCellAt: (...args: unknown[]) => any;
  get width(): number;
  state: PuzzleState;
  spec: PuzzleSpec;
}

export declare class PuzzleSpec {
  constructor(...args: any[]);
  digitCount: number;
  maxDigit: number;
  minDigit: number;
  type: string;
  size: PuzzleSpecSize;
}

export declare class PuzzleSpecSize {
  constructor(...args: any[]);
  height: number;
  width: number;
}

export declare class SmallNumberSet {
  constructor(...args: any[]);
  add: (...args: unknown[]) => any;
  clear: (...args: unknown[]) => any;
  delete: (...args: unknown[]) => any;
  equals: (...args: unknown[]) => any;
  getLargestNumber: (...args: unknown[]) => any;
  getSmallestNumber: (...args: unknown[]) => any;
  has: (...args: unknown[]) => any;
  intersect: (...args: unknown[]) => any;
  intersects: (...args: unknown[]) => any;
  isDisjointFrom: (...args: unknown[]) => any;
  isSubsetOf: (...args: unknown[]) => any;
  isSupersetOf: (...args: unknown[]) => any;
  get size(): unknown;
  subtract: (...args: unknown[]) => any;
  union: (...args: unknown[]) => any;
  xor: (...args: unknown[]) => any;
  static from: (...args: unknown[]) => any;
  static getIntersection: (...args: unknown[]) => any;
  static getUnion: (...args: unknown[]) => any;
}

export declare class SumsHelper {
  constructor(...args: any[]);
  getCombinationsForSumWithoutRepeat: (...args: unknown[]) => any;
  getCombinationsForSumsWithoutRepeat: (...args: unknown[]) => any;
  getExtremeSumsWithRepeat: (...args: unknown[]) => any;
  getExtremeSumsWithoutRepeat: (...args: unknown[]) => any;
  getMaximumSumWithoutRepeat: (...args: unknown[]) => any;
  getMinimumSumWithoutRepeat: (...args: unknown[]) => any;
  maxDigit: number;
  minDigit: number;
}

export declare class XSumsHelper {
  constructor(...args: any[]);
  getXSumPossibilities: (...args: unknown[]) => any;
  maxDigit: number;
  sumHelper: SumsHelper;
}

export type ArrayUtils = {
  areSameLength: (...args: unknown[]) => any;
  chunk: (...args: unknown[]) => any;
  count: (...args: unknown[]) => any;
  countWhere: (...args: unknown[]) => any;
  createFilledArray: (...args: unknown[]) => any;
  ensureArray: (...args: unknown[]) => any;
  hasDuplicates: (...args: unknown[]) => any;
  includesEvery: (...args: unknown[]) => any;
  includesSome: (...args: unknown[]) => any;
  mapIterable: (...args: unknown[]) => any;
  remove: (...args: unknown[]) => any;
  removeFirst: (...args: unknown[]) => any;
  removeFirstWhere: (...args: unknown[]) => any;
  removeWhere: (...args: unknown[]) => any;
  shuffled: (...args: unknown[]) => any;
  sliceWrapped: (...args: unknown[]) => any;
  withoutAll: (...args: unknown[]) => any;
  withoutDuplicates: (...args: unknown[]) => any;
};

export type CombinatoricUtils = {
  getCombinationsForSum: (...args: unknown[]) => any;
};

export type CustomComponentInstance = {
  cellIds: number[];
  cells: number[];
  name: string;
  get allowsEmptyCells(): boolean;
  getExclusionGroup: (...args: unknown[]) => any;
  getIsDone: (...args: unknown[]) => any;
  initialize: (...args: unknown[]) => any;
  onValueSet: (...args: unknown[]) => any;
  update: (...args: unknown[]) => any;
  validate: (...args: unknown[]) => any;
  get validateDuringSolve(): boolean;
};

export type CustomComponentScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper;
};

export type GetAffectedCellsArgs = {};

export type InitialCodePuzzle = PuzzleBase & {
  helpers: InitialCodeScopeHelpers;
  addConstraintComponent: (...args: unknown[]) => any;
  getConstraintComponentsAt: (...args: unknown[]) => any;
  removeConstraintComponent: (...args: unknown[]) => any;
  setRegions: (...args: unknown[]) => any;
};

export type InitialCodeScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper & {
    sudoku: PuzzleState;
    getSubsetsPerRegion: (...args: unknown[]) => any;
  };
  lines: {
    getAllPairsAlongLines: (...args: unknown[]) => any;
    getCellsBetweenLineEnds: (...args: unknown[]) => any;
    getLineEnds: (...args: unknown[]) => any;
  };
  misc: {
    cellIdHelper: CellIdsHelper;
    cornerIdHelper: CornerIdsHelper;
    edgeIdHelper: EdgeIdsHelper;
    geometryHelper: CustomComponentScopeGeometryHelper;
    outerCellIdHelper: OuterCellIdsHelper;
    spec: PuzzleSpec;
    getCellGroupsFromLines: (...args: unknown[]) => any;
    getEdgesForNegativeConstraint: (...args: unknown[]) => any;
  };
};

export type InitializeArgs = {
  instance: CustomComponentInstance;
  puzzle: CustomComponentPuzzleBase;
};

export type IterationUtils = {
  getBest: (...args: unknown[]) => any;
  getCombinations: (...args: unknown[]) => any;
  getCounts: (...args: unknown[]) => any;
  getOne: (...args: unknown[]) => any;
  getRange: (...args: unknown[]) => any;
  getRangeInclusive: (...args: unknown[]) => any;
};

export type MathUtils = {
  clamp: (...args: unknown[]) => any;
  getFactors: (...args: unknown[]) => any;
  isPrime: (...args: unknown[]) => any;
  lerp: (...args: unknown[]) => any;
  mod: (...args: unknown[]) => any;
  product: (...args: unknown[]) => any;
  sum: (...args: unknown[]) => any;
  toDegrees: (...args: unknown[]) => any;
  toRadians: (...args: unknown[]) => any;
  triangularNumber: (...args: unknown[]) => any;
};

export type SetParamsArgs = {
  instance: CustomComponentInstance;
};

export type SetUtils = {
  addAll: (...args: unknown[]) => any;
  deleteAll: (...args: unknown[]) => any;
  difference: (...args: unknown[]) => any;
  filter: (...args: unknown[]) => any;
  hasAll: (...args: unknown[]) => any;
  hasSome: (...args: unknown[]) => any;
  hasSomeWhere: (...args: unknown[]) => any;
  intersection: (...args: unknown[]) => any;
  isEqual: (...args: unknown[]) => any;
  symmetricDifference: (...args: unknown[]) => any;
  takeOne: (...args: unknown[]) => any;
  union: (...args: unknown[]) => any;
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
  compareVectors: (...args: unknown[]) => any;
  difference: (...args: unknown[]) => any;
  getAngle: (...args: unknown[]) => any;
  getAverage: (...args: unknown[]) => any;
  getClamped: (...args: unknown[]) => any;
  getDistance: (...args: unknown[]) => any;
  getDotProduct: (...args: unknown[]) => any;
  getMagnitude: (...args: unknown[]) => any;
  getManhattanDistance: (...args: unknown[]) => any;
  getRotated: (...args: unknown[]) => any;
  isVectorGreaterThan: (...args: unknown[]) => any;
  normalized: (...args: unknown[]) => any;
  scaled: (...args: unknown[]) => any;
  scaledSum: (...args: unknown[]) => any;
  sum: (...args: unknown[]) => any;
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
