// noinspection JSUnusedGlobalSymbols

export type PuzzleState = never;

export type Vector2 = { x: number; y: number };

export type CellId = number;
export type CornerId = number;
export type EdgeId = number;
export type OuterCellId = number;
export type Digit = number;
export type DigitSetMask = number;

export type Change = { readonly __brand: "Change" };

export declare class Component {
  readonly __brand: "Component";
}

export declare class Vector2Class {
  constructor(x?: number, y?: number);
  x: number;
  y: number;
  get magnitude(): number;
  get magnitudeSqr(): number;
  add(vector: Vector2): this;
  addScaled(vector: Vector2, factor: number): this;
  subtract(vector: Vector2): this;
  rotate(angle: number): this;
  scale(factor: number): this;
  normalize(): this;
  copy(vector: Vector2): this;
  static from(vector: Vector2): Vector2Class;
}

export declare class CellGraph {
  constructor(lines?: Iterable<CellId[]>, isGreaterThan?: (a: CellId, b: CellId) => boolean);
  addLine(cellIds: CellId[]): this;
  addPoint(cellId: CellId): void;
  addPoints(cellIds: Iterable<CellId>): void;
  addEdge(a: CellId, b: CellId): this;
  removeEdge(a: CellId, b: CellId, dropIsolated?: boolean): this;
  removePoint(cellId: CellId): this;
  hasEdge(a: CellId, b: CellId): boolean;
  hasPoint(cellId: CellId): boolean;
  getPoints(): CellId[];
  getEdges(): Generator<[CellId, CellId], void, undefined>;
  getPointsAdjacentTo(cellId: CellId): Set<CellId>;
  getPointCount(): number;
  isEmpty(): boolean;
  getAllComponents(): Generator<CellGraph, void, undefined>;
  getConnectedPointSets(cellIds?: Iterable<CellId>): Generator<CellId[], void, undefined>;
  getPointsConnectedTo(cellId: CellId): Set<CellId>;
  getComponentContainingPoint(cellId: CellId): CellGraph;
  getComponentsContainingPoints(cellIds: Iterable<CellId>): CellGraph;
  isSimpleLines(): boolean;
  hasCycles(): boolean;
  toArrays(): CellId[][];
  clone(): CellGraph;
}

export type CustomComponentInstance = {
  readonly __brand: "CustomComponent";
  readonly cellIds: CellId[];
  readonly cells: CellId[];
  readonly name: string;
  [member: string]: any;
};

export declare class CellIdsHelper {
  areValidCoords: (coords: Vector2) => boolean;
  getAllCellIds: () => CellId[];
  getCellCenterFromId: (cellId: CellId) => Vector2;
  getCoordsFromId: (cellId: CellId) => Vector2;
  getIdFromCoords: (coords: Vector2) => CellId;
  getIdFromCoordsSafe: (coords: Vector2) => CellId | undefined;
  getX: (cellId: CellId) => number;
  getY: (cellId: CellId) => number;
  height: number;
  width: number;
  spec: PuzzleSpec;
}

export declare class ConnectivityHelper {
  getOrthogonallyConnectedGroups: (cellIds: Iterable<CellId>) => Generator<CellGraph, void, undefined>;
  spec: PuzzleSpec;
  geometryHelper: CustomComponentScopeGeometryHelper;
}

export declare class CornerIdsHelper {
  getCoordsFromId: (cornerId: CornerId) => Vector2;
  getIdFromCornerCoords: (coords: Vector2) => CornerId;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
}

export declare class CustomComponentPuzzle extends PuzzleBase {
  filterCandidatesInCell: (candidates: DigitSetMask | SmallNumberSet, cellId: CellId) => Change;
  filterCandidatesInCells: (candidates: DigitSetMask | SmallNumberSet, cellIds: Iterable<CellId>) => Change;
  getCandidates: (cellId: CellId) => DigitSet;
  getCandidatesBitMask: (cellId: CellId) => DigitSetMask;
  getCellsAreFilled: (cellIds: Iterable<CellId>) => boolean;
  getFriendlyCandidates: (cellId: CellId) => DigitSet;
  getValue: (cellId: CellId) => Digit | undefined;
  hasValue: (cellId: CellId) => boolean;
  removeCandidateFromCell: (digit: Digit, cellId: CellId) => Change;
  removeCandidateFromCells: (digit: Digit, cellIds: Iterable<CellId>) => Change;
  removeCandidatesFromCell: (candidates: DigitSetMask | SmallNumberSet, cellId: CellId) => Change;
  removeCandidatesFromCells: (candidates: DigitSetMask | SmallNumberSet, cellIds: Iterable<CellId>) => Change;
  removeComponent: (instance?: CustomComponentInstance) => Change;
  replaceComponent: (
    currentOrReplacement: CustomComponentInstance | Component | Component[],
    replacement?: Component | Component[],
  ) => Change;
  stop: (message?: string, cellIds?: CellId[]) => Change;
  helpers: CustomComponentScopeHelpers;
  instance: CustomComponentInstance;
}

export declare class CustomComponentScopeGeometryHelper {
  getAdjacentCells: (cellId: CellId, includeDiagonal?: boolean) => Generator<CellId, void, undefined>;
  getAllColumns: () => Generator<CellId[], void, undefined>;
  getAllDiagonallyAdjacentPairs: () => Generator<[CellId, CellId], void, undefined>;
  getAllDominoes: () => Generator<[CellId, CellId], void, undefined>;
  getAllKingsMovePairs: () => Generator<[CellId, CellId], void, undefined>;
  getAllKnightMovePairs: () => Generator<[CellId, CellId], void, undefined>;
  getAllPairsWithOffset: (offsetX: number, offsetY: number) => Generator<[CellId, CellId], void, undefined>;
  getAllQuadruples: () => Generator<[CellId, CellId, CellId, CellId], void, undefined>;
  getAllRows: () => Generator<CellId[], void, undefined>;
  getCellsAreKingsMoveApart: (cellId1: CellId, cellId2: CellId) => boolean;
  getCellsInColumn: (columnIndex: number) => Generator<CellId, void, undefined>;
  getCellsInColumnOfCell: (cellId: CellId) => Generator<CellId, void, undefined>;
  getCellsInDiagonal: (diagonalType: DiagonalType, startX?: number) => Generator<CellId, void, undefined>;
  getCellsInRow: (rowIndex: number) => Generator<CellId, void, undefined>;
  getCellsInRowOfCell: (cellId: CellId) => Generator<CellId, void, undefined>;
  getCellsKnightsMoveAwayFromCell: (cellId: CellId) => Generator<CellId, void, undefined>;
  getCellsPointedAtByOuterClue: (
    outerCellId: OuterCellId,
    diagonalType?: DiagonalType,
  ) => Generator<CellId, void, undefined>;
  getCellsTouchingCorner: (cornerId: CornerId) => Generator<CellId, void, undefined>;
  getCellsTouchingEdge: (edgeId: EdgeId) => CellId[];
  getCoordsInDiagonal: (diagonalType: DiagonalType, startX?: number) => Generator<Vector2, void, undefined>;
  getCoordsPointedAtByOuterClue: (
    outerCellId: OuterCellId,
    diagonalType?: DiagonalType,
  ) => Generator<Vector2, void, undefined>;
  getDiagonallyAdjacentCells: (cellId: CellId) => Generator<CellId, void, undefined>;
  getManhattanDistanceBetweenCells: (cellId1: CellId, cellId2: CellId) => number;
  getOrthogonallyAdjacentCells: (cellId: CellId) => Generator<CellId, void, undefined>;
  height: number;
  width: number;
  outerCellIdHelper: OuterCellIdsHelper;
  spec: PuzzleSpec;
  cellIdHelper: CellIdsHelper;
  cornerIdHelper: CornerIdsHelper;
  edgeIdHelper: EdgeIdsHelper;
}

export declare class DigitSet extends SmallNumberSet {
  getLargestDigit: () => Digit | undefined;
  getSmallestDigit: () => Digit | undefined;
}

export declare class DigitsHelper {
  createEvensDigitSet: () => DigitSet;
  createFilteredDigitSet: (predicate: (digit: Digit) => boolean) => DigitSet;
  createFullDigitSet: () => DigitSet;
  createModuloDigitSet: (modulus: number, remainder: number) => DigitSet;
  createOddsDigitSet: () => DigitSet;
  allDigitsMask: DigitSetMask;
  maxDigit: Digit;
  minDigit: Digit;
}

export declare class EdgeIdsHelper {
  getCoordsFromId: (edgeId: EdgeId) => Vector2;
  getIdFromCoords: (coords: Vector2) => EdgeId;
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
  getBranchingLineName: (clueName: string, cellIds: CellId[]) => string;
  getCageName: (clueName: string, cellIds: CellId[]) => string;
  getCellName: (cellId: CellId) => string;
  getCellsDescription: (cellIds: Iterable<CellId>) => string;
  getColumnName: (columnIndex: number) => string;
  getDigitFilterDescription: (digits: DigitSetMask | SmallNumberSet) => string;
  getDigitSetDescription: (digits: DigitSetMask | SmallNumberSet, conjunction?: string) => string;
  getEdgeClueName: (clueName: string, edgeId: EdgeId) => string;
  getEdgeClueNameFromDomino: (clueName: string, cellIds: Iterable<CellId>) => string;
  getLineName: (clueName: string, cellIds: CellId[]) => string;
  getOuterClueName: (clueName: string, outerCellId: OuterCellId) => string | undefined;
  getRowName: (rowIndex: number) => string;
  getTupleName: (cellIds: CellId[]) => string;
  getTupleNameBySize: (size: number) => string;
  names: string[];
  digitsHelper: DigitsHelper;
  outerCellIdHelper: OuterCellIdsHelper;
  spec: PuzzleSpec;
  edgeIdHelper: EdgeIdsHelper;
  geometryHelper: CustomComponentScopeGeometryHelper;
}

export declare class OuterCellIdsHelper {
  getAllAttributes: (outerCellId: OuterCellId) => { x: number; y: number; side: OuterPosition };
  getCellCenterFromId: (outerCellId: OuterCellId) => Vector2Class;
  getCoordsFromId: (outerCellId: OuterCellId) => Vector2Class;
  getIdFromCoords: (coords: Vector2) => OuterCellId;
  getSide: (outerCellId: OuterCellId) => OuterPosition;
  getSideFromCoords: (coords: Vector2) => OuterPosition;
  getX: (outerCellId: OuterCellId) => number;
  getY: (outerCellId: OuterCellId) => number;
  height: number;
  width: number;
}

export declare class PuzzleBase {
  get digitCount(): number;
  getCellAt: (x: number, y: number) => CellId | undefined;
  getCellsCanHaveRepeats: (cellIds: Iterable<CellId>) => boolean;
  getCellsDiagonallyAdjacentToCell: (cellId: CellId) => Generator<CellId, void, undefined>;
  getCellsDiagonallyAdjacentToCoords: (x: number, y: number) => Generator<CellId, void, undefined>;
  getCellsOrthogonallyAdjacentToCell: (cellId: CellId) => Generator<CellId, void, undefined>;
  getCellsOrthogonallyAdjacentToCoords: (x: number, y: number) => Generator<CellId, void, undefined>;
  getCellsSeeEachOther: (cellIds: Iterable<CellId>) => boolean;
  getCellsSeenByCell: (cellId: CellId, includeClones?: boolean) => Set<CellId>;
  getColumn: (cellId: CellId) => number;
  getFriendlyDigitsForCell: (cellId: CellId) => DigitSet;
  getRegion: (cellId: CellId) => number;
  getRegionAt: (x: number, y: number) => number;
  getRegionCells: (regionId: number) => CellId[];
  getRegions: () => CellId[][];
  getRow: (cellId: CellId) => number;
  getX: (cellId: CellId) => number;
  getY: (cellId: CellId) => number;
  hasRegions: () => boolean;
  get height(): number;
  get maxDigit(): Digit;
  get minDigit(): Digit;
  get puzzleType(): string;
  get size(): number;
  unsafeGetCellAt: (x: number, y: number) => CellId;
  get width(): number;
  state: PuzzleState;
  spec: PuzzleSpec;
}

export declare class PuzzleSpec {
  digitCount: number;
  maxDigit: Digit;
  minDigit: Digit;
  type: string;
  size: PuzzleSpecSize;
}

export declare class PuzzleSpecSize {
  height: number;
  width: number;
}

export declare class SmallNumberSet {
  constructor(value?: DigitSetMask | SmallNumberSet);
  mask: DigitSetMask;
  valueOf(): DigitSetMask;
  [Symbol.iterator](): Generator<number, void, undefined>;
  add: (value: number) => void;
  clear: () => void;
  delete: (value: number) => void;
  equals: (other: DigitSetMask | SmallNumberSet) => boolean;
  getLargestNumber: () => number | undefined;
  getSmallestNumber: () => number | undefined;
  has: (value: number) => boolean;
  intersect: (other: DigitSetMask | SmallNumberSet) => this;
  intersects: (other: DigitSetMask | SmallNumberSet) => boolean;
  isDisjointFrom: (other: DigitSetMask | SmallNumberSet) => boolean;
  isSubsetOf: (other: DigitSetMask | SmallNumberSet) => boolean;
  isSupersetOf: (other: DigitSetMask | SmallNumberSet) => boolean;
  get size(): number;
  subtract: (other: DigitSetMask | SmallNumberSet) => this;
  union: (other: DigitSetMask | SmallNumberSet) => this;
  xor: (other: DigitSetMask | SmallNumberSet) => this;
  static from: <T extends SmallNumberSet>(this: new (...args: any[]) => T, values: Iterable<number>) => T;
  static getIntersection: <T extends SmallNumberSet>(
    this: new (...args: any[]) => T,
    sets: Iterable<DigitSetMask | SmallNumberSet>,
  ) => T;
  static getUnion: <T extends SmallNumberSet>(
    this: new (...args: any[]) => T,
    sets: Iterable<DigitSetMask | SmallNumberSet>,
  ) => T;
}

export declare class SumsHelper {
  getCombinationsForSumWithoutRepeat: (sum: number, count: number) => Digit[][];
  getCombinationsForSumsWithoutRepeat: (sums: Iterable<number>, count: number) => Digit[][];
  getExtremeSumsWithRepeat: (
    candidates: (DigitSetMask | SmallNumberSet)[],
    multipliers?: number[],
  ) => { minSum: number; maxSum: number };
  getExtremeSumsWithoutRepeat: (
    candidates: (DigitSetMask | SmallNumberSet)[],
    multipliers?: number[],
  ) => { minSum: number; maxSum: number | null } | null;
  getMaximumSumWithoutRepeat: (candidates: (DigitSetMask | SmallNumberSet)[], multipliers?: number[]) => number | null;
  getMinimumSumWithoutRepeat: (candidates: (DigitSetMask | SmallNumberSet)[], multipliers?: number[]) => number | null;
  maxDigit: Digit;
  minDigit: Digit;
}

export declare class XSumsHelper {
  getXSumPossibilities: (sum: number) => Generator<{ x: Digit; combinations: DigitSetMask[] }, void, undefined>;
  maxDigit: Digit;
  sumHelper: SumsHelper;
}

export type ArrayUtils = {
  areSameLength: <T>(...arrays: T[][]) => boolean;
  chunk: <T>(items: T[], size: number) => T[][];
  count: <T>(items: T[], value: T, options?: { comparator?: (a: T, b: T) => boolean }) => number;
  countWhere: <T>(items: T[], predicate: (item: T) => boolean) => number;
  createFilledArray: <T>(length: number, value: T) => T[];
  ensureArray: <T>(value: T | T[]) => T[];
  hasDuplicates: <T>(items: T[], options?: { comparator?: (a: T, b: T) => boolean }) => boolean;
  includesEvery: <T>(items: T[], values: Iterable<T>, options?: { comparator?: (a: T, b: T) => boolean }) => boolean;
  includesSome: <T>(items: T[], values: Iterable<T>, options?: { comparator?: (a: T, b: T) => boolean }) => boolean;
  mapIterable: <T, R>(items: Iterable<T>, map: (item: T) => R) => R[];
  remove: <T>(items: T[], values: Iterable<T>, options?: { comparator?: (a: T, b: T) => boolean }) => T[];
  removeFirst: <T>(items: T[], value: T, options?: { comparator?: (a: T, b: T) => boolean }) => T[];
  removeFirstWhere: <T>(items: T[], predicate: (item: T) => boolean) => T[];
  removeWhere: <T>(items: T[], predicate: (item: T) => boolean) => T[];
  shuffled: <T>(items: T[]) => T[];
  sliceWrapped: <T>(items: T[], from: number, to: number) => T[];
  withoutAll: <T>(items: T[], values: Iterable<T>, options?: { comparator?: (a: T, b: T) => boolean }) => T[];
  withoutDuplicates: <T>(items: T[], options?: { comparator?: (a: T, b: T) => boolean }) => T[];
};

export type CombinatoricUtils = {
  getCombinationsForSum: (
    values: Iterable<number>,
    sum: number,
    minCount?: number,
    maxCount?: number,
  ) => Generator<number[], void, undefined>;
};

export type CustomComponentScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper;
};

export type GetAffectedCellsArgs = {};

export type InitialCodePuzzle = PuzzleBase & {
  helpers: InitialCodeScopeHelpers;
  addConstraintComponent: (component: Component) => void;
  getConstraintComponentsAt: (cellId: CellId) => Set<Component>;
  removeConstraintComponent: (component: Component) => void;
  setRegions: (regionIdsByCellId: number[]) => void;
};

export type InitialCodeScopeHelpers = Helpers & {
  geometry: CustomComponentScopeGeometryHelper & {
    sudoku: PuzzleState;
    getSubsetsPerRegion: (cellIds: Iterable<CellId>) => Map<number, CellId[]>;
  };
  lines: {
    getAllPairsAlongLines: (lines: Iterable<CellId[]>) => Generator<[CellId, CellId], void, undefined>;
    getCellsBetweenLineEnds: (line: CellId[]) => CellId[];
    getLineEnds: (line: CellId[]) => [CellId, CellId];
  };
  misc: {
    cellIdHelper: CellIdsHelper;
    cornerIdHelper: CornerIdsHelper;
    edgeIdHelper: EdgeIdsHelper;
    geometryHelper: CustomComponentScopeGeometryHelper;
    outerCellIdHelper: OuterCellIdsHelper;
    spec: PuzzleSpec;
    getCellGroupsFromLines: (lines: Iterable<CellId[]>) => CellId[][];
    getEdgesForNegativeConstraint: (clues: Iterable<{ edge: EdgeId }>) => Generator<EdgeId, void, undefined>;
  };
};

export type InitializeArgs = {
  instance: CustomComponentInstance;
  puzzle: CustomComponentPuzzle;
};

export type IterationUtils = {
  getBest: <T>(items: Iterable<T>, getScore: (item: T) => number, fallback: T) => T;
  getCombinations: <T>(items: Iterable<T>, count: number) => Generator<T[], void, undefined>;
  getCounts: <T>(items: Iterable<T>) => Map<T, number>;
  getOne: <T>(items: Iterable<T>) => T | undefined;
  getRange: (from: number, to: number) => Generator<number, void, undefined>;
  getRangeInclusive: (from: number, to: number) => Generator<number, void, undefined>;
};

export type MathUtils = {
  clamp: (value: number, min: number, max: number) => number;
  getFactors: (value: number) => number[];
  isPrime: (value: number) => boolean;
  lerp: (from: number, to: number, ratio: number) => number;
  mod: (value: number, modulus: number) => number;
  product: (values: Iterable<number>) => number;
  sum: (values: Iterable<number>) => number;
  toDegrees: (radians: number) => number;
  toRadians: (degrees: number) => number;
  triangularNumber: (n: number) => number;
};

export type SetParamsArgs = {
  instance: CustomComponentInstance;
};

export type SetUtils = {
  addAll: <T>(set: Set<T>, values: Iterable<T>) => Set<T>;
  deleteAll: <T>(set: Set<T>, values: Iterable<T>, options?: { comparator?: (a: T, b: T) => boolean }) => Set<T>;
  difference: <T>(set: Set<T>, values: Iterable<T>, options?: { comparator?: (a: T, b: T) => boolean }) => Set<T>;
  filter: <T>(set: Set<T>, keep: Set<T>) => Set<T>;
  hasAll: <T>(set: Set<T>, values: Iterable<T>, options?: { comparator?: (a: T, b: T) => boolean }) => boolean;
  hasSome: <T>(set: Set<T>, values: Iterable<T>, options?: { comparator?: (a: T, b: T) => boolean }) => boolean;
  hasSomeWhere: <T>(set: Iterable<T>, predicate: (item: T) => boolean) => boolean;
  intersection: <T>(set1: Set<T>, set2: Set<T>) => Set<T>;
  isEqual: <T>(set1: Set<T>, set2: Set<T>, options?: { comparator?: (a: T, b: T) => boolean }) => boolean;
  symmetricDifference: <T>(set1: Iterable<T>, set2: Iterable<T>) => Set<T>;
  takeOne: <T>(set: Set<T>) => T | undefined;
  union: <T>(set1: Set<T>, set2: Iterable<T>) => Set<T>;
};

export type UpdateArgs = {
  instance: CustomComponentInstance;
  puzzle: CustomComponentPuzzle;
};

export type ValidateArgs = {
  instance: CustomComponentInstance;
  puzzle: CustomComponentPuzzle;
};

export type Vector2Funcs = {
  compareVectors: (vector1: Vector2, vector2: Vector2) => number;
  difference: (vector1: Vector2, vector2: Vector2) => Vector2;
  getAngle: (vector1: Vector2, vector2: Vector2) => number;
  getAverage: (vectors: Iterable<Vector2>) => Vector2;
  getClamped: (vector: Vector2, rect: { x: number; y: number; width: number; height: number }) => Vector2;
  getDistance: (vector1: Vector2, vector2: Vector2) => number;
  getDotProduct: (vector1: Vector2, vector2: Vector2) => number;
  getMagnitude: (vector: Vector2) => number;
  getManhattanDistance: (vector1: Vector2, vector2: Vector2) => number;
  getRotated: (vector: Vector2, angle: number) => Vector2;
  isVectorGreaterThan: (vector1: Vector2, vector2: Vector2) => boolean;
  normalized: (vector: Vector2) => Vector2;
  scaled: (vector: Vector2, factor: number) => Vector2;
  scaledSum: (vector1: Vector2, vector2: Vector2, factor: number) => Vector2;
  sum: (vector1: Vector2, vector2: Vector2) => Vector2;
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
