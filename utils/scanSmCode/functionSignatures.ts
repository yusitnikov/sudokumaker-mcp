import type { FunctionSignatureInfo } from "./types";

export const functionSignatures: Record<string, Record<string, FunctionSignatureInfo>> = {
  ArrayUtils: {
    areSameLength: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "arrays",
          type: "T[][]",
          rest: true,
        },
      ],
      returnType: "boolean",
    },
    chunk: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "size",
          type: "number",
        },
      ],
      returnType: "T[][]",
    },
    count: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "value",
          type: "T",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "number",
    },
    countWhere: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "predicate",
          type: "(item: T) => boolean",
        },
      ],
      returnType: "number",
    },
    createFilledArray: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "length",
          type: "number",
        },
        {
          name: "value",
          type: "T",
        },
      ],
      returnType: "T[]",
    },
    ensureArray: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "value",
          type: "T | T[]",
        },
      ],
      returnType: "T[]",
    },
    hasDuplicates: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "boolean",
    },
    includesEvery: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "values",
          type: "Iterable<T>",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "boolean",
    },
    includesSome: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "values",
          type: "Iterable<T>",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "boolean",
    },
    mapIterable: {
      processed: true,
      typeParams: ["T", "R"],
      arguments: [
        {
          name: "items",
          type: "Iterable<T>",
        },
        {
          name: "map",
          type: "(item: T) => R",
        },
      ],
      returnType: "R[]",
    },
    remove: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "values",
          type: "Iterable<T>",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "T[]",
    },
    removeFirst: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "value",
          type: "T",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "T[]",
    },
    removeFirstWhere: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "predicate",
          type: "(item: T) => boolean",
        },
      ],
      returnType: "T[]",
    },
    removeWhere: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "predicate",
          type: "(item: T) => boolean",
        },
      ],
      returnType: "T[]",
    },
    shuffled: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
      ],
      returnType: "T[]",
    },
    sliceWrapped: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "from",
          type: "number",
        },
        {
          name: "to",
          type: "number",
        },
      ],
      returnType: "T[]",
    },
    withoutAll: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "values",
          type: "Iterable<T>",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "T[]",
    },
    withoutDuplicates: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "T[]",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "T[]",
    },
  },
  CellIdsHelper: {
    areValidCoords: {
      processed: true,
      arguments: [
        {
          name: "coords",
          type: "Vector2",
        },
      ],
      returnType: "boolean",
    },
    getAllCellIds: {
      processed: true,
      arguments: [],
      returnType: "CellId[]",
    },
    getCellCenterFromId: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Vector2",
    },
    getCoordsFromId: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Vector2",
    },
    getIdFromCoords: {
      processed: true,
      arguments: [
        {
          name: "coords",
          type: "Vector2",
        },
      ],
      returnType: "CellId",
    },
    getIdFromCoordsSafe: {
      processed: true,
      arguments: [
        {
          name: "coords",
          type: "Vector2",
        },
      ],
      returnType: "CellId | undefined",
    },
    getX: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "number",
    },
    getY: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "number",
    },
  },
  CombinatoricUtils: {
    getCombinationsForSum: {
      processed: true,
      arguments: [
        {
          name: "values",
          type: "Iterable<number>",
        },
        {
          name: "sum",
          type: "number",
        },
        {
          name: "minCount",
          type: "number",
          optional: true,
        },
        {
          name: "maxCount",
          type: "number",
          optional: true,
        },
      ],
      returnType: "Generator<number[], void, undefined>",
    },
  },
  ConnectivityHelper: {
    getOrthogonallyConnectedGroups: {
      processed: true,
      arguments: [
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "Generator<CellGraph, void, undefined>",
    },
  },
  CornerIdsHelper: {
    getCoordsFromId: {
      processed: true,
      arguments: [
        {
          name: "cornerId",
          type: "CornerId",
        },
      ],
      returnType: "Vector2",
    },
    getIdFromCornerCoords: {
      processed: true,
      arguments: [
        {
          name: "coords",
          type: "Vector2",
        },
      ],
      returnType: "CornerId",
    },
  },
  CustomComponentPuzzleBase: {
    filterCandidatesInCell: {
      processed: true,
      arguments: [
        {
          name: "candidates",
          type: "DigitSetMask | SmallNumberSet",
        },
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "SolverAction",
    },
    filterCandidatesInCells: {
      processed: true,
      arguments: [
        {
          name: "candidates",
          type: "DigitSetMask | SmallNumberSet",
        },
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "SolverAction",
    },
    getCandidates: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "DigitSet",
    },
    getCandidatesBitMask: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "DigitSetMask",
    },
    getCellsAreFilled: {
      processed: true,
      arguments: [
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "boolean",
    },
    getFriendlyCandidates: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "DigitSet",
    },
    getValue: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Digit | undefined",
    },
    hasValue: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "boolean",
    },
    removeCandidateFromCell: {
      processed: true,
      arguments: [
        {
          name: "digit",
          type: "Digit",
        },
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "SolverAction",
    },
    removeCandidateFromCells: {
      processed: true,
      arguments: [
        {
          name: "digit",
          type: "Digit",
        },
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "SolverAction",
    },
    removeCandidatesFromCell: {
      processed: true,
      arguments: [
        {
          name: "candidates",
          type: "DigitSetMask | SmallNumberSet",
        },
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "SolverAction",
    },
    removeCandidatesFromCells: {
      processed: true,
      arguments: [
        {
          name: "candidates",
          type: "DigitSetMask | SmallNumberSet",
        },
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "SolverAction",
    },
    removeComponent: {
      processed: true,
      arguments: [],
      returnType: "SolverAction",
    },
    replaceComponent: {
      processed: true,
      arguments: [
        {
          name: "currentOrReplacement",
          type: "CustomComponentInstance | Component | Component[]",
        },
        {
          name: "replacement",
          type: "Component | Component[]",
          optional: true,
        },
      ],
      returnType: "SolverAction",
    },
    stop: {
      processed: true,
      arguments: [
        {
          name: "message",
          type: "string",
          optional: true,
        },
        {
          name: "cellIds",
          type: "CellId[]",
          optional: true,
        },
      ],
      returnType: "SolverAction",
    },
  },
  CustomComponentScopeGeometryHelper: {
    getAdjacentCells: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
        {
          name: "includeDiagonal",
          type: "boolean",
          optional: true,
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getAllColumns: {
      processed: true,
      arguments: [],
      returnType: "Generator<CellId[], void, undefined>",
    },
    getAllDiagonallyAdjacentPairs: {
      processed: true,
      arguments: [],
      returnType: "Generator<[CellId, CellId], void, undefined>",
    },
    getAllDominoes: {
      processed: true,
      arguments: [],
      returnType: "Generator<[CellId, CellId], void, undefined>",
    },
    getAllKingsMovePairs: {
      processed: true,
      arguments: [],
      returnType: "Generator<[CellId, CellId], void, undefined>",
    },
    getAllKnightMovePairs: {
      processed: true,
      arguments: [],
      returnType: "Generator<[CellId, CellId], void, undefined>",
    },
    getAllPairsWithOffset: {
      processed: true,
      arguments: [
        {
          name: "offsetX",
          type: "number",
        },
        {
          name: "offsetY",
          type: "number",
        },
      ],
      returnType: "Generator<[CellId, CellId], void, undefined>",
    },
    getAllQuadruples: {
      processed: true,
      arguments: [],
      returnType: "Generator<[CellId, CellId, CellId, CellId], void, undefined>",
    },
    getAllRows: {
      processed: true,
      arguments: [],
      returnType: "Generator<CellId[], void, undefined>",
    },
    getCellsAreKingsMoveApart: {
      processed: true,
      arguments: [
        {
          name: "cellId1",
          type: "CellId",
        },
        {
          name: "cellId2",
          type: "CellId",
        },
      ],
      returnType: "boolean",
    },
    getCellsInColumn: {
      processed: true,
      arguments: [
        {
          name: "columnIndex",
          type: "number",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsInColumnOfCell: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsInDiagonal: {
      processed: true,
      arguments: [
        {
          name: "diagonalType",
          type: "DiagonalType",
        },
        {
          name: "startX",
          type: "number",
          optional: true,
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsInRow: {
      processed: true,
      arguments: [
        {
          name: "rowIndex",
          type: "number",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsInRowOfCell: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsKnightsMoveAwayFromCell: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsPointedAtByOuterClue: {
      processed: true,
      arguments: [
        {
          name: "outerCellId",
          type: "OuterCellId",
        },
        {
          name: "diagonalType",
          type: "DiagonalType",
          optional: true,
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsTouchingCorner: {
      processed: true,
      arguments: [
        {
          name: "cornerId",
          type: "CornerId",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsTouchingEdge: {
      processed: true,
      arguments: [
        {
          name: "edgeId",
          type: "EdgeId",
        },
      ],
      returnType: "CellId[]",
    },
    getCoordsInDiagonal: {
      processed: true,
      arguments: [
        {
          name: "diagonalType",
          type: "DiagonalType",
        },
        {
          name: "startX",
          type: "number",
          optional: true,
        },
      ],
      returnType: "Generator<Vector2, void, undefined>",
    },
    getCoordsPointedAtByOuterClue: {
      processed: true,
      arguments: [
        {
          name: "outerCellId",
          type: "OuterCellId",
        },
        {
          name: "diagonalType",
          type: "DiagonalType",
          optional: true,
        },
      ],
      returnType: "Generator<Vector2, void, undefined>",
    },
    getDiagonallyAdjacentCells: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getManhattanDistanceBetweenCells: {
      processed: true,
      arguments: [
        {
          name: "cellId1",
          type: "CellId",
        },
        {
          name: "cellId2",
          type: "CellId",
        },
      ],
      returnType: "number",
    },
    getOrthogonallyAdjacentCells: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
  },
  DigitSet: {
    getLargestDigit: {
      processed: true,
      arguments: [],
      returnType: "Digit | undefined",
    },
    getSmallestDigit: {
      processed: true,
      arguments: [],
      returnType: "Digit | undefined",
    },
  },
  DigitsHelper: {
    createEvensDigitSet: {
      processed: true,
      arguments: [],
      returnType: "DigitSet",
    },
    createFilteredDigitSet: {
      processed: true,
      arguments: [
        {
          name: "predicate",
          type: "(digit: Digit) => boolean",
        },
      ],
      returnType: "DigitSet",
    },
    createFullDigitSet: {
      processed: true,
      arguments: [],
      returnType: "DigitSet",
    },
    createModuloDigitSet: {
      processed: true,
      arguments: [
        {
          name: "modulus",
          type: "number",
        },
        {
          name: "remainder",
          type: "number",
        },
      ],
      returnType: "DigitSet",
    },
    createOddsDigitSet: {
      processed: true,
      arguments: [],
      returnType: "DigitSet",
    },
  },
  EdgeIdsHelper: {
    getCoordsFromId: {
      processed: true,
      arguments: [
        {
          name: "edgeId",
          type: "EdgeId",
        },
      ],
      returnType: "Vector2",
    },
    getIdFromCoords: {
      processed: true,
      arguments: [
        {
          name: "coords",
          type: "Vector2",
        },
      ],
      returnType: "EdgeId",
    },
  },
  InitialCodePuzzle: {
    addConstraintComponent: {
      processed: true,
      arguments: [
        {
          name: "component",
          type: "Component",
        },
      ],
      returnType: "void",
    },
    getConstraintComponentsAt: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Set<Component>",
    },
    removeConstraintComponent: {
      processed: true,
      arguments: [
        {
          name: "component",
          type: "Component",
        },
      ],
      returnType: "void",
    },
    setRegions: {
      processed: true,
      arguments: [
        {
          name: "regionIdsByCellId",
          type: "number[]",
        },
      ],
      returnType: "void",
    },
  },
  InitialCodeScopeGeometryHelperValue: {
    getSubsetsPerRegion: {
      processed: true,
      arguments: [
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "Map<number, CellId[]>",
    },
  },
  InitialCodeScopeLinesHelperValue: {
    getAllPairsAlongLines: {
      processed: true,
      arguments: [
        {
          name: "lines",
          type: "Iterable<CellId[]>",
        },
      ],
      returnType: "Generator<[CellId, CellId], void, undefined>",
    },
    getCellsBetweenLineEnds: {
      processed: true,
      arguments: [
        {
          name: "line",
          type: "CellId[]",
        },
      ],
      returnType: "CellId[]",
    },
    getLineEnds: {
      processed: true,
      arguments: [
        {
          name: "line",
          type: "CellId[]",
        },
      ],
      returnType: "[CellId, CellId]",
    },
  },
  InitialCodeScopeMiscHelperValue: {
    getCellGroupsFromLines: {
      processed: true,
      arguments: [
        {
          name: "lines",
          type: "Iterable<CellId[]>",
        },
      ],
      returnType: "CellId[][]",
    },
    getEdgesForNegativeConstraint: {
      processed: true,
      arguments: [
        {
          name: "clues",
          type: "Iterable<{ edge: EdgeId }>",
        },
      ],
      returnType: "Generator<EdgeId, void, undefined>",
    },
  },
  IterationUtils: {
    getBest: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "Iterable<T>",
        },
        {
          name: "getScore",
          type: "(item: T) => number",
        },
        {
          name: "fallback",
          type: "T",
        },
      ],
      returnType: "T",
    },
    getCombinations: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "Iterable<T>",
        },
        {
          name: "count",
          type: "number",
        },
      ],
      returnType: "Generator<T[], void, undefined>",
    },
    getCounts: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "Iterable<T>",
        },
      ],
      returnType: "Map<T, number>",
    },
    getOne: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "items",
          type: "Iterable<T>",
        },
      ],
      returnType: "T | undefined",
    },
    getRange: {
      processed: true,
      arguments: [
        {
          name: "from",
          type: "number",
        },
        {
          name: "to",
          type: "number",
        },
      ],
      returnType: "Generator<number, void, undefined>",
    },
    getRangeInclusive: {
      processed: true,
      arguments: [
        {
          name: "from",
          type: "number",
        },
        {
          name: "to",
          type: "number",
        },
      ],
      returnType: "Generator<number, void, undefined>",
    },
  },
  MathUtils: {
    clamp: {
      processed: true,
      arguments: [
        {
          name: "value",
          type: "number",
        },
        {
          name: "min",
          type: "number",
        },
        {
          name: "max",
          type: "number",
        },
      ],
      returnType: "number",
    },
    getFactors: {
      processed: true,
      arguments: [
        {
          name: "value",
          type: "number",
        },
      ],
      returnType: "number[]",
    },
    isPrime: {
      processed: true,
      arguments: [
        {
          name: "value",
          type: "number",
        },
      ],
      returnType: "boolean",
    },
    lerp: {
      processed: true,
      arguments: [
        {
          name: "from",
          type: "number",
        },
        {
          name: "to",
          type: "number",
        },
        {
          name: "ratio",
          type: "number",
        },
      ],
      returnType: "number",
    },
    mod: {
      processed: true,
      arguments: [
        {
          name: "value",
          type: "number",
        },
        {
          name: "modulus",
          type: "number",
        },
      ],
      returnType: "number",
    },
    product: {
      processed: true,
      arguments: [
        {
          name: "values",
          type: "Iterable<number>",
        },
      ],
      returnType: "number",
    },
    sum: {
      processed: true,
      arguments: [
        {
          name: "values",
          type: "Iterable<number>",
        },
      ],
      returnType: "number",
    },
    toDegrees: {
      processed: true,
      arguments: [
        {
          name: "radians",
          type: "number",
        },
      ],
      returnType: "number",
    },
    toRadians: {
      processed: true,
      arguments: [
        {
          name: "degrees",
          type: "number",
        },
      ],
      returnType: "number",
    },
    triangularNumber: {
      processed: true,
      arguments: [
        {
          name: "n",
          type: "number",
        },
      ],
      returnType: "number",
    },
  },
  NamingHelper: {
    getBranchingLineName: {
      processed: true,
      arguments: [
        {
          name: "clueName",
          type: "string",
        },
        {
          name: "cellIds",
          type: "CellId[]",
        },
      ],
      returnType: "string",
    },
    getCageName: {
      processed: true,
      arguments: [
        {
          name: "clueName",
          type: "string",
        },
        {
          name: "cellIds",
          type: "CellId[]",
        },
      ],
      returnType: "string",
    },
    getCellName: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "string",
    },
    getCellsDescription: {
      processed: true,
      arguments: [
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "string",
    },
    getColumnName: {
      processed: true,
      arguments: [
        {
          name: "columnIndex",
          type: "number",
        },
      ],
      returnType: "string",
    },
    getDigitFilterDescription: {
      processed: true,
      arguments: [
        {
          name: "digits",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "string",
    },
    getDigitSetDescription: {
      processed: true,
      arguments: [
        {
          name: "digits",
          type: "DigitSetMask | SmallNumberSet",
        },
        {
          name: "conjunction",
          type: "string",
          optional: true,
        },
      ],
      returnType: "string",
    },
    getEdgeClueName: {
      processed: true,
      arguments: [
        {
          name: "clueName",
          type: "string",
        },
        {
          name: "edgeId",
          type: "EdgeId",
        },
      ],
      returnType: "string",
    },
    getEdgeClueNameFromDomino: {
      processed: true,
      arguments: [
        {
          name: "clueName",
          type: "string",
        },
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "string",
    },
    getLineName: {
      processed: true,
      arguments: [
        {
          name: "clueName",
          type: "string",
        },
        {
          name: "cellIds",
          type: "CellId[]",
        },
      ],
      returnType: "string",
    },
    getOuterClueName: {
      processed: true,
      arguments: [
        {
          name: "clueName",
          type: "string",
        },
        {
          name: "outerCellId",
          type: "OuterCellId",
        },
      ],
      returnType: "string | undefined",
    },
    getRowName: {
      processed: true,
      arguments: [
        {
          name: "rowIndex",
          type: "number",
        },
      ],
      returnType: "string",
    },
    getTupleName: {
      processed: true,
      arguments: [
        {
          name: "cellIds",
          type: "CellId[]",
        },
      ],
      returnType: "string",
    },
    getTupleNameBySize: {
      processed: true,
      arguments: [
        {
          name: "size",
          type: "number",
        },
      ],
      returnType: "string",
    },
  },
  OuterCellIdsHelper: {
    getAllAttributes: {
      processed: true,
      arguments: [
        {
          name: "outerCellId",
          type: "OuterCellId",
        },
      ],
      returnType: "{ x: number; y: number; side: OuterPosition }",
    },
    getCellCenterFromId: {
      processed: true,
      arguments: [
        {
          name: "outerCellId",
          type: "OuterCellId",
        },
      ],
      returnType: "Vector2Class",
    },
    getCoordsFromId: {
      processed: true,
      arguments: [
        {
          name: "outerCellId",
          type: "OuterCellId",
        },
      ],
      returnType: "Vector2Class",
    },
    getIdFromCoords: {
      processed: true,
      arguments: [
        {
          name: "coords",
          type: "Vector2",
        },
      ],
      returnType: "OuterCellId",
    },
    getSide: {
      processed: true,
      arguments: [
        {
          name: "outerCellId",
          type: "OuterCellId",
        },
      ],
      returnType: "OuterPosition",
    },
    getSideFromCoords: {
      processed: true,
      arguments: [
        {
          name: "coords",
          type: "Vector2",
        },
      ],
      returnType: "OuterPosition",
    },
    getX: {
      processed: true,
      arguments: [
        {
          name: "outerCellId",
          type: "OuterCellId",
        },
      ],
      returnType: "number",
    },
    getY: {
      processed: true,
      arguments: [
        {
          name: "outerCellId",
          type: "OuterCellId",
        },
      ],
      returnType: "number",
    },
  },
  PuzzleBase: {
    getCellAt: {
      processed: true,
      arguments: [
        {
          name: "x",
          type: "number",
        },
        {
          name: "y",
          type: "number",
        },
      ],
      returnType: "CellId | undefined",
    },
    getCellsCanHaveRepeats: {
      processed: true,
      arguments: [
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "boolean",
    },
    getCellsDiagonallyAdjacentToCell: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsDiagonallyAdjacentToCoords: {
      processed: true,
      arguments: [
        {
          name: "x",
          type: "number",
        },
        {
          name: "y",
          type: "number",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsOrthogonallyAdjacentToCell: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsOrthogonallyAdjacentToCoords: {
      processed: true,
      arguments: [
        {
          name: "x",
          type: "number",
        },
        {
          name: "y",
          type: "number",
        },
      ],
      returnType: "Generator<CellId, void, undefined>",
    },
    getCellsSeeEachOther: {
      processed: true,
      arguments: [
        {
          name: "cellIds",
          type: "Iterable<CellId>",
        },
      ],
      returnType: "boolean",
    },
    getCellsSeenByCell: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
        {
          name: "includeClones",
          type: "boolean",
          optional: true,
        },
      ],
      returnType: "Set<CellId>",
    },
    getColumn: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "number",
    },
    getFriendlyDigitsForCell: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "DigitSet",
    },
    getRegion: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "number",
    },
    getRegionAt: {
      processed: true,
      arguments: [
        {
          name: "x",
          type: "number",
        },
        {
          name: "y",
          type: "number",
        },
      ],
      returnType: "number",
    },
    getRegionCells: {
      processed: true,
      arguments: [
        {
          name: "regionId",
          type: "number",
        },
      ],
      returnType: "CellId[]",
    },
    getRegions: {
      processed: true,
      arguments: [],
      returnType: "CellId[][]",
    },
    getRow: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "number",
    },
    getX: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "number",
    },
    getY: {
      processed: true,
      arguments: [
        {
          name: "cellId",
          type: "CellId",
        },
      ],
      returnType: "number",
    },
    hasRegions: {
      processed: true,
      arguments: [],
      returnType: "boolean",
    },
    unsafeGetCellAt: {
      processed: true,
      arguments: [
        {
          name: "x",
          type: "number",
        },
        {
          name: "y",
          type: "number",
        },
      ],
      returnType: "CellId",
    },
  },
  SetUtils: {
    addAll: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set",
          type: "Set<T>",
        },
        {
          name: "values",
          type: "Iterable<T>",
        },
      ],
      returnType: "Set<T>",
    },
    deleteAll: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set",
          type: "Set<T>",
        },
        {
          name: "values",
          type: "Iterable<T>",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "Set<T>",
    },
    difference: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set",
          type: "Set<T>",
        },
        {
          name: "values",
          type: "Iterable<T>",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "Set<T>",
    },
    filter: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set",
          type: "Set<T>",
        },
        {
          name: "keep",
          type: "Set<T>",
        },
      ],
      returnType: "Set<T>",
    },
    hasAll: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set",
          type: "Set<T>",
        },
        {
          name: "values",
          type: "Iterable<T>",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "boolean",
    },
    hasSome: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set",
          type: "Set<T>",
        },
        {
          name: "values",
          type: "Iterable<T>",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "boolean",
    },
    hasSomeWhere: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set",
          type: "Iterable<T>",
        },
        {
          name: "predicate",
          type: "(item: T) => boolean",
        },
      ],
      returnType: "boolean",
    },
    intersection: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set1",
          type: "Set<T>",
        },
        {
          name: "set2",
          type: "Set<T>",
        },
      ],
      returnType: "Set<T>",
    },
    isEqual: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set1",
          type: "Set<T>",
        },
        {
          name: "set2",
          type: "Set<T>",
        },
        {
          name: "options",
          type: "{ comparator?: (a: T, b: T) => boolean }",
          optional: true,
        },
      ],
      returnType: "boolean",
    },
    symmetricDifference: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set1",
          type: "Iterable<T>",
        },
        {
          name: "set2",
          type: "Iterable<T>",
        },
      ],
      returnType: "Set<T>",
    },
    takeOne: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set",
          type: "Set<T>",
        },
      ],
      returnType: "T | undefined",
    },
    union: {
      processed: true,
      typeParams: ["T"],
      arguments: [
        {
          name: "set1",
          type: "Set<T>",
        },
        {
          name: "set2",
          type: "Iterable<T>",
        },
      ],
      returnType: "Set<T>",
    },
  },
  SmallNumberSet: {
    add: {
      processed: true,
      arguments: [
        {
          name: "value",
          type: "number",
        },
      ],
      returnType: "void",
    },
    clear: {
      processed: true,
      arguments: [],
      returnType: "void",
    },
    delete: {
      processed: true,
      arguments: [
        {
          name: "value",
          type: "number",
        },
      ],
      returnType: "void",
    },
    equals: {
      processed: true,
      arguments: [
        {
          name: "other",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "boolean",
    },
    getLargestNumber: {
      processed: true,
      arguments: [],
      returnType: "number | undefined",
    },
    getSmallestNumber: {
      processed: true,
      arguments: [],
      returnType: "number | undefined",
    },
    has: {
      processed: true,
      arguments: [
        {
          name: "value",
          type: "number",
        },
      ],
      returnType: "boolean",
    },
    intersect: {
      processed: true,
      arguments: [
        {
          name: "other",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "this",
    },
    intersects: {
      processed: true,
      arguments: [
        {
          name: "other",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "boolean",
    },
    isDisjointFrom: {
      processed: true,
      arguments: [
        {
          name: "other",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "boolean",
    },
    isSubsetOf: {
      processed: true,
      arguments: [
        {
          name: "other",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "boolean",
    },
    isSupersetOf: {
      processed: true,
      arguments: [
        {
          name: "other",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "boolean",
    },
    subtract: {
      processed: true,
      arguments: [
        {
          name: "other",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "this",
    },
    union: {
      processed: true,
      arguments: [
        {
          name: "other",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "this",
    },
    xor: {
      processed: true,
      arguments: [
        {
          name: "other",
          type: "DigitSetMask | SmallNumberSet",
        },
      ],
      returnType: "this",
    },
    from: {
      processed: true,
      typeParams: ["T extends SmallNumberSet"],
      arguments: [
        {
          name: "this",
          type: "new (...args: any[]) => T",
        },
        {
          name: "values",
          type: "Iterable<number>",
        },
      ],
      returnType: "T",
    },
    getIntersection: {
      processed: true,
      typeParams: ["T extends SmallNumberSet"],
      arguments: [
        {
          name: "this",
          type: "new (...args: any[]) => T",
        },
        {
          name: "sets",
          type: "Iterable<DigitSetMask | SmallNumberSet>",
        },
      ],
      returnType: "T",
    },
    getUnion: {
      processed: true,
      typeParams: ["T extends SmallNumberSet"],
      arguments: [
        {
          name: "this",
          type: "new (...args: any[]) => T",
        },
        {
          name: "sets",
          type: "Iterable<DigitSetMask | SmallNumberSet>",
        },
      ],
      returnType: "T",
    },
  },
  SumsHelper: {
    getCombinationsForSumWithoutRepeat: {
      processed: true,
      arguments: [
        {
          name: "sum",
          type: "number",
        },
        {
          name: "count",
          type: "number",
        },
      ],
      returnType: "Digit[][]",
    },
    getCombinationsForSumsWithoutRepeat: {
      processed: true,
      arguments: [
        {
          name: "sums",
          type: "Iterable<number>",
        },
        {
          name: "count",
          type: "number",
        },
      ],
      returnType: "Digit[][]",
    },
    getExtremeSumsWithRepeat: {
      processed: true,
      arguments: [
        {
          name: "candidates",
          type: "(DigitSetMask | SmallNumberSet)[]",
        },
        {
          name: "multipliers",
          type: "number[]",
          optional: true,
        },
      ],
      returnType: "{ minSum: number; maxSum: number }",
    },
    getExtremeSumsWithoutRepeat: {
      processed: true,
      arguments: [
        {
          name: "candidates",
          type: "(DigitSetMask | SmallNumberSet)[]",
        },
        {
          name: "multipliers",
          type: "number[]",
          optional: true,
        },
      ],
      returnType: "{ minSum: number; maxSum: number | null } | null",
    },
    getMaximumSumWithoutRepeat: {
      processed: true,
      arguments: [
        {
          name: "candidates",
          type: "(DigitSetMask | SmallNumberSet)[]",
        },
        {
          name: "multipliers",
          type: "number[]",
          optional: true,
        },
      ],
      returnType: "number | null",
    },
    getMinimumSumWithoutRepeat: {
      processed: true,
      arguments: [
        {
          name: "candidates",
          type: "(DigitSetMask | SmallNumberSet)[]",
        },
        {
          name: "multipliers",
          type: "number[]",
          optional: true,
        },
      ],
      returnType: "number | null",
    },
  },
  Vector2Funcs: {
    compareVectors: {
      processed: true,
      arguments: [
        {
          name: "vector1",
          type: "Vector2",
        },
        {
          name: "vector2",
          type: "Vector2",
        },
      ],
      returnType: "number",
    },
    difference: {
      processed: true,
      arguments: [
        {
          name: "vector1",
          type: "Vector2",
        },
        {
          name: "vector2",
          type: "Vector2",
        },
      ],
      returnType: "Vector2",
    },
    getAngle: {
      processed: true,
      arguments: [
        {
          name: "vector1",
          type: "Vector2",
        },
        {
          name: "vector2",
          type: "Vector2",
        },
      ],
      returnType: "number",
    },
    getAverage: {
      processed: true,
      arguments: [
        {
          name: "vectors",
          type: "Iterable<Vector2>",
        },
      ],
      returnType: "Vector2",
    },
    getClamped: {
      processed: true,
      arguments: [
        {
          name: "vector",
          type: "Vector2",
        },
        {
          name: "rect",
          type: "{ x: number; y: number; width: number; height: number }",
        },
      ],
      returnType: "Vector2",
    },
    getDistance: {
      processed: true,
      arguments: [
        {
          name: "vector1",
          type: "Vector2",
        },
        {
          name: "vector2",
          type: "Vector2",
        },
      ],
      returnType: "number",
    },
    getDotProduct: {
      processed: true,
      arguments: [
        {
          name: "vector1",
          type: "Vector2",
        },
        {
          name: "vector2",
          type: "Vector2",
        },
      ],
      returnType: "number",
    },
    getMagnitude: {
      processed: true,
      arguments: [
        {
          name: "vector",
          type: "Vector2",
        },
      ],
      returnType: "number",
    },
    getManhattanDistance: {
      processed: true,
      arguments: [
        {
          name: "vector1",
          type: "Vector2",
        },
        {
          name: "vector2",
          type: "Vector2",
        },
      ],
      returnType: "number",
    },
    getRotated: {
      processed: true,
      arguments: [
        {
          name: "vector",
          type: "Vector2",
        },
        {
          name: "angle",
          type: "number",
        },
      ],
      returnType: "Vector2",
    },
    isVectorGreaterThan: {
      processed: true,
      arguments: [
        {
          name: "vector1",
          type: "Vector2",
        },
        {
          name: "vector2",
          type: "Vector2",
        },
      ],
      returnType: "boolean",
    },
    normalized: {
      processed: true,
      arguments: [
        {
          name: "vector",
          type: "Vector2",
        },
      ],
      returnType: "Vector2",
    },
    scaled: {
      processed: true,
      arguments: [
        {
          name: "vector",
          type: "Vector2",
        },
        {
          name: "factor",
          type: "number",
        },
      ],
      returnType: "Vector2",
    },
    scaledSum: {
      processed: true,
      arguments: [
        {
          name: "vector1",
          type: "Vector2",
        },
        {
          name: "vector2",
          type: "Vector2",
        },
        {
          name: "factor",
          type: "number",
        },
      ],
      returnType: "Vector2",
    },
    sum: {
      processed: true,
      arguments: [
        {
          name: "vector1",
          type: "Vector2",
        },
        {
          name: "vector2",
          type: "Vector2",
        },
      ],
      returnType: "Vector2",
    },
  },
  XSumsHelper: {
    getXSumPossibilities: {
      processed: true,
      arguments: [
        {
          name: "sum",
          type: "number",
        },
      ],
      returnType: "Generator<{ x: Digit; combinations: DigitSetMask[] }, void, undefined>",
    },
  },
};
