import { z } from "zod";

/*
  AI comment about critical documentation investment areas:
  =========================================================

  Critical Ambiguities

  1. CornerId, EdgeId, OuterCellId (lines 68-79) - These have empty descriptions. I can't understand what these represent or how they map to the grid coordinate system.
  2. DiagonalType naming (lines 85-89) - The comment mentions the names don't align with the actual coordinate system and were named for "historical reasons." This could cause confusion when users
  refer to diagonals.
  3. Cell ID calculation (lines 63-67) - While the formula is given (row * width + column), the example calculation seems off: "cell in row 2 column 3 of a 6x6 puzzle would be 8 (1 * 6 + 2 = 8)" -
  this suggests 1-based rows but 0-based columns, which is inconsistent.
  4. Candidates/Corner marks bitmap (lines 950-954) - The example shows digits 0, 3, 4 for number 25, but sudoku typically uses digits 1-9. Are these 0-based digit indices?
  5. Color palette mapping (lines 955-959) - The long description of color indices is complex and the logic for choosing between main/secondary palettes when colors exist in both is unclear.

  Missing Context

  6. Custom constraint structure (lines 9-39) - The relationship between CustomConstraintInput, CustomConstraintBackend, and CustomConstraintComponent is unclear. How do these pieces work together?
  7. Regions array (line 326) - What do the numbers in the regions array represent? Cell IDs? Region IDs?
  8. Global entropy groups (line 384) - What do these group numbers represent?
  9. Arrow bulb indexing (line 131) - "index 0 is 1s, index 1 is 10s, etc" - this seems to refer to digit place values but isn't clearly explained.
  10. Fog clearing patterns (lines 709-751) - The relationship between patterns, overrides, triggers, and effects in custom fog clearing is complex and underdocumented.

  Minor Clarifications Needed

  11. Rectangle coordinates (lines 41-50) - Uses center point coordinates, which differs from typical top-left coordinate systems.
  12. SudokuLayer enum (lines 204-213) - The layer ordering and when each layer is used isn't clear.
  13. Export settings (lines 1042-1062) - The SudokuPad export settings structure seems incomplete (TODO comment on line 1050).

  These are the areas where additional documentation would be most valuable for understanding how to properly construct and manipulate puzzle objects.
 */

export const RawInput = z
  .object({
    type: z.literal("raw").describe(""),
  })
  .describe("");

export const CustomConstraintInput = z
  .object({
    id: z.string().describe(""),
    label: z.string().describe(""),
    params: RawInput,
  })
  .describe("");

export const CustomConstraintBackend = z
  .object({
    type: z.literal("code").describe(""),
    code: z.string().describe(""),
  })
  .describe("");

export const CustomConstraintComponent = z
  .object({
    type: z.literal("code").describe(""),
    name: z.string().describe(""),
    code: z.string().describe(""),
  })
  .describe("");

export const CustomConstraintDefinition = z
  .object({
    name: z.string().describe(""),
    input: z.array(CustomConstraintInput).describe(""),
    backend: CustomConstraintBackend,
    components: z.array(CustomConstraintComponent).describe(""),
  })
  .describe("");

export const Rectangle = z
  .object({
    x: z.number().describe("Horizontal coordinate of rectangle's center point"),
    y: z.number().describe("Vertical coordinate of rectangle's center point"),
    width: z.number().describe("Rectangle width"),
    height: z.number().describe("Rectangle height"),
  })
  .describe(
    "Coordinates of one rectangle in the grid. The coordinate system starts in the top left corner of the grid and go right and down from there. Each grid cell is 1x1, so the cell size is the unit of the coordinate system.",
  );

export const IVector2 = z
  .object({
    x: z.number().describe("Horizontal coordinate"),
    y: z.number().describe("Vertical coordinate"),
  })
  .meta({
    id: "IVector2",
    description:
      "Coordinates of one point in the grid. The coordinate system starts in the top left corner of the grid and go right and down from there. Each grid cell is 1x1, so the cell size is the unit of the coordinate system.",
  });

export const CellId = z.number().brand("CellId").meta({
  id: "CellId",
  description:
    "Unique numeric identification of a grid cell. It corresponds to the zero-based cell index in the flat cells array, starting from the top left cell, and going in the reading order (left to right, top to bottom). So, the top left cell ID is 0, and cell in row 2 column 3 of a 6x6 puzzle would be 8 (row index 1 multiplied by columns number 6, plus column index 2: 1 * 6 + 2 = 8).",
});
export const CornerId = z.number().brand("CornerId").meta({
  id: "CornerId",
  description: "",
});
export const EdgeId = z.number().brand("EdgeId").meta({
  id: "EdgeId",
  description: "",
});
export const OuterCellId = z.number().brand("OuterCellId").meta({
  id: "OuterCellId",
  description: "",
});

export enum DiagonalTypeNative {
  PositiveDiagonal = 1,
  NegativeDiagonal = -1,
}
export const DiagonalType = z.enum(DiagonalTypeNative).meta({
  id: "DiagonalType",
  description:
    "Diagonal type. Positive diagonal is between bottom left and top right. Negative diagonal is between top left and bottom right. Note that the names don't align with the actual coordinate system of the grid (which starts at top left) - it was named like that for historical reasons. Users will refer to diagonals the way they are named here.",
});

export const Stroke = z
  .object({
    color: z.string().describe(""),
    thickness: z.number().describe(""),
  })
  .describe("");

export const EdgeClue = <ValueT extends z.ZodSchema = z.ZodString>(
  ValueType: ValueT = z.string().describe("") as unknown as ValueT,
) =>
  z
    .object({
      value: ValueType,
      edge: EdgeId,
    })
    .describe("");

export const OuterClue = <ValueT extends z.ZodSchema = z.ZodString>(
  ValueType: ValueT = z.string().describe("") as unknown as ValueT,
) =>
  z
    .object({
      value: ValueType.describe(""),
      outerCell: OuterCellId.describe(""),
      diagonal: DiagonalType.optional(),
    })
    .describe("");

export const Cage = <ValueT extends z.ZodSchema = z.ZodString>(
  ValueType: ValueT = z.string().describe("") as unknown as ValueT,
) =>
  z
    .object({
      value: ValueType,
      cells: z.array(CellId).describe(""),
    })
    .describe("");

export const BulbWithArrows = z
  .object({
    bulbCells: z.array(CellId).describe(""), // Important: index 0 is 1s, index 1 is 10s, etc
    arrows: z.array(z.array(CellId)).describe(""),
  })
  .describe("");

export const CageStyle = z
  .object({
    cage: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
    text: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const ArrowStyle = z
  .object({
    color: z.string().describe(""),
    thickness: z.number().describe(""),
    headSize: z.number().describe(""),
  })
  .describe("");

export const BasicShapeStyle = z
  .object({
    size: z.number().describe(""),
    fill: z.string().describe(""),
    stroke: Stroke,
  })
  .describe("");

export const LineStyle = z
  .object({
    color: z.string().describe(""),
    thickness: z.number().describe(""),
  })
  .meta({
    id: "LineStyle",
    description: "",
  });

export const LineWithEndPointsStyle = z
  .object({
    lines: LineStyle,
    endPoints: BasicShapeStyle,
  })
  .meta({
    id: "LineWithEndPointsStyle",
    description: "",
  });

export const OuterClueStyle = z
  .object({
    color: z.string().describe(""),
  })
  .meta({
    id: "OuterClueStyle",
    description: "",
  });

export const ThermometerStyle = z
  .object({
    color: z.string().describe(""),
    thickness: z.number().describe(""),
    bulbRadius: z.number().describe(""),
  })
  .describe("");

export enum SudokuLayerNative {
  Background = "background",
  Default = "default",
  Foreground = "foreground",
  Grid = "grid",
}
export const SudokuLayer = z.enum(SudokuLayerNative).meta({
  id: "SudokuLayer",
  description: "",
});

export const CosmeticLineStyle = z
  .intersection(
    LineStyle,
    z.object({
      layer: SudokuLayer.optional(), // Undefined means it's automatic - "on top" if edges are overlaying edges of the grid.
    }),
  )
  .describe("");

export enum ConstraintType {
  // Sudoku basics
  Givens = 0,
  Regions,

  // Unplaceables
  DiagonalMinus = 10,
  DiagonalPlus,
  Antiking, // Starting at 10 just in case it's ever decided to make even more sudoku basics toggleable
  Antiknight,
  DisjointGroups,
  Nonconsecutive,
  GlobalEntropy,

  // Placeable single-cell constraints
  Even = 100,
  Odd,
  Maximum,
  Minimum,

  // Placeable cell-pair constraints
  Difference = 200,
  Ratio,
  XV,

  // Simple placeable constraints
  Thermometer = 300,
  KillerCages,
  Clone,
  Quadruple,
  LookAndSayCages,
  DifferentValues,

  // Lines
  Renban = 400,
  Whisper,
  Palindrome,
  BetweenLines,
  RegionSumLine,
  Sequence,
  EntropyLines,
  LockoutLines,
  Arrow,
  DoubleArrow,

  // Outside of grid clued constraints
  LittleKillers = 500,
  SandwichSums,
  XSums,
  Skyscrapers,
  NumberedRooms,

  // Other constraints
  RowIndexer = 600,
  ColumnIndexer,

  // Custom
  Custom = 1000,

  // Cosmetics
  CosmeticLine = 2000,
  CosmeticCage = 2001,
  CosmeticSymbol = 2002,

  // Complex placeable constraints
  SudokuRules,

  // Misc
  FogLights = 4000,
  FogTriggers,
}

export const LineConstraintConfigBase = z
  .object({
    lines: z.array(z.array(CellId)).describe(""),
    style: LineStyle,
  })
  .meta({
    id: "LineConstraintConfigBase",
    description: "",
  });

export const LineWithEndPointsConfigBase = z
  .object({
    lines: z.array(z.array(CellId)).describe(""),
    style: LineWithEndPointsStyle,
  })
  .meta({
    id: "LineWithEndPointsConfigBase",
    description: "",
  });

// Constraint configs start here
export const GivensConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Givens).describe("Givens"),
  })
  .describe("");

export const RegionsConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Regions).describe("Regions"),
    regions: z.array(z.number()).describe(""),
  })
  .describe("");

export const DifferentValuesConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.DifferentValues).describe("DifferentValues"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
        offset: z.number().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const DiagonalPlusConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.DiagonalPlus).describe("DiagonalPlus"),
    style: LineStyle,
  })
  .describe("");

export const DiagonalMinusConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.DiagonalMinus).describe("DiagonalMinus"),
    style: LineStyle,
  })
  .describe("");

export const AntiknightConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Antiknight).describe("Antiknight"),
  })
  .describe("");

export const AntikingConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Antiking).describe("Antiking"),
  })
  .describe("");

export const DisjointGroupsConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.DisjointGroups).describe("DisjointGroups"),
  })
  .describe("");

export const NonconsecutiveConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Nonconsecutive).describe("Nonconsecutive"),
  })
  .describe("");

export const GlobalEntropyConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.GlobalEntropy).describe("GlobalEntropy"),
    groups: z.array(z.number()).describe(""),
  })
  .describe("");

export const KillerCagesConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.KillerCages).describe("KillerCages"),
    cages: z.array(Cage(z.number().describe(""))).describe(""),
    style: CageStyle,
  })
  .describe("");

export const LookAndSayCagesConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.LookAndSayCages).describe("LookAndSayCages"),
    cages: z.array(Cage()).describe(""),
    style: CageStyle,
  })
  .describe("");

export const LittleKiller = z
  .object({
    value: z.number().optional().describe(""),
    outerCell: OuterCellId,
    diagonal: DiagonalType,
  })
  .describe("");

export const LittleKillersConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.LittleKillers).describe("LittleKillers"),
    clues: z.array(LittleKiller).describe(""),
    style: z
      .object({
        text: z
          .object({
            color: z.string().describe(""),
          })
          .describe(""),
        arrow: z
          .object({
            color: z.string().describe(""),
          })
          .describe(""),
      })
      .describe(""),
  })
  .describe("");

export const RatioConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Ratio).describe("Ratio"),
    clues: z.array(EdgeClue(z.number().describe(""))).describe(""),
    negative: z.array(z.number()).describe(""),
    overrideNegativeDifferences: z.boolean().describe(""),
  })
  .describe("");

export const XVConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.XV).describe("XV"),
    clues: z.array(EdgeClue(z.number().describe(""))).describe(""),
    negative: z.array(z.number()).describe(""),
  })
  .describe("");

export const ThermometerConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Thermometer).describe("Thermometer"),
    thermometers: z.array(z.array(CellId)).describe(""),
    slow: z.boolean().describe(""),
    style: ThermometerStyle,
  })
  .describe("");

export const RenbanConstraintConfig = z
  .intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.Renban).describe("Renban"),
    }),
  )
  .describe("");

export const DifferenceConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Difference).describe("Difference"),
    clues: z.array(EdgeClue(z.number().describe(""))).describe(""),
    negative: z.array(z.number()).describe(""),
    overrideNegativeRatios: z.boolean().describe(""),
  })
  .describe("");

export const WhisperConstraintConfig = z
  .intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.Whisper).describe("Whisper"),
      minDifference: z.number().describe(""),
    }),
  )
  .describe("");

export const PalindromeConstraintConfig = z
  .intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.Palindrome).describe("Palindrome"),
    }),
  )
  .describe("");

export const OddConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Odd).describe("Odd"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
        size: z.number().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const EvenConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Even).describe("Even"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
        size: z.number().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const CloneConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Clone).describe("Clone"),
    groups: z.array(z.array(CellId)).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const MaximumConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Maximum).describe("Maximum"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const MinimumConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Minimum).describe("Minimum"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const SandwichSumsConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.SandwichSums).describe("SandwichSums"),
    clues: z.array(OuterClue(z.number().describe(""))).describe(""),
    style: OuterClueStyle,
  })
  .describe("");

export const XSumsConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.XSums).describe("XSums"),
    clues: z.array(OuterClue(z.number().optional())).describe(""),
    style: OuterClueStyle,
  })
  .describe("");

export const SkyscrapersConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Skyscrapers).describe("Skyscrapers"),
    clues: z.array(OuterClue(z.number().optional())).describe(""),
    style: OuterClueStyle,
  })
  .describe("");

export const NumberedRoomsConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.NumberedRooms).describe("NumberedRooms"),
    clues: z.array(OuterClue(z.number().optional())).describe(""),
    style: OuterClueStyle,
  })
  .describe("");

export const RegionSumLineConstraintConfig = z
  .intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.RegionSumLine).describe("RegionSumLine"),
      singleRegionTotals: z.boolean().describe(""),
    }),
  )
  .describe("");

export const SequenceConstraintConfig = z
  .intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.Sequence).describe("Sequence"),
    }),
  )
  .describe("");

export const EntropyLinesConstraintConfig = z
  .intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.EntropyLines).describe("EntropyLines"),
      groups: z.array(z.number()).describe(""),
    }),
  )
  .describe("");

export const LockoutLinesConstraintConfig = z
  .intersection(
    LineWithEndPointsConfigBase,
    z.object({
      type: z.literal(ConstraintType.LockoutLines).describe("LockoutLines"),
    }),
  )
  .describe("");

export const ArrowConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Arrow).describe("Arrow"),
    bulbsWithArrows: z.array(BulbWithArrows).describe(""),
    style: z
      .object({
        arrow: ArrowStyle,
        bulb: BasicShapeStyle,
      })
      .describe(""),
  })
  .describe("");

export const DoubleArrowConstraintConfig = z
  .intersection(
    LineWithEndPointsConfigBase,
    z.object({
      type: z.literal(ConstraintType.DoubleArrow).describe("DoubleArrow"),
    }),
  )
  .describe("");

export const QuadrupleClue = z
  .object({
    corner: CornerId,
    digits: z.array(z.number()).describe(""),
  })
  .describe("");

export const QuadrupleConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Quadruple).describe("Quadruple"),
    clues: z.array(QuadrupleClue).describe(""),
    style: z
      .object({
        singleLine: z.boolean().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const RowIndexerConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.RowIndexer).describe("RowIndexer"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const ColumnIndexerConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.ColumnIndexer).describe("ColumnIndexer"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  })
  .describe("");

export const BetweenLinesConstraintConfig = z
  .intersection(
    LineWithEndPointsConfigBase,
    z.object({
      type: z.literal(ConstraintType.BetweenLines).describe("BetweenLines"),
    }),
  )
  .describe("");

export const FogLightsConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.FogLights).describe("FogLights"),
    lightCells: z.array(CellId).describe(""),
  })
  .describe("");

export enum CustomFogClearingPatternNative {
  self,
  orthogonalNeighbors,
  diagonalNeighbors,
  knightsMove,
  row,
  column,
}
export const CustomFogClearingPattern = z
  .enum(CustomFogClearingPatternNative)
  .describe("");

export const FogTriggersConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.FogTriggers).describe("FogTriggers"),
    patterns: z.array(CustomFogClearingPattern).optional().describe(""),
    overrides: z.array(CellId).optional().describe(""),
    triggers: z
      .array(
        z.object({
          label: z.string().describe(""),
          cells: z.array(CellId).describe(""),
        }),
      )
      .describe("")
      .optional(),
    effects: z
      .array(
        z.object({
          label: z.string().describe(""),
          cells: z.array(CellId).describe(""),
        }),
      )
      .describe("")
      .optional(),
    editor: z
      .object({ defaultDisabling: z.boolean().optional().describe("") })
      .describe("")
      .optional(),
  })
  .describe("");

export const UserDefined = z.any().describe("");

export const CustomConstraintConfigInput = z.record(
  z.string().describe(""),
  UserDefined,
);
export const CustomConstraintConfigStyle = z.record(
  z.string().describe(""),
  UserDefined,
);

export const CustomConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.Custom).describe("Custom"),
    definition: CustomConstraintDefinition,
    input: CustomConstraintConfigInput,
    style: CustomConstraintConfigStyle,
  })
  .describe("");

export const CosmeticLineConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.CosmeticLine).describe("CosmeticLine"),
    lines: z.array(z.array(IVector2)).describe(""),
    style: CosmeticLineStyle,
  })
  .describe("");

export enum SymbolType {
  Rectangle = "rectangle",
  Ellipse = "ellipse",
  Text = "text",
  Arrow = "arrow",
}

export const SymbolCommonParams = z
  .object({
    angle: z.number().describe(""),
    fill: z.string().describe(""),
    stroke: z.string().describe(""),
    strokeWidth: z.number().describe(""),
  })
  .meta({
    id: "SymbolCommonParams",
    description: "",
  });

export const RectangleSymbolParams = z
  .intersection(
    SymbolCommonParams,
    z.object({
      type: z.literal(SymbolType.Rectangle).describe("Rectangle"),
      width: z.number().describe(""),
      height: z.number().describe(""),
      fill: z.string().describe(""),
    }),
  )
  .describe("");

export const EllipseSymbolParams = z
  .intersection(
    SymbolCommonParams,
    z.object({
      type: z.literal(SymbolType.Ellipse).describe("Ellipse"),
      rx: z.number().describe(""),
      ry: z.number().describe(""),
    }),
  )
  .describe("");

export const TextSymbolParams = z
  .intersection(
    SymbolCommonParams,
    z.object({
      type: z.literal(SymbolType.Text).describe("Text"),
      text: z.string().describe(""),
      size: z.number().describe(""),
    }),
  )
  .describe("");

export const ArrowSymbolParams = z
  .intersection(
    SymbolCommonParams,
    z.object({
      type: z.literal(SymbolType.Arrow).describe("Arrow"),
      length: z.number().describe(""),
      headSize: z.number().describe(""),
    }),
  )
  .describe("");

export const SymbolParams = z
  .union([
    RectangleSymbolParams,
    EllipseSymbolParams,
    TextSymbolParams,
    ArrowSymbolParams,
  ])
  .describe("");

export const CosmeticSymbol = z
  .object({
    position: IVector2,
    layer: SudokuLayer,
    params: SymbolParams,
  })
  .describe("");

export const CosmeticSymbolConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.CosmeticSymbol).describe("CosmeticSymbol"),
    symbols: z.array(CosmeticSymbol).describe(""),
  })
  .describe("");

export const CosmeticCageConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.CosmeticCage).describe("CosmeticCage"),
    cages: z.array(Cage()).describe(""),
    style: CageStyle,
  })
  .describe("");

export const SudokuRulesConstraintConfig = z
  .object({
    type: z.literal(ConstraintType.SudokuRules).describe("SudokuRules"),
    areas: z.array(Rectangle).optional().describe(""),
  })
  .describe("");

export const ConstraintConfigMap = {
  [ConstraintType.Antiking]: AntikingConstraintConfig,
  [ConstraintType.Antiknight]: AntiknightConstraintConfig,
  [ConstraintType.Arrow]: ArrowConstraintConfig,
  [ConstraintType.BetweenLines]: BetweenLinesConstraintConfig,
  [ConstraintType.Clone]: CloneConstraintConfig,
  [ConstraintType.ColumnIndexer]: ColumnIndexerConstraintConfig,
  [ConstraintType.CosmeticCage]: CosmeticCageConstraintConfig,
  [ConstraintType.CosmeticSymbol]: CosmeticSymbolConstraintConfig,
  [ConstraintType.CosmeticLine]: CosmeticLineConstraintConfig,
  [ConstraintType.Custom]: CustomConstraintConfig,
  [ConstraintType.DiagonalMinus]: DiagonalMinusConstraintConfig,
  [ConstraintType.DiagonalPlus]: DiagonalPlusConstraintConfig,
  [ConstraintType.Difference]: DifferenceConstraintConfig,
  [ConstraintType.DisjointGroups]: DisjointGroupsConstraintConfig,
  [ConstraintType.DoubleArrow]: DoubleArrowConstraintConfig,
  [ConstraintType.EntropyLines]: EntropyLinesConstraintConfig,
  [ConstraintType.Even]: EvenConstraintConfig,
  [ConstraintType.DifferentValues]: DifferentValuesConstraintConfig,
  [ConstraintType.Givens]: GivensConstraintConfig,
  [ConstraintType.GlobalEntropy]: GlobalEntropyConstraintConfig,
  [ConstraintType.KillerCages]: KillerCagesConstraintConfig,
  [ConstraintType.LittleKillers]: LittleKillersConstraintConfig,
  [ConstraintType.LockoutLines]: LockoutLinesConstraintConfig,
  [ConstraintType.LookAndSayCages]: LookAndSayCagesConstraintConfig,
  [ConstraintType.Maximum]: MaximumConstraintConfig,
  [ConstraintType.Minimum]: MinimumConstraintConfig,
  [ConstraintType.Nonconsecutive]: NonconsecutiveConstraintConfig,
  [ConstraintType.NumberedRooms]: NumberedRoomsConstraintConfig,
  [ConstraintType.Odd]: OddConstraintConfig,
  [ConstraintType.Palindrome]: PalindromeConstraintConfig,
  [ConstraintType.Quadruple]: QuadrupleConstraintConfig,
  [ConstraintType.Ratio]: RatioConstraintConfig,
  [ConstraintType.RegionSumLine]: RegionSumLineConstraintConfig,
  [ConstraintType.Regions]: RegionsConstraintConfig,
  [ConstraintType.Renban]: RenbanConstraintConfig,
  [ConstraintType.RowIndexer]: RowIndexerConstraintConfig,
  [ConstraintType.SandwichSums]: SandwichSumsConstraintConfig,
  [ConstraintType.Sequence]: SequenceConstraintConfig,
  [ConstraintType.Skyscrapers]: SkyscrapersConstraintConfig,
  [ConstraintType.SudokuRules]: SudokuRulesConstraintConfig,
  [ConstraintType.Thermometer]: ThermometerConstraintConfig,
  [ConstraintType.Whisper]: WhisperConstraintConfig,
  [ConstraintType.XSums]: XSumsConstraintConfig,
  [ConstraintType.XV]: XVConstraintConfig,
  [ConstraintType.FogLights]: FogLightsConstraintConfig,
  [ConstraintType.FogTriggers]: FogTriggersConstraintConfig,
};

export const ConstraintConfig = z
  .union(Object.values(ConstraintConfigMap))
  .meta({
    id: "ConstraintConfig",
    description: "Constraint configuration",
  });

export enum PuzzleTypeNative {
  Sudoku = "sudoku", // Each row, column and region (if applicable) must be of size <number of digits> and filled with all digits
  Custom = "custom", // Anything goes
}
export const PuzzleType = z.enum(PuzzleTypeNative).meta({
  id: "PuzzleType",
  description:
    "Puzzle type: sudoku or custom. Having a puzzle of type \"sudoku\" means having implicit SudokuRules constraint that enforces unique digits in every row and column, but otherwise it's the same (it's not really sudoku, just a latin square, since sudoku regions (boxes) are still controlled by a separate constraint).",
});

export const CandidatesFlags = z.number().brand("CandidatesFlags").meta({
  id: "CandidatesFlags",
  description:
    "Integer number that uniquely represents a set of digits (usually used for cell candidates or corner marks). It's a bitmap, each bit of it means that the relevant digit is present in the set. For instance, number 25 means a set of digits 0, 3 and 4 because it binary representation is 11001 - positions with zero-based index 0, 3 and 4 have bits there.",
});
export const ColorsFlags = z.number().brand("ColorsFlags").meta({
  id: "ColorsFlags",
  description:
    "Integer number that uniquely represents a set of cell background colors. It's a bitmap, each bit of it means that the relevant color is present in the set. For instance, number 6 means a set of color 1 and color 2 in the palette because it binary representation is 110 - positions with zero-based index 1 and 2 have bits there. The default palette is: 0 - white, 1 - red, 2 - orange, 3 - yellow, 4 - light green, 5 - green, 6 - light blue, 7 - blue, 8 - purple, 9 - magenta, 10 - light grey, 11 - dark grey, 12 - black (or very dark grey), 13 - bright pink / fuchsia, 14 - brown, 15 - lime green, 16 - teal/cyan, 17 - royal blue, 18 - violet. Colors 1 - 9 are on the main palette, colors 10-18 are not the secondary palette, white is on both palettes. So if the puzzle doesn't contain any color from palette 2 yet and the user names a color shade that has analogues on both palettes, then the user is likely referencing the color of the main palette. Remember, naming colors is subjective, so please be smart when determining which color the user refers to.",
});

export const Cell = z
  .object({
    given: z.boolean().describe(""),
    value: z.number().optional().describe(""),
    candidates: CandidatesFlags.describe(""),
    cornerPencilMarks: CandidatesFlags.describe(""),
    colors: ColorsFlags.describe(""),
    valid: z.boolean().describe(""),
    id: CellId.describe("").readonly(),
    x: z.number().describe("").readonly(),
    y: z.number().describe("").readonly(),
  })
  .describe("");

export const Constraint = z
  .object({
    id: z
      .number()
      .optional()
      .describe("Constraint ID, must be unique within the puzzle"),
    name: z
      .string()
      .optional()
      .describe(
        "Constraint name. Leave it empty to use the default (recommended when there is only one constraint group of the type).",
      ),
    enabled: z
      .boolean()
      .describe(
        "Is the constraint enabled? Disabling a constraint will hide its visual clues from the grid and exclude its logic from the solver, which is the same as if the constraint doesn't exist. Useful to temporarily exclude the constraint from the puzzle without deleting it from the list.",
      ),
    solverIgnored: z
      .boolean()
      .describe(
        "Ignore the constraint's logic in the solver while still showing the visuals in the grid. Use it to make constraint cosmetic-only, or if you want to temporarily ignore its logic.",
      ),
    config: ConstraintConfig,
  })
  .describe("");

export const Spec = z
  .object({
    type: PuzzleType.describe(""),
    minDigit: z.number().describe(""),
    maxDigit: z.number().describe(""),
    digitCount: z.number().readonly().describe(""),
    size: z
      .object({
        width: z.number().describe(""),
        height: z.number().describe(""),
      })
      .describe(""),
  })
  .meta({
    id: "Spec",
    description:
      "Puzzle specification - essential information about puzzle type and dimensions",
  });

export const Puzzle = z
  .object({
    allConstraints: z
      .array(Constraint)
      .describe(
        "The list of all elements (aka constraints, clues) of the puzzle",
      ),
    author: z.string().describe("Puzzle author (aka setter)"),
    cells: z
      .array(Cell)
      .describe(
        "The list of all puzzle cells in the reading order (left to right, top to bottom)",
      ),
    comment: z
      .string()
      .describe(
        "Puzzle comment provided by the setter. Usually it just describes the rules of the puzzle, but there's no limitation",
      ),
    creationTimestamp: z
      .number()
      .readonly()
      .describe("Timestamp of when the puzzle was created, in milliseconds"),
    exportSettings: z
      .object({
        sudokuPad: z
          .object({
            showColorMarks: z.boolean().describe(""),
            showDigits: z.boolean().describe(""),
            solution: z
              .object({
                // TODO: it's usually "grid", what else could be here?
                type: z.string().describe(""),
              })
              .describe(""),
            useIncompleteGridAsSolution: z.boolean().describe(""),
          })
          .describe(
            "Settings that control how the puzzle will be exported from Sudoku Maker to SudokuPad",
          ),
      })
      .describe(
        "Settings that control how the puzzle will be exported from Sudoku Maker to other platforms",
      ),
    id: z
      .number()
      .readonly()
      .describe(
        "Puzzle ID. Every new puzzle gets a new unique ID, but then the ID is preserved when reloading the puzzle or duplicating a browser tab with a puzzle",
      ),
    messages: z.object({
      completion: z
        .string()
        .optional()
        .describe(
          "Message that will be displayed to the solver after completing the puzzle successfully",
        ),
    }),
    name: z.string().describe("Puzzle name"),
    spec: Spec,
  })
  .describe("");
