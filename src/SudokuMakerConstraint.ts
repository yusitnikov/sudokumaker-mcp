import {
  CellId,
  type CellCoords,
  CornerId,
  DiagonalType,
  EdgeId,
  IVector2,
  OuterCellId,
  CellsRectangle,
  Spec,
  SudokuLayer,
  DigitSetSchema,
} from "./SudokuMakerSchemas";
import { z } from "zod";

// region Core
type PublicConfigT<
  TypeT extends ConstraintType,
  ConfigSchemaT extends z.ZodType,
  InstanceKeyT extends string | never,
  InstanceConfigSchemaT extends z.ZodType | never,
> = z.input<ConfigSchemaT> & {
  type: (typeof ConstraintType)[TypeT];
} & (InstanceKeyT extends string
    ? InstanceConfigSchemaT extends z.ZodType
      ? { [K in InstanceKeyT]: z.input<InstanceConfigSchemaT>[] }
      : {}
    : {});
type InternalConfigT<
  TypeT extends ConstraintType,
  ConfigSchemaT extends z.ZodType,
  InstanceKeyT extends string | never,
  InstanceConfigSchemaT extends z.ZodType | never,
> = z.output<ConfigSchemaT> & { type: TypeT } & (InstanceKeyT extends string
    ? InstanceConfigSchemaT extends z.ZodType
      ? { [K in InstanceKeyT]: z.output<InstanceConfigSchemaT>[] }
      : {}
    : {});

interface ConstraintInstanceDescriptor<
  InstanceKeyT extends string,
  InstanceConfigSchemaT extends z.ZodType,
> {
  key: InstanceKeyT;
  schema: InstanceConfigSchemaT;
  getAffectedCells: (instance: z.input<InstanceConfigSchemaT>) => CellCoords[];
}

export class SudokuMakerConstraint<
  TypeT extends ConstraintType,
  ConfigSchemaT extends z.ZodType,
  InstanceKeyT extends string | never,
  InstanceConfigSchemaT extends z.ZodType | never,
  ParamsSchemaT extends z.ZodObject,
> {
  public readonly typeId: TypeT;
  public readonly typeName: (typeof ConstraintType)[TypeT];
  public readonly schema: z.ZodType<
    InternalConfigT<TypeT, ConfigSchemaT, InstanceKeyT, InstanceConfigSchemaT>,
    PublicConfigT<TypeT, ConfigSchemaT, InstanceKeyT, InstanceConfigSchemaT>
  >;
  public readonly instance?: ConstraintInstanceDescriptor<
    InstanceKeyT,
    InstanceConfigSchemaT
  >;
  public readonly main: SudokuMakerConstraintOption<
    PublicConfigT<TypeT, ConfigSchemaT, InstanceKeyT, InstanceConfigSchemaT>,
    InstanceKeyT,
    ParamsSchemaT
  >;
  public readonly options: SecondarySudokuMakerConstraintOption<
    PublicConfigT<TypeT, ConfigSchemaT, InstanceKeyT, InstanceConfigSchemaT>,
    InstanceKeyT
  >[];

  constructor({
    type,
    schema = z.object({}) as unknown as ConfigSchemaT,
    instance,
    main,
    options = [],
  }: {
    type: TypeT;
    schema?: ConfigSchemaT;
    instance?: ConstraintInstanceDescriptor<
      InstanceKeyT,
      InstanceConfigSchemaT
    >;
    main: SudokuMakerConstraintOption<
      PublicConfigT<TypeT, ConfigSchemaT, InstanceKeyT, InstanceConfigSchemaT>,
      InstanceKeyT,
      ParamsSchemaT
    >;
    options?: SecondarySudokuMakerConstraintOption<
      PublicConfigT<TypeT, ConfigSchemaT, InstanceKeyT, InstanceConfigSchemaT>,
      InstanceKeyT
    >[];
  }) {
    const instanceKey = instance?.key;
    const instanceSchema = instance?.schema;

    this.typeId = type;
    this.typeName = ConstraintType[type];
    this.schema = z
      .intersection(
        schema,
        z.object({
          type: z.codec(z.literal(this.typeName), z.literal(type), {
            encode: () => this.typeName,
            decode: () => type,
          }),
          ...(instanceKey && instanceSchema
            ? {
                [instanceKey]: z
                  .array(instanceSchema)
                  .describe("Array of constraint instances"),
              }
            : {}),
        }),
      )
      .meta({
        id: `${this.typeName}Config`,
        description: `"${main.title}" constraint config. Constraint description: ${main.description}`,
      }) as any;
    this.instance = instance;
    this.main = main;
    this.options = options;
  }

  getConstraintMetadata(
    config: PublicConfigT<
      TypeT,
      ConfigSchemaT,
      InstanceKeyT,
      InstanceConfigSchemaT
    >,
    spec: z.input<typeof Spec>,
  ) {
    let detectedOption: SudokuMakerConstraintOption<
      PublicConfigT<TypeT, ConfigSchemaT, InstanceKeyT, InstanceConfigSchemaT>,
      any
    > = this.main;

    for (const option of this.options) {
      if (option.detect(config, spec)) {
        detectedOption = option;
        break;
      }
    }

    return {
      title: detectedOption.getTitle?.(config, spec) ?? detectedOption.title,
      description:
        detectedOption.getDescription?.(spec) ?? detectedOption.description,
    };
  }
}

export interface SudokuMakerConstraintOption<
  ConfigT,
  InstanceKeyT extends string | never,
  ParamsSchemaT extends z.ZodObject = z.ZodObject<{}>,
> {
  title: string;
  getTitle?: ConfigGetter<ConfigT, string>;
  description: string;
  getDescription?: SpecGetter<string>;
  paramsSchema?: ParamsSchemaT;
  defaultConfig?:
    | Omit<ConfigT, "type" | InstanceKeyT>
    | SpecGetter<
        Omit<ConfigT, "type" | InstanceKeyT>,
        [z.input<ParamsSchemaT>]
      >;
}

export interface SecondarySudokuMakerConstraintOption<
  ConfigT,
  InstanceKeyT extends string | never,
  ParamsSchemaT extends z.ZodObject = z.ZodObject<{}>,
> extends SudokuMakerConstraintOption<ConfigT, InstanceKeyT, ParamsSchemaT> {
  detect: ConfigGetter<ConfigT, boolean>;
}

type SpecGetter<ResultT, ArgsT extends any[] = []> = (
  spec: z.input<typeof Spec>,
  ...args: ArgsT
) => ResultT;

type ConfigGetter<ConfigT, ResultT> = (
  config: ConfigT,
  spec: z.input<typeof Spec>,
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

const LineInstanceSchema = z.array(CellId).meta({
  id: "LineCells",
  description: "The list of all cells that lines goes through",
});
const LineInstance: ConstraintInstanceDescriptor<
  "lines",
  typeof LineInstanceSchema
> = {
  key: "lines",
  schema: LineInstanceSchema,
  getAffectedCells: (cells) => cells,
};

export const LineConstraintConfigBase = z
  .object({
    style: LineStyle,
  })
  .meta({
    id: "LineConstraintConfigBase",
    description: "",
  });

export const LineWithEndPointsConfigBase = z
  .object({
    style: LineWithEndPointsStyle,
  })
  .meta({
    id: "LineWithEndPointsConfigBase",
    description: "",
  });

export const EdgeClue = <ValueT extends z.ZodType>(ValueType: ValueT) => {
  const schema = z
    .object({
      value: ValueType,
      edge: EdgeId,
    })
    .describe("");

  return {
    key: "clues",
    schema,
    getAffectedCells: ({ edge }) => edge,
  } as ConstraintInstanceDescriptor<"clues", typeof schema>;
};

export const OuterClue = <ValueT extends z.ZodType>(ValueType: ValueT) => {
  const schema = z.object({
    value: ValueType.describe(""),
    outerCell: OuterCellId.describe(""),
    diagonal: DiagonalType.optional(),
  });

  return {
    key: "clues",
    schema,
    getAffectedCells: ({ outerCell }) => [outerCell],
  } as ConstraintInstanceDescriptor<"clues", typeof schema>;
};

export const Cage = <ValueT extends z.ZodType>(ValueType: ValueT) => {
  const schema = z
    .object({
      value: ValueType,
      cells: z.array(CellId).describe("Cage cells"),
    })
    .describe("");

  return {
    key: "cages",
    schema,
    getAffectedCells: ({ cells }) => cells,
  } as ConstraintInstanceDescriptor<"cages", typeof schema>;
};
// endregion

// region Single-option constraints
export const SudokuRulesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.SudokuRules,
  schema: z.object({
    areas: z.array(CellsRectangle).optional().describe(""),
  }),
  main: {
    title: "Rows and columns",
    description: "All rows and columns must contain different digits.",
  },
});

export const GivensConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Givens,
  main: {
    title: "Given digits",
    description: "Prefill some cells with digits.",
  },
});

export const RegionsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Regions,
  schema: z.object({
    regions: z.array(z.number()).describe(""),
  }),
  main: {
    title: "Regions",
    description: "Digits cannot repeat in marked regions.",
    defaultConfig: {
      // TODO
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
    style: LineStyle,
  }),
  main: {
    title: "Negative diagonal",
    description: "Digits cannot repeat along the negative diagonal",
    defaultConfig: {
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
    style: LineStyle,
  }),
  main: {
    title: "Positive diagonal",
    description: "Digits cannot repeat along the positive diagonal",
    defaultConfig: {
      style: {
        color: "#34bbe6ff",
        thickness: 0.02,
      },
    },
  },
});

export const AntikingConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Antiking,
  main: {
    title: "Antiking",
    description:
      "Cells seperated by a king’s move in chess cannot have the same digit.",
  },
});

export const AntiknightConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Antiknight,
  main: {
    title: "Antiknight",
    description:
      "Cells seperated by a knight’s move in chess cannot have the same digit.",
  },
});

export const DisjointGroupsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.DisjointGroups,
  main: {
    title: "Disjoint groups",
    description:
      "Cells with the same position within the boxes contain all the numbers 1 to 9",
  },
});

export const NonconsecutiveConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Nonconsecutive,
  main: {
    title: "Non-consecutive",
    description:
      "Cells that are orthogonally adjacent cannot contain consecutive digits.",
  },
});

const SingleCellInstance: ConstraintInstanceDescriptor<"cells", typeof CellId> =
  {
    key: "cells" as const,
    schema: CellId,
    getAffectedCells: (cell) => [cell],
  };

export const EvenConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Even,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
        size: z.number().describe(""),
      })
      .describe(""),
  }),
  instance: SingleCellInstance,
  main: {
    title: "Even",
    description: "Cells with these squares must contain even numbers.",
    defaultConfig: {
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
    style: z
      .object({
        color: z.string().describe(""),
        size: z.number().describe(""),
      })
      .describe(""),
  }),
  instance: SingleCellInstance,
  main: {
    title: "Odd",
    description: "Cells with these circles must contain odd numbers.",
    defaultConfig: {
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
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  instance: SingleCellInstance,
  main: {
    title: "Maximum",
    description:
      "Cells with this constraint are greater than all adjacent cells without this constraint.",
    defaultConfig: {
      style: {
        color: "#00000033",
      },
    },
  },
});

export const MinimumConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Minimum,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  instance: SingleCellInstance,
  main: {
    title: "Minimum",
    description:
      "Cells with this constraint are smaller than all adjacent cells without this constraint.",
    defaultConfig: {
      style: {
        color: "#00000033",
      },
    },
  },
});

export const DifferenceConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Difference,
  schema: z.object({
    negative: z.array(z.number()).describe(""),
    overrideNegativeRatios: z.boolean().describe(""),
  }),
  instance: EdgeClue(z.number().describe("")),
  main: {
    title: "Difference Kropki dots",
    description:
      "Cells joined by a white dot must have a difference of the indicated number. If there is no indicated number, the difference will be assumed to be 1.",
    defaultConfig: {
      negative: [],
      overrideNegativeRatios: true,
    },
  },
});

export const RatioConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Ratio,
  schema: z.object({
    negative: z.array(z.number()).describe(""),
    overrideNegativeDifferences: z.boolean().describe(""),
  }),
  instance: EdgeClue(z.number().describe("")),
  main: {
    title: "Ratio Kropki dots",
    description:
      "Cells joined by a black dot must have a ratio of the indicated number. If there is no indicated number, the ratio will be assumed to be 2.",
    defaultConfig: {
      negative: [],
      overrideNegativeDifferences: true,
    },
  },
});

export const XVConstraint = new SudokuMakerConstraint({
  type: ConstraintType.XV,
  schema: z.object({
    negative: z.array(z.number()).describe(""),
  }),
  instance: EdgeClue(z.number().describe("")),
  main: {
    title: "XV",
    description: "Cells joined by an X or V must sum to 10 (X) or 5 (V).",
    defaultConfig: {
      negative: [],
    },
  },
});

export const KillerCagesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.KillerCages,
  schema: z.object({
    style: CageStyle,
  }),
  instance: Cage(z.number().describe("")),
  main: {
    title: "Killer cages",
    description:
      "Digits in cages must sum to the number in the top-left corner and cannot repeat",
    defaultConfig: {
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
    // TODO: how does it work?
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
  instance: {
    key: "clues",
    schema: z.object({
      corner: CornerId.describe("Quadruple position"),
      digits: z
        .array(z.number())
        .max(4)
        .describe("Quadruple digits (up to 4 digits)"),
    }),
    getAffectedCells: ({ corner }) => [
      corner,
      { ...corner, row: corner.row - 1 },
      { ...corner, column: corner.column - 1 },
      { row: corner.row - 1, column: corner.column - 1 },
    ],
  },
  main: {
    title: "Quadruples",
    description:
      "Every digit in a circle has to be assigned to one of the surrounding cells.",
    defaultConfig: {
      style: {
        singleLine: false,
      },
    },
  },
});

export const LookAndSayCagesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.LookAndSayCages,
  schema: z.object({
    style: CageStyle,
  }),
  instance: Cage(z.string().describe("")),
  main: {
    title: "Look-and-say cages",
    description:
      "Read the clue out loud, which describes the nature of the cage. E.g. 1522 says there is “one five and two two(s)” in the cage.",
    defaultConfig: {
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

// Allows specifying only one region
export const DifferentValuesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.DifferentValues,
  schema: z.object({
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
  schema: LineConstraintConfigBase,
  instance: LineInstance,
  main: {
    title: "Renban lines",
    description:
      "Every renban line contains a set of consecutive digits in any order, without repeats",
    defaultConfig: {
      style: {
        color: "#f067f0",
        thickness: 0.15,
      },
    },
  },
});

export const PalindromeConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Palindrome,
  schema: LineConstraintConfigBase,
  instance: LineInstance,
  main: {
    title: "Palindromes",
    description:
      "Digits on a palindrome line read the same forwards and backwards",
    defaultConfig: {
      style: {
        color: "#bbbbbb",
        thickness: 0.15,
      },
    },
  },
});

export const BetweenLinesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.BetweenLines,
  schema: LineWithEndPointsConfigBase,
  instance: LineInstance,
  main: {
    title: "Between lines",
    description:
      "Digits along a between line must be between the digits on the circled ends of the line.",
    defaultConfig: {
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
      singleRegionTotals: z.boolean().describe(""),
    }),
  ),
  instance: LineInstance,
  main: {
    title: "Region sum lines",
    description:
      "For each line, digits on the line have an equal sum N within each box it passes through.",
    defaultConfig: {
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
  schema: LineConstraintConfigBase,
  instance: LineInstance,
  main: {
    title: "Sequence lines",
    description:
      "Sequence lines contain digits in order with a constant difference. E.g. 1-2-3, 2-5-8 or even 3-3-3...",
    defaultConfig: {
      style: {
        color: "#aaaaaa",
        thickness: 0.15,
      },
    },
  },
});

export const LockoutLinesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.LockoutLines,
  schema: LineWithEndPointsConfigBase,
  instance: LineInstance,
  main: {
    title: "Lockout lines",
    description:
      "Digits along a lockout line must not be between the digits on the circled ends of the line, which have a difference of at least 4",
    defaultConfig: {
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
  instance: {
    key: "bulbsWithArrows",
    schema: z.object({
      bulbCells: z.array(CellId).describe(""), // Important: index 0 is 1s, index 1 is 10s, etc
      arrows: z.array(z.array(CellId)).describe(""),
    }),
    getAffectedCells: ({ bulbCells, arrows }) => [
      ...bulbCells,
      ...arrows.flat(),
    ],
  },
  main: {
    title: "Arrows",
    description:
      "Numbers along an arrow sum to the number shown in the circled cells.",
    defaultConfig: {
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
  schema: LineWithEndPointsConfigBase,
  instance: LineInstance,
  main: {
    title: "Double arrows",
    description:
      "The sum of the digits along a ‘double arrow’ line is equal to the sum of the digits in the circles at either end of the line.",
    defaultConfig: {
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
  instance: {
    key: "clues",
    schema: z
      .object({
        value: z.number().optional().describe(""),
        outerCell: OuterCellId,
        diagonal: DiagonalType,
      })
      .describe(""),
    getAffectedCells: ({ outerCell }) => [outerCell],
  },
  main: {
    title: "Little killers",
    description:
      "Digits along marked diagonals sum to the number indicated outside the grid.",
    defaultConfig: {
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
    style: OuterClueStyle,
  }),
  instance: OuterClue(z.number().describe("")),
  main: {
    title: "Sandwich sums",
    description:
      "Digits between 1 and 9 in the indicated row or column must sum to the indicated value",
    defaultConfig: {
      style: {
        color: "#000000ff",
      },
    },
  },
});

export const XSumsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.XSums,
  schema: z.object({
    style: OuterClueStyle,
  }),
  instance: OuterClue(z.number().optional().describe("")),
  main: {
    title: "X-sums",
    description:
      "Clues at the edge of the grid show the sum of the first X digits, where X is the first seen digit.",
    defaultConfig: {
      style: {
        color: "#000000",
      },
    },
  },
});

export const SkyscrapersConstraint = new SudokuMakerConstraint({
  type: ConstraintType.Skyscrapers,
  schema: z.object({
    style: OuterClueStyle,
  }),
  instance: OuterClue(z.number().optional().describe("")),
  main: {
    title: "Skyscrapers",
    description:
      "Each digit in the grid represents the height of a building in its cell. Taller buildings obstruct the view of shorter ones behind them. Clues outside the grid give the number of buildings visible from that vantage point in the clue's row or column.",
    defaultConfig: {
      style: {
        color: "#000000ff",
      },
    },
  },
});

export const NumberedRoomsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.NumberedRooms,
  schema: z.object({
    style: OuterClueStyle,
  }),
  instance: OuterClue(z.number().optional().describe("")),
  main: {
    title: "Numbered rooms",
    description:
      "Clues outside the grid indicate the digit which has to be placed in the Nth cell in the corresponding direction, where N is the digit placed in the first cell in that direction.",
    defaultConfig: {
      style: {
        color: "#000000",
      },
    },
  },
});

export const RowIndexerConstraint = new SudokuMakerConstraint({
  type: ConstraintType.RowIndexer,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  instance: SingleCellInstance,
  main: {
    title: "Row indexers",
    description:
      "A marked cell in row X indicates the row where X appears in the column.",
    defaultConfig: {
      style: {
        color: "#0080f955",
      },
    },
  },
});

export const ColumnIndexerConstraint = new SudokuMakerConstraint({
  type: ConstraintType.ColumnIndexer,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  instance: SingleCellInstance,
  main: {
    title: "Column indexers",
    description:
      "A marked cell in column X indicates the column where X appears in the row.",
    defaultConfig: {
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
    definition: CustomConstraintDefinition,
    input: CustomConstraintConfigInput,
    style: CustomConstraintConfigStyle,
  }),
  main: {
    title: "Custom constraint",
    description: "Code your own constraints in Javascript",
    defaultConfig: {
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
    style: CageStyle,
  }),
  instance: Cage(z.string().describe("")),
  main: {
    title: "Cosmetic cages",
    description:
      "Place cages without any (programmed) logic associated with them.",
    defaultConfig: {
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
    symbols: z.array(CosmeticSymbol).describe(""),
  }),
  main: {
    title: "Cosmetic symbols",
    description:
      "Place symbols (squares, circles, text, arrows) without any (programmed) logic associated with them.",
    defaultConfig: {
      symbols: [],
    },
  },
});

export const FogLightsConstraint = new SudokuMakerConstraint({
  type: ConstraintType.FogLights,
  instance: {
    ...SingleCellInstance,
    key: "lightCells",
  },
  main: {
    title: "Fog lights",
    description:
      "Place lights which clear fog at the start. Fog: cover cells with fog that only clears when a correct digit is placed.",
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
const describeDigitGroups = (groups: number[][]) =>
  groups.length ? groups.map((digits) => digits.join("")).join("/") : "???";

const getDigitGroups: SpecGetter<
  number[][],
  [number, (digit: number) => number]
> = ({ minDigit, maxDigit }, count, getGroup) => {
  const groups = Array(count)
    .fill(undefined)
    .map(() => [] as number[]);

  for (let digit = minDigit; digit <= maxDigit; digit++) {
    groups[getGroup(digit)].push(digit);
  }

  return groups;
};

const getEntropicGroups: SpecGetter<number[][]> = (spec) => {
  const { minDigit, digitCount } = spec;

  const limit1 = minDigit + Math.round(digitCount / 3);
  const limit2 = minDigit + Math.round((digitCount * 2) / 3);

  return getDigitGroups(spec, 3, (digit) =>
    digit <= limit1 ? 0 : digit <= limit2 ? 1 : 2,
  );
};

const getModuloGroups: SpecGetter<number[][], [number]> = (spec, count) => {
  return getDigitGroups(spec, count, (digit) => digit % count);
};

const areSameDigitGroups = (
  group1List: number[][],
  group2List: number[][],
): boolean => {
  if (group1List.length !== group2List.length) {
    return false;
  }

  const group1 = group1List
    .map((digits) => DigitSetSchema.decode(digits))
    .sort();
  const group2 = group2List
    .map((digits) => DigitSetSchema.decode(digits))
    .sort();
  return group1.every((value, index) => value === group2[index]);
};

const GlobalEntropyParamsSchema = z.object({
  groups: z.array(DigitSetSchema).describe("digit groups"),
});
export const GlobalEntropyConstraint = new SudokuMakerConstraint({
  type: ConstraintType.GlobalEntropy,
  schema: GlobalEntropyParamsSchema,
  main: {
    title: "Global 2x2 groups",
    getTitle: ({ groups }) => `Global ${describeDigitGroups(groups)}`,
    description:
      "Every 2x2 square of cells must contain at least 1 digit of every specified group.",
    paramsSchema: GlobalEntropyParamsSchema,
  },
  options: [
    {
      title: "Global entropy",
      description:
        "Every 2x2 square of cells must contain a low digit (1,2,3), middle digit (4,5,6) and high digit (7,8,9).",
      defaultConfig: (spec) => ({
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
  instance: {
    ...LineInstance,
    key: "thermometers",
  },
  main: {
    title: "Thermometers",
    description:
      "Numbers on a thermometer strictly increase as they move away from the bulb",
    defaultConfig: {
      slow: false,
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
        slow: true,
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
  schema: z.intersection(LineConstraintConfigBase, WhisperParamsSchema),
  instance: LineInstance,
  main: {
    title: "Whisper lines",
    getTitle: ({ minDifference }) => `${minDifference}-whisper lines`,
    description:
      "Two cells connected by a whisper line must have a difference of at least defined number.",
    paramsSchema: WhisperParamsSchema,
    defaultConfig: (_spec, { minDifference }) => ({
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

const EntropyLinesParamsSchema = z.object({
  groups: z.array(DigitSetSchema).describe("digit groups"),
});
export const EntropyLinesConstraint = new SudokuMakerConstraint({
  type: ConstraintType.EntropyLines,
  schema: z.intersection(LineConstraintConfigBase, EntropyLinesParamsSchema),
  instance: LineInstance,
  main: {
    title: "Digit group lines",
    getTitle: ({ groups }) => `${describeDigitGroups(groups)} lines`,
    description:
      "Every N consecutive cells along a line must contain exactly 1 digit of every specified group, where N is the amount of groups.",
    paramsSchema: EntropyLinesParamsSchema,
    defaultConfig: (_spec, { groups }) => ({
      groups,
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

const AllConstraintsMap = {
  [ConstraintType.SudokuRules]: SudokuRulesConstraint,
  [ConstraintType.Givens]: GivensConstraint,
  [ConstraintType.Regions]: RegionsConstraint,
  [ConstraintType.DiagonalMinus]: DiagonalMinusConstraint,
  [ConstraintType.DiagonalPlus]: DiagonalPlusConstraint,
  [ConstraintType.Antiking]: AntikingConstraint,
  [ConstraintType.Antiknight]: AntiknightConstraint,
  [ConstraintType.DisjointGroups]: DisjointGroupsConstraint,
  [ConstraintType.Nonconsecutive]: NonconsecutiveConstraint,
  [ConstraintType.Even]: EvenConstraint,
  [ConstraintType.Odd]: OddConstraint,
  [ConstraintType.Maximum]: MaximumConstraint,
  [ConstraintType.Minimum]: MinimumConstraint,
  [ConstraintType.Difference]: DifferenceConstraint,
  [ConstraintType.Ratio]: RatioConstraint,
  [ConstraintType.XV]: XVConstraint,
  [ConstraintType.KillerCages]: KillerCagesConstraint,
  [ConstraintType.Clone]: CloneConstraint,
  [ConstraintType.Quadruple]: QuadrupleConstraint,
  [ConstraintType.LookAndSayCages]: LookAndSayCagesConstraint,
  [ConstraintType.DifferentValues]: DifferentValuesConstraint,
  [ConstraintType.Renban]: RenbanConstraint,
  [ConstraintType.Palindrome]: PalindromeConstraint,
  [ConstraintType.BetweenLines]: BetweenLinesConstraint,
  [ConstraintType.RegionSumLine]: RegionSumLineConstraint,
  [ConstraintType.Sequence]: SequenceConstraint,
  [ConstraintType.LockoutLines]: LockoutLinesConstraint,
  [ConstraintType.Arrow]: ArrowConstraint,
  [ConstraintType.DoubleArrow]: DoubleArrowConstraint,
  [ConstraintType.LittleKillers]: LittleKillersConstraint,
  [ConstraintType.SandwichSums]: SandwichSumsConstraint,
  [ConstraintType.XSums]: XSumsConstraint,
  [ConstraintType.Skyscrapers]: SkyscrapersConstraint,
  [ConstraintType.NumberedRooms]: NumberedRoomsConstraint,
  [ConstraintType.RowIndexer]: RowIndexerConstraint,
  [ConstraintType.ColumnIndexer]: ColumnIndexerConstraint,
  [ConstraintType.Custom]: CustomConstraint,
  [ConstraintType.CosmeticLine]: CosmeticLineConstraint,
  [ConstraintType.CosmeticCage]: CosmeticCageConstraint,
  [ConstraintType.CosmeticSymbol]: CosmeticSymbolConstraint,
  [ConstraintType.FogLights]: FogLightsConstraint,
  [ConstraintType.FogTriggers]: FogTriggersConstraint,
  [ConstraintType.GlobalEntropy]: GlobalEntropyConstraint,
  [ConstraintType.Thermometer]: ThermometerConstraint,
  [ConstraintType.Whisper]: WhisperConstraint,
  [ConstraintType.EntropyLines]: EntropyLinesConstraint,
};
export const AllConstraints = Object.values(AllConstraintsMap);
export const getConstraintByTypeName = (typeName: string) =>
  AllConstraints.find((constraint) => constraint.typeName === typeName)!;
export const getConstraintByConfig = <TypeT extends ConstraintType>(
  config: ConstraintConfigByType<TypeT>,
) =>
  getConstraintByTypeName(config.type) as unknown as SudokuMakerConstraint<
    TypeT,
    z.ZodType<unknown, ConstraintConfigByType<TypeT>>,
    any,
    any,
    any
  >;

export const ConstraintConfig = z
  .union(AllConstraints.map(({ schema }) => schema))
  .meta({
    id: "ConstraintConfig",
    description: "Constraint configuration",
  });

export const ConstraintSchema = z
  .intersection(
    z.object({
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
    }),
    z.codec(
      z.object({
        constraintMetadata: z
          .object({
            defaultName: z
              .string()
              .describe(
                'Constraint name, adjusted to the specific constraint\'s config - this value would be displayed if the "name" field omitted',
              ),
            description: z
              .string()
              .describe(
                "Constraint description, adjusted to the specific constraint's config",
              ),
          })
          .optional()
          .readonly()
          .describe(
            "Constraint metadata adjusted to the specific constraint's config (more accurate than the general constraint info from the schema)",
          ),
      }),
      z.object({}),
      {
        encode: () => ({}),
        decode: () => ({}),
      },
    ),
  )
  .describe("");

export type ConstraintConfigByType<TypeT extends ConstraintType> = z.input<
  (typeof AllConstraintsMap)[TypeT]["schema"]
>;

export type ConstraintByType<TypeT extends ConstraintType> = Omit<
  z.input<typeof ConstraintSchema>,
  "config"
> & { config: ConstraintConfigByType<TypeT> };
