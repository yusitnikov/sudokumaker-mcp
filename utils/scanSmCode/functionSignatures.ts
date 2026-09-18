import type { FunctionSignatureInfo } from "./types";

export const functionSignatures: Record<string, Record<string, FunctionSignatureInfo>> = {
  ArrayUtils: {
    areSameLength: {
      processed: false,
      arguments: [
        {
          rest: true,
        },
      ],
      returnType: "boolean",
    },
    chunk: {
      processed: false,
      arguments: [{}, {}],
      returnType: "any[][]",
    },
    count: {
      processed: false,
      arguments: [
        {},
        {},
        {
          optional: true,
        },
      ],
    },
    countWhere: {
      processed: false,
      arguments: [{}, {}],
    },
    createFilledArray: {
      processed: false,
      arguments: [{}, {}],
      returnType: "any[]",
    },
    ensureArray: {
      processed: false,
      arguments: [{}],
      returnType: "any[]",
    },
    hasDuplicates: {
      processed: false,
      arguments: [{}, {}],
    },
    includesEvery: {
      processed: false,
      arguments: [{}, {}, {}],
      returnType: "boolean",
    },
    includesSome: {
      processed: false,
      arguments: [{}, {}, {}],
      returnType: "boolean",
    },
    mapIterable: {
      processed: false,
      arguments: [{}, {}],
      returnType: "any[]",
    },
    remove: {
      processed: false,
      arguments: [{}, {}, {}],
    },
    removeFirst: {
      processed: false,
      arguments: [{}, {}, {}],
    },
    removeFirstWhere: {
      processed: false,
      arguments: [{}, {}],
    },
    removeWhere: {
      processed: false,
      arguments: [{}, {}],
    },
    shuffled: {
      processed: false,
      arguments: [{}],
    },
    sliceWrapped: {
      processed: false,
      arguments: [{}, {}, {}],
      returnType: "any[]",
    },
    withoutAll: {
      processed: false,
      arguments: [{}, {}, {}],
    },
    withoutDuplicates: {
      processed: false,
      arguments: [{}, {}],
    },
  },
  CellIdsHelper: {
    areValidCoords: {
      processed: false,
      arguments: [{}],
    },
    getAllCellIds: {
      processed: false,
      arguments: [],
    },
    getCellCenterFromId: {
      processed: false,
      arguments: [{}],
      returnType: "{ x: any; y: any; }",
    },
    getCoordsFromId: {
      processed: false,
      arguments: [{}],
      returnType: "{ x: any; y: any; }",
    },
    getIdFromCoords: {
      processed: false,
      arguments: [{}],
    },
    getIdFromCoordsSafe: {
      processed: false,
      arguments: [{}],
    },
    getX: {
      processed: false,
      arguments: [{}],
    },
    getY: {
      processed: false,
      arguments: [{}],
      returnType: "number",
    },
  },
  CombinatoricUtils: {
    getCombinationsForSum: {
      processed: false,
      arguments: [
        {},
        {},
        {
          optional: true,
        },
        {
          optional: true,
        },
      ],
      returnType: "Generator<any, void, any>",
    },
  },
  ConnectivityHelper: {
    getOrthogonallyConnectedGroups: {
      processed: false,
      arguments: [{}],
    },
  },
  CornerIdsHelper: {
    getCoordsFromId: {
      processed: false,
      arguments: [{}],
      returnType: "{ x: number; y: number; }",
    },
    getIdFromCornerCoords: {
      processed: false,
      arguments: [{}],
    },
  },
  CustomComponentInstance: {
    getExclusionGroup: {
      processed: false,
      arguments: [{}],
      returnType: "never[]",
    },
    getIsDone: {
      processed: false,
      arguments: [{}],
    },
    initialize: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, any>",
    },
    onValueSet: {
      processed: false,
      arguments: [{}, {}, {}],
      returnType: "Generator<never, void, unknown>",
    },
    update: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<never, void, unknown>",
    },
    validate: {
      processed: false,
      arguments: [{}],
    },
  },
  CustomComponentPuzzleBase: {
    filterCandidatesInCell: {
      processed: false,
      arguments: [{}, {}],
    },
    filterCandidatesInCells: {
      processed: false,
      arguments: [{}, {}],
    },
    getCandidates: {
      processed: false,
      arguments: [{}],
    },
    getCandidatesBitMask: {
      processed: false,
      arguments: [{}],
    },
    getCellsAreFilled: {
      processed: false,
      arguments: [{}],
      returnType: "boolean",
    },
    getFriendlyCandidates: {
      processed: false,
      arguments: [{}],
    },
    getValue: {
      processed: false,
      arguments: [{}],
    },
    hasValue: {
      processed: false,
      arguments: [{}],
    },
    removeCandidateFromCell: {
      processed: false,
      arguments: [{}, {}],
    },
    removeCandidateFromCells: {
      processed: false,
      arguments: [{}, {}],
    },
    removeCandidatesFromCell: {
      processed: false,
      arguments: [{}, {}],
    },
    removeCandidatesFromCells: {
      processed: false,
      arguments: [{}, {}],
    },
    removeComponent: {
      processed: false,
      arguments: [],
    },
    replaceComponent: {
      processed: false,
      arguments: [{}, {}],
    },
    stop: {
      processed: false,
      arguments: [{}, {}],
    },
  },
  CustomComponentScopeGeometryHelper: {
    getAdjacentCells: {
      processed: false,
      arguments: [
        {},
        {
          optional: true,
        },
      ],
      returnType: "Generator<any, void, any>",
    },
    getAllColumns: {
      processed: false,
      arguments: [],
      returnType: "Generator<any[], void, unknown>",
    },
    getAllDiagonallyAdjacentPairs: {
      processed: false,
      arguments: [],
      returnType: "Generator<any, void, any>",
    },
    getAllDominoes: {
      processed: false,
      arguments: [],
      returnType: "Generator<any, void, any>",
    },
    getAllKingsMovePairs: {
      processed: false,
      arguments: [],
      returnType: "Generator<any, void, any>",
    },
    getAllKnightMovePairs: {
      processed: false,
      arguments: [],
      returnType: "Generator<any, void, any>",
    },
    getAllPairsWithOffset: {
      processed: false,
      arguments: [{}, {}],
    },
    getAllQuadruples: {
      processed: false,
      arguments: [],
      returnType: "Generator<any[], void, unknown>",
    },
    getAllRows: {
      processed: false,
      arguments: [],
      returnType: "Generator<any[], void, unknown>",
    },
    getCellsAreKingsMoveApart: {
      processed: false,
      arguments: [{}, {}],
      returnType: "boolean",
    },
    getCellsInColumn: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, unknown>",
    },
    getCellsInColumnOfCell: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, any>",
    },
    getCellsInDiagonal: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Generator<any, void, unknown>",
    },
    getCellsInRow: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, unknown>",
    },
    getCellsInRowOfCell: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, any>",
    },
    getCellsKnightsMoveAwayFromCell: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, unknown>",
    },
    getCellsPointedAtByOuterClue: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Generator<any, void, unknown>",
    },
    getCellsTouchingCorner: {
      processed: false,
      arguments: [{}],
    },
    getCellsTouchingEdge: {
      processed: false,
      arguments: [{}],
      returnType: "any[]",
    },
    getCoordsInDiagonal: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Generator<{ x: any; y: number; }, void, unknown>",
    },
    getCoordsPointedAtByOuterClue: {
      processed: false,
      arguments: [{}, {}],
    },
    getDiagonallyAdjacentCells: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, unknown>",
    },
    getManhattanDistanceBetweenCells: {
      processed: false,
      arguments: [{}, {}],
    },
    getOrthogonallyAdjacentCells: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, unknown>",
    },
  },
  DigitSet: {
    getLargestDigit: {
      processed: false,
      arguments: [],
    },
    getSmallestDigit: {
      processed: false,
      arguments: [],
    },
  },
  DigitsHelper: {
    createEvensDigitSet: {
      processed: false,
      arguments: [],
    },
    createFilteredDigitSet: {
      processed: false,
      arguments: [{}],
    },
    createFullDigitSet: {
      processed: false,
      arguments: [],
    },
    createModuloDigitSet: {
      processed: false,
      arguments: [{}, {}],
    },
    createOddsDigitSet: {
      processed: false,
      arguments: [],
    },
  },
  EdgeIdsHelper: {
    getCoordsFromId: {
      processed: false,
      arguments: [{}],
    },
    getIdFromCoords: {
      processed: false,
      arguments: [{}],
    },
  },
  InitialCodePuzzle: {
    addConstraintComponent: {
      processed: false,
      arguments: [{}],
      returnType: "void",
    },
    getConstraintComponentsAt: {
      processed: false,
      arguments: [{}],
    },
    removeConstraintComponent: {
      processed: false,
      arguments: [{}],
      returnType: "void",
    },
    setRegions: {
      processed: false,
      arguments: [{}],
      returnType: "void",
    },
  },
  InitialCodeScopeGeometryHelperValue: {
    getSubsetsPerRegion: {
      processed: false,
      arguments: [{}],
      returnType: "Map<any, any>",
    },
  },
  InitialCodeScopeLinesHelperValue: {
    getAllPairsAlongLines: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any[], void, unknown>",
    },
    getCellsBetweenLineEnds: {
      processed: false,
      arguments: [{}],
    },
    getLineEnds: {
      processed: false,
      arguments: [{}],
      returnType: "any[]",
    },
  },
  InitialCodeScopeMiscHelperValue: {
    getCellGroupsFromLines: {
      processed: false,
      arguments: [{}],
      returnType: "any[]",
    },
    getEdgesForNegativeConstraint: {
      processed: false,
      arguments: [{}],
    },
  },
  IterationUtils: {
    getBest: {
      processed: false,
      arguments: [{}, {}, {}],
    },
    getCombinations: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Generator<any[], void, unknown>",
    },
    getCounts: {
      processed: false,
      arguments: [{}],
      returnType: "Map<any, any>",
    },
    getOne: {
      processed: false,
      arguments: [{}],
    },
    getRange: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Generator<any, void, unknown>",
    },
    getRangeInclusive: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Generator<any, void, unknown>",
    },
  },
  MathUtils: {
    clamp: {
      processed: false,
      arguments: [{}, {}, {}],
      returnType: "number",
    },
    getFactors: {
      processed: false,
      arguments: [{}],
      returnType: "any[]",
    },
    isPrime: {
      processed: false,
      arguments: [{}],
    },
    lerp: {
      processed: false,
      arguments: [{}, {}, {}],
    },
    mod: {
      processed: false,
      arguments: [{}, {}],
      returnType: "number",
    },
    product: {
      processed: false,
      arguments: [{}],
      returnType: "number",
    },
    sum: {
      processed: false,
      arguments: [{}],
      returnType: "number",
    },
    toDegrees: {
      processed: false,
      arguments: [{}],
      returnType: "number",
    },
    toRadians: {
      processed: false,
      arguments: [{}],
      returnType: "number",
    },
    triangularNumber: {
      processed: false,
      arguments: [{}],
      returnType: "number",
    },
  },
  NamingHelper: {
    getBranchingLineName: {
      processed: false,
      arguments: [{}, {}],
      returnType: "string",
    },
    getCageName: {
      processed: false,
      arguments: [{}, {}],
      returnType: "string",
    },
    getCellName: {
      processed: false,
      arguments: [{}],
    },
    getCellsDescription: {
      processed: false,
      arguments: [{}],
    },
    getColumnName: {
      processed: false,
      arguments: [{}],
      returnType: "string",
    },
    getDigitFilterDescription: {
      processed: false,
      arguments: [{}],
      returnType: "string",
    },
    getDigitSetDescription: {
      processed: false,
      arguments: [
        {},
        {
          optional: true,
        },
      ],
    },
    getEdgeClueName: {
      processed: false,
      arguments: [{}, {}],
    },
    getEdgeClueNameFromDomino: {
      processed: false,
      arguments: [{}, {}],
      returnType: "string",
    },
    getLineName: {
      processed: false,
      arguments: [{}, {}],
      returnType: "string",
    },
    getOuterClueName: {
      processed: false,
      arguments: [{}, {}],
      returnType: "string | undefined",
    },
    getRowName: {
      processed: false,
      arguments: [{}],
      returnType: "string",
    },
    getTupleName: {
      processed: false,
      arguments: [{}],
    },
    getTupleNameBySize: {
      processed: false,
      arguments: [{}],
    },
  },
  OuterCellIdsHelper: {
    getAllAttributes: {
      processed: false,
      arguments: [{}],
      returnType: "{ x: any; y: any; side: any; }",
    },
    getCellCenterFromId: {
      processed: false,
      arguments: [{}],
    },
    getCoordsFromId: {
      processed: false,
      arguments: [{}],
    },
    getIdFromCoords: {
      processed: false,
      arguments: [{}],
    },
    getSide: {
      processed: false,
      arguments: [{}],
    },
    getSideFromCoords: {
      processed: false,
      arguments: [{}],
    },
    getX: {
      processed: false,
      arguments: [{}],
    },
    getY: {
      processed: false,
      arguments: [{}],
      returnType: "number",
    },
  },
  PuzzleBase: {
    getCellAt: {
      processed: false,
      arguments: [{}, {}],
    },
    getCellsCanHaveRepeats: {
      processed: false,
      arguments: [{}],
    },
    getCellsDiagonallyAdjacentToCell: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, any>",
    },
    getCellsDiagonallyAdjacentToCoords: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Generator<any, void, any>",
    },
    getCellsOrthogonallyAdjacentToCell: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<any, void, any>",
    },
    getCellsOrthogonallyAdjacentToCoords: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Generator<any, void, any>",
    },
    getCellsSeeEachOther: {
      processed: false,
      arguments: [{}],
    },
    getCellsSeenByCell: {
      processed: false,
      arguments: [{}, {}],
    },
    getColumn: {
      processed: false,
      arguments: [{}],
    },
    getFriendlyDigitsForCell: {
      processed: false,
      arguments: [{}],
    },
    getRegion: {
      processed: false,
      arguments: [{}],
    },
    getRegionAt: {
      processed: false,
      arguments: [{}, {}],
    },
    getRegionCells: {
      processed: false,
      arguments: [{}],
    },
    getRegions: {
      processed: false,
      arguments: [],
    },
    getRow: {
      processed: false,
      arguments: [{}],
    },
    getX: {
      processed: false,
      arguments: [{}],
    },
    getY: {
      processed: false,
      arguments: [{}],
    },
    hasRegions: {
      processed: false,
      arguments: [],
    },
    unsafeGetCellAt: {
      processed: false,
      arguments: [{}, {}],
    },
  },
  SetUtils: {
    addAll: {
      processed: false,
      arguments: [{}, {}],
    },
    deleteAll: {
      processed: false,
      arguments: [{}, {}, {}],
    },
    difference: {
      processed: false,
      arguments: [{}, {}, {}],
      returnType: "Set<unknown>",
    },
    filter: {
      processed: false,
      arguments: [{}, {}],
    },
    hasAll: {
      processed: false,
      arguments: [{}, {}, {}],
      returnType: "boolean",
    },
    hasSome: {
      processed: false,
      arguments: [{}, {}, {}],
      returnType: "boolean",
    },
    hasSomeWhere: {
      processed: false,
      arguments: [{}, {}],
      returnType: "boolean",
    },
    intersection: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Set<unknown>",
    },
    isEqual: {
      processed: false,
      arguments: [{}, {}, {}],
    },
    symmetricDifference: {
      processed: false,
      arguments: [{}, {}],
    },
    takeOne: {
      processed: false,
      arguments: [{}],
    },
    union: {
      processed: false,
      arguments: [{}, {}],
      returnType: "Set<unknown>",
    },
  },
  SmallNumberSet: {
    add: {
      processed: false,
      arguments: [{}],
      returnType: "void",
    },
    clear: {
      processed: false,
      arguments: [],
      returnType: "void",
    },
    delete: {
      processed: false,
      arguments: [{}],
      returnType: "void",
    },
    equals: {
      processed: false,
      arguments: [{}],
    },
    getLargestNumber: {
      processed: false,
      arguments: [],
    },
    getSmallestNumber: {
      processed: false,
      arguments: [],
    },
    has: {
      processed: false,
      arguments: [{}],
    },
    intersect: {
      processed: false,
      arguments: [{}],
    },
    intersects: {
      processed: false,
      arguments: [{}],
    },
    isDisjointFrom: {
      processed: false,
      arguments: [{}],
    },
    isSubsetOf: {
      processed: false,
      arguments: [{}],
    },
    isSupersetOf: {
      processed: false,
      arguments: [{}],
    },
    subtract: {
      processed: false,
      arguments: [{}],
    },
    union: {
      processed: false,
      arguments: [{}],
    },
    xor: {
      processed: false,
      arguments: [{}],
    },
    from: {
      processed: false,
      arguments: [{}],
    },
    getIntersection: {
      processed: false,
      arguments: [{}],
    },
    getUnion: {
      processed: false,
      arguments: [{}],
    },
  },
  SumsHelper: {
    getCombinationsForSumWithoutRepeat: {
      processed: false,
      arguments: [{}, {}],
    },
    getCombinationsForSumsWithoutRepeat: {
      processed: false,
      arguments: [{}, {}],
      returnType: "any[]",
    },
    getExtremeSumsWithRepeat: {
      processed: false,
      arguments: [{}, {}],
      returnType: "{ minSum: number; maxSum: number; }",
    },
    getExtremeSumsWithoutRepeat: {
      processed: false,
      arguments: [{}, {}],
    },
    getMaximumSumWithoutRepeat: {
      processed: false,
      arguments: [{}, {}],
    },
    getMinimumSumWithoutRepeat: {
      processed: false,
      arguments: [{}, {}],
    },
  },
  Vector2Funcs: {
    compareVectors: {
      processed: false,
      arguments: [{}, {}],
      returnType: "number",
    },
    difference: {
      processed: false,
      arguments: [{}, {}],
      returnType: "{ x: number; y: number; }",
    },
    getAngle: {
      processed: false,
      arguments: [{}, {}],
      returnType: "number",
    },
    getAverage: {
      processed: false,
      arguments: [{}],
      returnType: "{ x: number; y: number; }",
    },
    getClamped: {
      processed: false,
      arguments: [{}, {}],
      returnType: "{ x: any; y: any; }",
    },
    getDistance: {
      processed: false,
      arguments: [{}, {}],
      returnType: "number",
    },
    getDotProduct: {
      processed: false,
      arguments: [{}, {}],
      returnType: "number",
    },
    getMagnitude: {
      processed: false,
      arguments: [{}],
      returnType: "number",
    },
    getManhattanDistance: {
      processed: false,
      arguments: [{}, {}],
      returnType: "number",
    },
    getRotated: {
      processed: false,
      arguments: [{}, {}],
      returnType: "{ x: number; y: number; }",
    },
    isVectorGreaterThan: {
      processed: false,
      arguments: [{}, {}],
      returnType: "boolean",
    },
    normalized: {
      processed: false,
      arguments: [{}],
      returnType: "{ x: number; y: number; }",
    },
    scaled: {
      processed: false,
      arguments: [{}, {}],
      returnType: "{ x: number; y: number; }",
    },
    scaledSum: {
      processed: false,
      arguments: [{}, {}, {}],
      returnType: "{ x: any; y: any; }",
    },
    sum: {
      processed: false,
      arguments: [{}, {}],
      returnType: "{ x: any; y: any; }",
    },
  },
  XSumsHelper: {
    getXSumPossibilities: {
      processed: false,
      arguments: [{}],
      returnType: "Generator<{ x: number; combinations: any[]; }, void, unknown>",
    },
  },
};
