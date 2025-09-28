import {
  CellId,
  CornerId,
  DiagonalType,
  EdgeId,
  IVector2,
  OuterCellId,
  CellsRectangle,
  Spec,
  SudokuLayer,
} from "./SudokuMakerSchemas";
import { z } from "zod";

// region Core
export class SudokuMakerConstraint<
  TypeT extends ConstraintType,
  ConfigT extends { type: TypeT },
  ConfigSchemaT extends z.ZodType<ConfigT>,
  ParamsSchemaT extends z.ZodObject,
> {
  public readonly type: TypeT;
  public readonly schema: ConfigSchemaT;
  public readonly main: SudokuMakerConstraintOption<ConfigT, ParamsSchemaT>;
  public readonly options: SudokuMakerConstraintOption<ConfigT>[];

  constructor({
    type,
    schema,
    main,
    options = [],
  }: {
    type: TypeT;
    schema: ConfigSchemaT;
    /*
     * Note: z.infer<ConfigSchemaT> essentially equals to ConfigT,
     * but can't use ConfigT directly
     * because then typescript will use wrong parameters to infer types.
     */
    main: SudokuMakerConstraintOption<z.infer<ConfigSchemaT>, ParamsSchemaT>;
    options?: SudokuMakerConstraintOption<z.infer<ConfigSchemaT>>[];
  }) {
    this.type = type;
    this.schema = schema;
    this.main = main as unknown as SudokuMakerConstraintOption<
      ConfigT,
      ParamsSchemaT
    >;
    this.options = options as unknown as SudokuMakerConstraintOption<ConfigT>[];
  }
}

export interface SudokuMakerConstraintOption<
  ConfigT extends { type: ConstraintType },
  ParamsSchemaT extends z.ZodObject = z.ZodObject<{}>,
> {
  title: string;
  getTitle?: ConfigGetter<ConfigT, string>;
  description: string;
  getDescription?: SpecGetter<string>;
  paramsSchema?: ParamsSchemaT;
  defaultConfig: ConfigT | SpecGetter<ConfigT, [z.infer<ParamsSchemaT>]>;
  detect?: ConfigGetter<ConfigT, boolean>;
}

type SpecGetter<ResultT, ArgsT extends any[] = []> = (
  spec: z.infer<typeof Spec>,
  ...args: ArgsT
) => ResultT;

type ConfigGetter<ConfigT extends { type: ConstraintType }, ResultT> = (
  config: ConfigT,
  spec: z.infer<typeof Spec>,
) => ResultT;
// endregion

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

// region Commons
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
  .meta({
    id: "CageStyle",
    description: "",
  });

export const Stroke = z
  .object({
    color: z.string().describe(""),
    thickness: z.number().describe(""),
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
// endregion

// region Single-option constraints
export const SudokuRulesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.SudokuRules,
  schema: z.object({
    type: z.literal(ConstraintType.SudokuRules).describe("SudokuRules"),
    areas: z.array(CellsRectangle).optional().describe(""),
  }),
  main: {
    title: "Rows and columns",
    description: "All rows and columns must contain different digits.",
    defaultConfig: {
      type: ConstraintType.SudokuRules,
    },
  },
});

export const GivensConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Givens,
  schema: z.object({
    type: z.literal(ConstraintType.Givens).describe("Givens"),
  }),
  main: {
    title: "Given digits",
    description: "Prefill some cells with digits.",
    defaultConfig: {
      type: ConstraintType.Givens,
    },
  },
});

export const RegionsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Regions,
  schema: z.object({
    type: z.literal(ConstraintType.Regions).describe("Regions"),
    regions: z.array(z.number()).describe(""),
  }),
  main: {
    title: "Regions",
    description: "Digits cannot repeat in marked regions.",
    defaultConfig: {
      type: ConstraintType.Regions,
      regions: [
        0, 0, 0, 1, 1, 1, 2, 2, 2, 0, 0, 0, 1, 1, 1, 2, 2, 2, 0, 0, 0, 1, 1, 1,
        2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 3, 3, 3, 4, 4, 4, 5, 5, 5, 3, 3, 3,
        4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 6, 6, 6, 7, 7, 7, 8, 8, 8,
        6, 6, 6, 7, 7, 7, 8, 8, 8,
      ],
    },
  },
});

export const DiagonalMinusConstraint = new SudokuMakerConstraint({
  type: ConstraintType.DiagonalMinus,
  schema: z.object({
    type: z.literal(ConstraintType.DiagonalMinus).describe("DiagonalMinus"),
    style: LineStyle,
  }),
  main: {
    title: "Negative diagonal",
    description: "Digits cannot repeat along the negative diagonal",
    defaultConfig: {
      type: ConstraintType.DiagonalMinus,
      style: {
        color: "#34bbe6ff",
        thickness: 0.02,
      },
    },
  },
});

export const DiagonalPlusConstraint = new SudokuMakerConstraint({
  type: ConstraintType.DiagonalPlus,
  schema: z.object({
    type: z.literal(ConstraintType.DiagonalPlus).describe("DiagonalPlus"),
    style: LineStyle,
  }),
  main: {
    title: "Positive diagonal",
    description: "Digits cannot repeat along the positive diagonal",
    defaultConfig: {
      type: ConstraintType.DiagonalPlus,
      style: {
        color: "#34bbe6ff",
        thickness: 0.02,
      },
    },
  },
});

export const AntikingConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Antiking,
  schema: z.object({
    type: z.literal(ConstraintType.Antiking).describe("Antiking"),
  }),
  main: {
    title: "Antiking",
    description:
      "Cells seperated by a king’s move in chess cannot have the same digit.",
    defaultConfig: {
      type: ConstraintType.Antiking,
    },
  },
});

export const AntiknightConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Antiknight,
  schema: z.object({
    type: z.literal(ConstraintType.Antiknight).describe("Antiknight"),
  }),
  main: {
    title: "Antiknight",
    description:
      "Cells seperated by a knight’s move in chess cannot have the same digit.",
    defaultConfig: {
      type: ConstraintType.Antiknight,
    },
  },
});

export const DisjointGroupsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.DisjointGroups,
  schema: z.object({
    type: z.literal(ConstraintType.DisjointGroups).describe("DisjointGroups"),
  }),
  main: {
    title: "Disjoint groups",
    description:
      "Cells with the same position within the boxes contain all the numbers 1 to 9",
    defaultConfig: {
      type: ConstraintType.DisjointGroups,
    },
  },
});

export const NonconsecutiveConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Nonconsecutive,
  schema: z.object({
    type: z.literal(ConstraintType.Nonconsecutive).describe("Nonconsecutive"),
  }),
  main: {
    title: "Non­consecutive",
    description:
      "Cells that are orthogonally adjacent cannot contain consecutive digits.",
    defaultConfig: {
      type: ConstraintType.Nonconsecutive,
    },
  },
});

export const EvenConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Even,
  schema: z.object({
    type: z.literal(ConstraintType.Even).describe("Even"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
        size: z.number().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Even",
    description: "Cells with these squares must contain even numbers.",
    defaultConfig: {
      type: ConstraintType.Even,
      cells: [],
      style: {
        color: "#00000033",
        size: 0.8,
      },
    },
  },
});

export const OddConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Odd,
  schema: z.object({
    type: z.literal(ConstraintType.Odd).describe("Odd"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
        size: z.number().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Odd",
    description: "Cells with these circles must contain odd numbers.",
    defaultConfig: {
      type: ConstraintType.Odd,
      cells: [],
      style: {
        color: "#00000033",
        size: 0.8,
      },
    },
  },
});

export const MaximumConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Maximum,
  schema: z.object({
    type: z.literal(ConstraintType.Maximum).describe("Maximum"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Maximum",
    description:
      "Cells with this constraint are greater than all adjacent cells without this constraint.",
    defaultConfig: {
      type: ConstraintType.Maximum,
      cells: [],
      style: {
        color: "#00000033",
      },
    },
  },
});

export const MinimumConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Minimum,
  schema: z.object({
    type: z.literal(ConstraintType.Minimum).describe("Minimum"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Minimum",
    description:
      "Cells with this constraint are smaller than all adjacent cells without this constraint.",
    defaultConfig: {
      type: ConstraintType.Minimum,
      cells: [],
      style: {
        color: "#00000033",
      },
    },
  },
});

export const DifferenceConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Difference,
  schema: z.object({
    type: z.literal(ConstraintType.Difference).describe("Difference"),
    clues: z.array(EdgeClue(z.number().describe(""))).describe(""),
    negative: z.array(z.number()).describe(""),
    overrideNegativeRatios: z.boolean().describe(""),
  }),
  main: {
    title: "Difference Kropki dots",
    description:
      "Cells joined by a white dot must have a difference of the indicated number. If there is no indicated number, the difference will be assumed to be 1.",
    defaultConfig: {
      type: ConstraintType.Difference,
      clues: [],
      negative: [],
      overrideNegativeRatios: true,
    },
  },
});

export const RatioConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Ratio,
  schema: z.object({
    type: z.literal(ConstraintType.Ratio).describe("Ratio"),
    clues: z.array(EdgeClue(z.number().describe(""))).describe(""),
    negative: z.array(z.number()).describe(""),
    overrideNegativeDifferences: z.boolean().describe(""),
  }),
  main: {
    title: "Ratio Kropki dots",
    description:
      "Cells joined by a black dot must have a ratio of the indicated number. If there is no indicated number, the ratio will be assumed to be 2.",
    defaultConfig: {
      type: ConstraintType.Ratio,
      clues: [],
      negative: [],
      overrideNegativeDifferences: true,
    },
  },
});

export const XVConstraint = new SudokuMakerConstraint({
  type: ConstraintType.XV,
  schema: z.object({
    type: z.literal(ConstraintType.XV).describe("XV"),
    clues: z.array(EdgeClue(z.number().describe(""))).describe(""),
    negative: z.array(z.number()).describe(""),
  }),
  main: {
    title: "XV",
    description: "Cells joined by an X or V must sum to 10 (X) or 5 (V).",
    defaultConfig: {
      type: ConstraintType.XV,
      clues: [],
      negative: [],
    },
  },
});

export const KillerCagesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.KillerCages,
  schema: z.object({
    type: z.literal(ConstraintType.KillerCages).describe("KillerCages"),
    cages: z.array(Cage(z.number().describe(""))).describe(""),
    style: CageStyle,
  }),
  main: {
    title: "Killer cages",
    description:
      "Digits in cages must sum to the number in the top-left corner and cannot repeat",
    defaultConfig: {
      type: ConstraintType.KillerCages,
      cages: [],
      style: {
        text: {
          color: "#000000",
        },
        cage: {
          color: "#000000",
        },
      },
    },
  },
});

export const CloneConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Clone,
  schema: z.object({
    type: z.literal(ConstraintType.Clone).describe("Clone"),
    groups: z.array(z.array(CellId)).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Clones",
    description:
      "The arrangement of digits in a part of the sudoku must be the same elsewhere",
    defaultConfig: {
      type: ConstraintType.Clone,
      groups: [],
      style: {
        color: "#00000033",
      },
    },
  },
});

export const QuadrupleConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Quadruple,
  schema: z.object({
    type: z.literal(ConstraintType.Quadruple).describe("Quadruple"),
    clues: z
      .array(
        z
          .object({
            corner: CornerId,
            digits: z.array(z.number()).describe(""),
          })
          .describe(""),
      )
      .describe(""),
    style: z
      .object({
        singleLine: z.boolean().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Quadruples",
    description:
      "Every digit in a circle has to be assigned to one of the surrounding cells.",
    defaultConfig: {
      type: ConstraintType.Quadruple,
      clues: [],
      style: {
        singleLine: false,
      },
    },
  },
});

export const LookAndSayCagesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.LookAndSayCages,
  schema: z.object({
    type: z.literal(ConstraintType.LookAndSayCages).describe("LookAndSayCages"),
    cages: z.array(Cage()).describe(""),
    style: CageStyle,
  }),
  main: {
    title: "Look-and-say cages",
    description:
      "Read the clue out loud, which describes the nature of the cage. E.g. 1522 says there is “one five and two two(s)” in the cage.",
    defaultConfig: {
      type: ConstraintType.LookAndSayCages,
      cages: [],
      style: {
        cage: {
          color: "#000000",
        },
        text: {
          color: "#000000",
        },
      },
    },
  },
});

export const DifferentValuesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.DifferentValues,
  schema: z.object({
    type: z.literal(ConstraintType.DifferentValues).describe("DifferentValues"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
        offset: z.number().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Extra region/different values",
    description: "Digits cannot repeat in the marked cells",
    defaultConfig: {
      type: ConstraintType.DifferentValues,
      cells: [],
      style: {
        color: "#00000033",
        offset: 0.1,
      },
    },
  },
});

export const RenbanConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Renban,
  schema: z.intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.Renban).describe("Renban"),
    }),
  ),
  main: {
    title: "Renban lines",
    description:
      "Every renban line contains a set of consecutive digits in any order, without repeats",
    defaultConfig: {
      type: ConstraintType.Renban,
      lines: [],
      style: {
        color: "#f067f0",
        thickness: 0.15,
      },
    },
  },
});

export const PalindromeConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Palindrome,
  schema: z.intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.Palindrome).describe("Palindrome"),
    }),
  ),
  main: {
    title: "Palindromes",
    description:
      "Digits on a palindrome line read the same forwards and backwards",
    defaultConfig: {
      type: ConstraintType.Palindrome,
      lines: [],
      style: {
        color: "#bbbbbb",
        thickness: 0.15,
      },
    },
  },
});

export const BetweenLinesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.BetweenLines,
  schema: z.intersection(
    LineWithEndPointsConfigBase,
    z.object({
      type: z.literal(ConstraintType.BetweenLines).describe("BetweenLines"),
    }),
  ),
  main: {
    title: "Between lines",
    description:
      "Digits along a between line must be between the digits on the circled ends of the line.",
    defaultConfig: {
      type: ConstraintType.BetweenLines,
      lines: [],
      style: {
        lines: {
          thickness: 0.1,
          color: "#aaaaaa",
        },
        endPoints: {
          size: 0.8,
          fill: "#ffffff80",
          stroke: {
            thickness: 0.02,
            color: "#aaaaaa",
          },
        },
      },
    },
  },
});

export const RegionSumLineConstraint = new SudokuMakerConstraint({
  type: ConstraintType.RegionSumLine,
  schema: z.intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.RegionSumLine).describe("RegionSumLine"),
      singleRegionTotals: z.boolean().describe(""),
    }),
  ),
  main: {
    title: "Region sum lines",
    description:
      "For each line, digits on the line have an equal sum N within each box it passes through.",
    defaultConfig: {
      type: ConstraintType.RegionSumLine,
      lines: [],
      singleRegionTotals: false,
      style: {
        color: "#2ecbff",
        thickness: 0.15,
      },
    },
  },
});

export const SequenceConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Sequence,
  schema: z.intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.Sequence).describe("Sequence"),
    }),
  ),
  main: {
    title: "Sequence lines",
    description:
      "Sequence lines contain digits in order with a constant difference. E.g. 1-2-3, 2-5-8 or even 3-3-3...",
    defaultConfig: {
      type: ConstraintType.Sequence,
      lines: [],
      style: {
        color: "#aaaaaa",
        thickness: 0.15,
      },
    },
  },
});

export const LockoutLinesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.LockoutLines,
  schema: z.intersection(
    LineWithEndPointsConfigBase,
    z.object({
      type: z.literal(ConstraintType.LockoutLines).describe("LockoutLines"),
    }),
  ),
  main: {
    title: "Lockout lines",
    description:
      "Digits along a lockout line must not be between the digits on the circled ends of the line, which have a difference of at least 4",
    defaultConfig: {
      type: ConstraintType.LockoutLines,
      lines: [],
      style: {
        lines: {
          color: "#aabeefff",
          thickness: 0.1,
        },
        endPoints: {
          size: 0.8,
          stroke: {
            color: "#0000ff80",
            thickness: 0.05,
          },
          fill: "#e7e6ff80",
        },
      },
    },
  },
});

export const ArrowConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Arrow,
  schema: z.object({
    type: z.literal(ConstraintType.Arrow).describe("Arrow"),
    bulbsWithArrows: z
      .array(
        z
          .object({
            bulbCells: z.array(CellId).describe(""), // Important: index 0 is 1s, index 1 is 10s, etc
            arrows: z.array(z.array(CellId)).describe(""),
          })
          .describe(""),
      )
      .describe(""),
    style: z
      .object({
        arrow: z
          .object({
            color: z.string().describe(""),
            thickness: z.number().describe(""),
            headSize: z.number().describe(""),
          })
          .describe(""),
        bulb: BasicShapeStyle,
      })
      .describe(""),
  }),
  main: {
    title: "Arrows",
    description:
      "Numbers along an arrow sum to the number shown in the circled cells.",
    defaultConfig: {
      type: ConstraintType.Arrow,
      bulbsWithArrows: [],
      style: {
        bulb: {
          size: 0.8,
          fill: "#ffffff",
          stroke: {
            thickness: 0.02,
            color: "#aaaaaa",
          },
        },
        arrow: {
          thickness: 0.05,
          color: "#aaaaaa",
          headSize: 0.35,
        },
      },
    },
  },
});

export const DoubleArrowConstraint = new SudokuMakerConstraint({
  type: ConstraintType.DoubleArrow,
  schema: z.intersection(
    LineWithEndPointsConfigBase,
    z.object({
      type: z.literal(ConstraintType.DoubleArrow).describe("DoubleArrow"),
    }),
  ),
  main: {
    title: "Double arrows",
    description:
      "The sum of the digits along a ‘double arrow’ line is equal to the sum of the digits in the circles at either end of the line.",
    defaultConfig: {
      type: ConstraintType.DoubleArrow,
      lines: [],
      style: {
        lines: {
          thickness: 0.05,
          color: "#aaaaaa",
        },
        endPoints: {
          size: 0.8,
          fill: "#ffffff",
          stroke: {
            thickness: 0.02,
            color: "#aaaaaa",
          },
        },
      },
    },
  },
});

export const LittleKillersConstraint = new SudokuMakerConstraint({
  type: ConstraintType.LittleKillers,
  schema: z.object({
    type: z.literal(ConstraintType.LittleKillers).describe("LittleKillers"),
    clues: z
      .array(
        z
          .object({
            value: z.number().optional().describe(""),
            outerCell: OuterCellId,
            diagonal: DiagonalType,
          })
          .describe(""),
      )
      .describe(""),
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
  }),
  main: {
    title: "Little killers",
    description:
      "Digits along marked diagonals sum to the number indicated outside the grid.",
    defaultConfig: {
      type: ConstraintType.LittleKillers,
      clues: [],
      style: {
        text: {
          color: "#000000",
        },
        arrow: {
          color: "#000000",
        },
      },
    },
  },
});

export const SandwichSumsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.SandwichSums,
  schema: z.object({
    type: z.literal(ConstraintType.SandwichSums).describe("SandwichSums"),
    clues: z.array(OuterClue(z.number().describe(""))).describe(""),
    style: OuterClueStyle,
  }),
  main: {
    title: "Sandwich sums",
    description:
      "Digits between 1 and 9 in the indicated row or column must sum to the indicated value",
    defaultConfig: {
      type: ConstraintType.SandwichSums,
      clues: [],
      style: {
        color: "#000000ff",
      },
    },
  },
});

export const XSumsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.XSums,
  schema: z.object({
    type: z.literal(ConstraintType.XSums).describe("XSums"),
    clues: z.array(OuterClue(z.number().optional())).describe(""),
    style: OuterClueStyle,
  }),
  main: {
    title: "X-sums",
    description:
      "Clues at the edge of the grid show the sum of the first X digits, where X is the first seen digit.",
    defaultConfig: {
      type: ConstraintType.XSums,
      clues: [],
      style: {
        color: "#000000",
      },
    },
  },
});

export const SkyscrapersConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Skyscrapers,
  schema: z.object({
    type: z.literal(ConstraintType.Skyscrapers).describe("Skyscrapers"),
    clues: z.array(OuterClue(z.number().optional())).describe(""),
    style: OuterClueStyle,
  }),
  main: {
    title: "Skyscrapers",
    description:
      "Each digit in the grid represents the height of a building in its cell. Taller buildings obstruct the view of shorter ones behind them. Clues outside the grid give the number of buildings visible from that vantage point in the clue's row or column.",
    defaultConfig: {
      type: ConstraintType.Skyscrapers,
      clues: [],
      style: {
        color: "#000000ff",
      },
    },
  },
});

export const NumberedRoomsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.NumberedRooms,
  schema: z.object({
    type: z.literal(ConstraintType.NumberedRooms).describe("NumberedRooms"),
    clues: z.array(OuterClue(z.number().optional())).describe(""),
    style: OuterClueStyle,
  }),
  main: {
    title: "Numbered rooms",
    description:
      "Clues outside the grid indicate the digit which has to be placed in the Nth cell in the corresponding direction, where N is the digit placed in the first cell in that direction.",
    defaultConfig: {
      type: ConstraintType.NumberedRooms,
      clues: [],
      style: {
        color: "#000000",
      },
    },
  },
});

export const RowIndexerConstraint = new SudokuMakerConstraint({
  type: ConstraintType.RowIndexer,
  schema: z.object({
    type: z.literal(ConstraintType.RowIndexer).describe("RowIndexer"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Row indexers",
    description:
      "A marked cell in row X indicates the row where X appears in the column.",
    defaultConfig: {
      type: ConstraintType.RowIndexer,
      cells: [],
      style: {
        color: "#0080f955",
      },
    },
  },
});

export const ColumnIndexerConstraint = new SudokuMakerConstraint({
  type: ConstraintType.ColumnIndexer,
  schema: z.object({
    type: z.literal(ConstraintType.ColumnIndexer).describe("ColumnIndexer"),
    cells: z.array(CellId).describe(""),
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Column indexers",
    description:
      "A marked cell in column X indicates the column where X appears in the row.",
    defaultConfig: {
      type: ConstraintType.ColumnIndexer,
      cells: [],
      style: {
        color: "#f9000055",
      },
    },
  },
});

export const UserDefined = z.any().describe("");
export const CustomConstraintConfigInput = z.record(
  z.string().describe(""),
  UserDefined,
);
export const CustomConstraintConfigStyle = z.record(
  z.string().describe(""),
  UserDefined,
);

// region Custom constraint
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
// endregion

export const CustomConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Custom,
  schema: z.object({
    type: z.literal(ConstraintType.Custom).describe("Custom"),
    definition: CustomConstraintDefinition,
    input: CustomConstraintConfigInput,
    style: CustomConstraintConfigStyle,
  }),
  main: {
    title: "Custom constraint",
    description: "Code your own constraints in Javascript",
    defaultConfig: {
      type: ConstraintType.Custom,
      definition: {
        name: "New constraint",
        input: [],
        backend: {
          type: "code",
          code: "",
        },
        components: [],
      },
      input: {},
      style: {},
    },
  },
});

export const CosmeticLineConstraint = new SudokuMakerConstraint({
  type: ConstraintType.CosmeticLine,
  schema: z.object({
    type: z.literal(ConstraintType.CosmeticLine).describe("CosmeticLine"),
    lines: z.array(z.array(IVector2)).describe(""),
    style: z
      .intersection(
        LineStyle,
        z.object({
          layer: SudokuLayer.optional(), // Undefined means it's automatic - "on top" if edges are overlaying edges of the grid.
        }),
      )
      .describe(""),
  }),
  main: {
    title: "Cosmetic lines",
    description:
      "Place lines without any (programmed) logic associated with them.",
    defaultConfig: {
      type: ConstraintType.CosmeticLine,
      lines: [],
      style: {
        thickness: 0.15,
        color: "#ff6666",
      },
    },
  },
});

export const CosmeticCageConstraint = new SudokuMakerConstraint({
  type: ConstraintType.CosmeticCage,
  schema: z.object({
    type: z.literal(ConstraintType.CosmeticCage).describe("CosmeticCage"),
    cages: z.array(Cage()).describe(""),
    style: CageStyle,
  }),
  main: {
    title: "Cosmetic cages",
    description:
      "Place cages without any (programmed) logic associated with them.",
    defaultConfig: {
      type: ConstraintType.CosmeticCage,
      cages: [],
      style: {
        text: {
          color: "#000000",
        },
        cage: {
          color: "#000000",
        },
      },
    },
  },
});

// region Cosmetic symbol params
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
// endregion

export const CosmeticSymbolConstraint = new SudokuMakerConstraint({
  type: ConstraintType.CosmeticSymbol,
  schema: z.object({
    type: z.literal(ConstraintType.CosmeticSymbol).describe("CosmeticSymbol"),
    symbols: z.array(CosmeticSymbol).describe(""),
  }),
  main: {
    title: "Cosmetic symbols",
    description:
      "Place symbols (squares, circles, text, arrows) without any (programmed) logic associated with them.",
    defaultConfig: {
      type: ConstraintType.CosmeticSymbol,
      symbols: [],
    },
  },
});

export const FogLightsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.FogLights,
  schema: z.object({
    type: z.literal(ConstraintType.FogLights).describe("FogLights"),
    lightCells: z.array(CellId).describe(""),
  }),
  main: {
    title: "Fog lights",
    description:
      "Place lights which clear fog at the start. Fog: cover cells with fog that only clears when a correct digit is placed.",
    defaultConfig: {
      type: ConstraintType.FogLights,
      lightCells: [],
    },
  },
});

export enum CustomFogClearingPatternNative {
  // noinspection JSUnusedGlobalSymbols
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

export const FogTriggersConstraint = new SudokuMakerConstraint({
  type: ConstraintType.FogTriggers,
  schema: z.object({
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
      .optional()
      .describe(""),
    effects: z
      .array(
        z.object({
          label: z.string().describe(""),
          cells: z.array(CellId).describe(""),
        }),
      )
      .optional()
      .describe(""),
    editor: z
      .object({ defaultDisabling: z.boolean().optional().describe("") })
      .optional()
      .describe(""),
  }),
  main: {
    title: "Custom fog clearing",
    description:
      "Customize when fog should be cleared. Fog: cover cells with fog that only clears when a correct digit is placed.",
    defaultConfig: {
      type: ConstraintType.FogTriggers,
      patterns: [0],
      triggers: [],
      effects: [],
      overrides: [],
      editor: {
        defaultDisabling: false,
      },
    },
  },
});
// endregion

// region Multi-option constraints
const describeDigitGroups = (groups: number[]) =>
  groups.length
    ? groups
        .map((mask) => Array.from(new window.Api.DigitSet(mask)).join(""))
        .join("/")
    : "???";

const getDigitGroups: SpecGetter<
  number[],
  [number, (digit: number) => number]
> = ({ minDigit, maxDigit }, count, getGroup) => {
  const groups = Array(count)
    .fill(undefined)
    .map(() => new window.Api.DigitSet());

  for (let digit = minDigit; digit <= maxDigit; digit++) {
    groups[getGroup(digit)].add(digit);
  }

  return groups.map((set) => +set);
};

const getEntropicGroups: SpecGetter<number[]> = (spec) => {
  const { minDigit, digitCount } = spec;

  const limit1 = minDigit + Math.round(digitCount / 3);
  const limit2 = minDigit + Math.round((digitCount * 2) / 3);

  return getDigitGroups(spec, 3, (digit) =>
    digit <= limit1 ? 0 : digit <= limit2 ? 1 : 2,
  );
};

const getModuloGroups: SpecGetter<number[], [number]> = (spec, count) => {
  return getDigitGroups(spec, count, (digit) => digit % count);
};

const areSameDigitGroups = (group1: number[], group2: number[]): boolean => {
  if (group1.length !== group2.length) {
    return false;
  }

  group1 = Array.from(group1).sort();
  group2 = Array.from(group2).sort();
  return group1.every((value, index) => value === group2[index]);
};

export const GlobalEntropyConstraint = new SudokuMakerConstraint({
  type: ConstraintType.GlobalEntropy,
  schema: z.object({
    type: z.literal(ConstraintType.GlobalEntropy).describe("GlobalEntropy"),
    groups: z.array(z.number()).describe(""),
  }),
  main: {
    title: "Global 2x2 groups",
    getTitle: ({ groups }) => `Global ${describeDigitGroups(groups)}`,
    description:
      "Every 2x2 square of cells must contain at least 1 digit of every specified group.",
    paramsSchema: z.object({
      groups: z
        .array(z.array(z.number().describe("digit")))
        .describe("digit groups"),
    }),
    defaultConfig: (_spec, { groups }) => ({
      type: ConstraintType.GlobalEntropy,
      groups: groups.map((group) => +window.Api.DigitSet.from(group)),
    }),
  },
  options: [
    {
      title: "Global entropy",
      description:
        "Every 2x2 square of cells must contain a low digit (1,2,3), middle digit (4,5,6) and high digit (7,8,9).",
      defaultConfig: (spec) => ({
        type: ConstraintType.GlobalEntropy,
        groups: getEntropicGroups(spec),
      }),
      detect: ({ groups }, spec) =>
        areSameDigitGroups(groups, getEntropicGroups(spec)),
    },
    {
      title: "Global modulo-3",
      description:
        "Every 2x2 square of cells must contain a digit from (1,4,7), a digit from (2,5,8) and a digit from (3,6,9).",
      defaultConfig: (spec) => ({
        type: ConstraintType.GlobalEntropy,
        groups: getModuloGroups(spec, 3),
      }),
      detect: ({ groups }, spec) =>
        areSameDigitGroups(groups, getModuloGroups(spec, 3)),
    },
  ],
});

export const ThermometerConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Thermometer,
  schema: z.object({
    type: z.literal(ConstraintType.Thermometer).describe("Thermometer"),
    thermometers: z.array(z.array(CellId)).describe(""),
    slow: z.boolean().describe(""),
    style: z
      .object({
        color: z.string().describe(""),
        thickness: z.number().describe(""),
        bulbRadius: z.number().describe(""),
      })
      .describe(""),
  }),
  main: {
    title: "Thermometers",
    description:
      "Numbers on a thermometer strictly increase as they move away from the bulb",
    defaultConfig: {
      type: ConstraintType.Thermometer,
      slow: false,
      thermometers: [],
      style: {
        color: "#cccccc",
        thickness: 0.3,
        bulbRadius: 0.4,
      },
    },
  },
  options: [
    {
      title: "Slow thermometers",
      description:
        "Numbers on a slow thermometer increase or stay the same as they move away from the bulb",
      defaultConfig: {
        type: ConstraintType.Thermometer,
        slow: true,
        thermometers: [],
        style: {
          color: "#aaaaaa",
          thickness: 0.3,
          bulbRadius: 0.4,
        },
      },
      detect: ({ slow }) => slow,
    },
  ],
});

const getGermanWhisperDiff: SpecGetter<number> = ({ digitCount }) =>
  Math.ceil(digitCount / 2);
const getDutchWhisperDiff: SpecGetter<number> = (spec) =>
  getGermanWhisperDiff(spec) - 1;

const WhisperParamsSchema = z.object({
  minDifference: z
    .number()
    .describe(
      "Two cells connected by a whisper line must have this minimal difference",
    ),
});

export const WhisperConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Whisper,
  schema: z.intersection(
    z.object({
      type: z.literal(ConstraintType.Whisper).describe("Whisper"),
    }),
    z.intersection(LineConstraintConfigBase, WhisperParamsSchema),
  ),
  main: {
    title: "Whisper lines",
    description:
      "Two cells connected by a whisper line must have a difference of at least defined number.",
    paramsSchema: WhisperParamsSchema,
    defaultConfig: (_spec, { minDifference }) => ({
      type: ConstraintType.Whisper,
      lines: [],
      minDifference,
      style: {
        color: "#67f067",
        thickness: 0.15,
      },
    }),
  },
  options: [
    {
      title: "German whisper lines",
      description:
        "Two cells connected by a German whisper line must have a difference of at least half digits count (e.g. 5 for a puzzle with 9 digits).",
      getDescription: (spec) =>
        `Two cells connected by a German whisper line must have a difference of at least ${getGermanWhisperDiff(spec)}.`,
      defaultConfig: (spec) => ({
        type: ConstraintType.Whisper,
        lines: [],
        minDifference: getGermanWhisperDiff(spec),
        style: {
          color: "#67f067",
          thickness: 0.15,
        },
      }),
      detect: ({ minDifference }, spec) =>
        minDifference === getGermanWhisperDiff(spec),
    },
    {
      title: "Dutch whisper lines",
      description:
        "Two cells connected by a Dutch whisper line must have a difference of at least half digits count minus one (e.g. 4 for a puzzle with 9 digits).",
      getDescription: (spec) =>
        `Two cells connected by a Dutch whisper line must have a difference of at least ${getDutchWhisperDiff(spec)}.`,
      defaultConfig: (spec) => ({
        type: ConstraintType.Whisper,
        lines: [],
        minDifference: getDutchWhisperDiff(spec),
        style: {
          color: "#ffa600",
          thickness: 0.15,
        },
      }),
      detect: ({ minDifference }, spec) =>
        minDifference === getDutchWhisperDiff(spec),
    },
  ],
});

export const EntropyLinesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.EntropyLines,
  schema: z.intersection(
    LineConstraintConfigBase,
    z.object({
      type: z.literal(ConstraintType.EntropyLines).describe("EntropyLines"),
      groups: z.array(z.number()).describe(""),
    }),
  ),
  main: {
    title: "Digit group lines",
    getTitle: ({ groups }) => `${describeDigitGroups(groups)} lines`,
    description:
      "Every N consecutive cells along a line must contain exactly 1 digit of every specified group, where N is the amount of groups.",
    paramsSchema: z.object({
      groups: z
        .array(z.array(z.number().describe("digit")))
        .describe("digit groups"),
    }),
    defaultConfig: (_spec, { groups }) => ({
      type: ConstraintType.EntropyLines,
      lines: [],
      groups: groups.map((group) => +window.Api.DigitSet.from(group)),
      style: {
        color: "#aaaaaa",
        thickness: 0.15,
      },
    }),
  },
  options: [
    {
      title: "Entropic lines",
      description:
        "Every 3 consecutive cells along an entropic line must contain a low digit (1,2,3), middle digit (4,5,6) and high digit (7,8,9).",
      defaultConfig: (spec) => ({
        type: ConstraintType.EntropyLines,
        lines: [],
        groups: getEntropicGroups(spec),
        style: {
          color: "#ffccaa",
          thickness: 0.15,
        },
      }),
      detect: ({ groups }, spec) =>
        areSameDigitGroups(groups, getEntropicGroups(spec)),
    },
    {
      title: "3-modular lines",
      description:
        "Every 3 consecutive cells along a 3-modular line must contain a complete set of residuals modulo 3. i.e: one from (3,6,9), one from (1,4,7) and one from (2,5,8).",
      defaultConfig: (spec) => ({
        type: ConstraintType.EntropyLines,
        lines: [],
        groups: getModuloGroups(spec, 3),
        style: {
          color: "#33bbaa",
          thickness: 0.15,
        },
      }),
      detect: ({ groups }, spec) =>
        areSameDigitGroups(groups, getModuloGroups(spec, 3)),
    },
    {
      title: "Parity (odd/even) lines",
      description:
        "Every pair of consecutive cells along a parity line must contain an even and odd digit.",
      defaultConfig: (spec) => ({
        type: ConstraintType.EntropyLines,
        lines: [],
        groups: getModuloGroups(spec, 2),
        style: {
          color: "#ff6666",
          thickness: 0.15,
        },
      }),
      detect: ({ groups }, spec) =>
        areSameDigitGroups(groups, getModuloGroups(spec, 2)),
    },
  ],
});
// endregion

export const AllConstraints = [
  SudokuRulesConstraint,
  GivensConstraint,
  RegionsConstraint,
  DiagonalMinusConstraint,
  DiagonalPlusConstraint,
  AntikingConstraint,
  AntiknightConstraint,
  DisjointGroupsConstraint,
  NonconsecutiveConstraint,
  EvenConstraint,
  OddConstraint,
  MaximumConstraint,
  MinimumConstraint,
  DifferenceConstraint,
  RatioConstraint,
  XVConstraint,
  KillerCagesConstraint,
  CloneConstraint,
  QuadrupleConstraint,
  LookAndSayCagesConstraint,
  DifferentValuesConstraint,
  RenbanConstraint,
  PalindromeConstraint,
  BetweenLinesConstraint,
  RegionSumLineConstraint,
  SequenceConstraint,
  LockoutLinesConstraint,
  ArrowConstraint,
  DoubleArrowConstraint,
  LittleKillersConstraint,
  SandwichSumsConstraint,
  XSumsConstraint,
  SkyscrapersConstraint,
  NumberedRoomsConstraint,
  RowIndexerConstraint,
  ColumnIndexerConstraint,
  CustomConstraint,
  CosmeticLineConstraint,
  CosmeticCageConstraint,
  CosmeticSymbolConstraint,
  FogLightsConstraint,
  FogTriggersConstraint,
  GlobalEntropyConstraint,
  ThermometerConstraint,
  WhisperConstraint,
  EntropyLinesConstraint,
];

export const ConstraintConfig = z
  .union(AllConstraints.map(({ schema }) => schema))
  .meta({
    id: "ConstraintConfig",
    description: "Constraint configuration",
  });

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
