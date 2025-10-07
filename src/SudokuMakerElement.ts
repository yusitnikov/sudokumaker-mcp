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
  CellsArray,
} from "./SudokuMakerSchemas";
import { z } from "zod";
import { SmartDiscriminatedUnion } from "./SmartDiscriminatedUnion.ts";

// region Core
type PublicConfigT<
  TypeT extends ElementType,
  ConfigSchemaT extends z.ZodType,
  ClueKeyT extends string | never,
  ClueConfigSchemaT extends z.ZodType | never,
> = z.input<ConfigSchemaT> & {
  type: (typeof ElementType)[TypeT];
} & (ClueKeyT extends string
    ? ClueConfigSchemaT extends z.ZodType
      ? { [K in ClueKeyT]: z.input<ClueConfigSchemaT>[] }
      : {}
    : {});
type InternalConfigT<
  TypeT extends ElementType,
  ConfigSchemaT extends z.ZodType,
  ClueKeyT extends string | never,
  ClueConfigSchemaT extends z.ZodType | never,
> = z.output<ConfigSchemaT> & { type: TypeT } & (ClueKeyT extends string
    ? ClueConfigSchemaT extends z.ZodType
      ? { [K in ClueKeyT]: z.output<ClueConfigSchemaT>[] }
      : {}
    : {});

interface ClueDescriptor<
  ClueKeyT extends string,
  ClueConfigSchemaT extends z.ZodType,
> {
  key: ClueKeyT;
  schema: ClueConfigSchemaT;
  getAffectedCells: (clue: z.input<ClueConfigSchemaT>) => CellCoords[];
}

export class SudokuMakerElement<
  TypeT extends ElementType,
  ConfigSchemaT extends z.ZodType,
  ClueKeyT extends string | never,
  ClueConfigSchemaT extends z.ZodType | never,
  ParamsSchemaT extends z.ZodObject,
> {
  public readonly typeId: TypeT;
  public readonly typeName: (typeof ElementType)[TypeT];
  public readonly schema: z.ZodType<
    InternalConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
    PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>
  >;
  public readonly globalSchema?: ConfigSchemaT;
  public readonly clue?: ClueDescriptor<ClueKeyT, ClueConfigSchemaT>;
  public readonly main: SudokuMakerElementOption<
    PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
    ClueKeyT,
    ParamsSchemaT
  >;
  public readonly options: SecondarySudokuMakerElementOption<
    PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
    ClueKeyT
  >[];

  constructor({
    type,
    schema,
    clue,
    main,
    options = [],
  }: {
    type: TypeT;
    schema?: ConfigSchemaT;
    clue?: ClueDescriptor<ClueKeyT, ClueConfigSchemaT>;
    main: SudokuMakerElementOption<
      PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
      ClueKeyT,
      ParamsSchemaT
    >;
    options?: SecondarySudokuMakerElementOption<
      PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
      ClueKeyT
    >[];
  }) {
    const cluesKey = clue?.key;
    const clueSchema = clue?.schema;

    this.typeId = type;
    this.typeName = ElementType[type];
    this.schema = z
      .intersection(
        schema ?? (z.object({}) as unknown as ConfigSchemaT),
        z.object({
          type: z.codec(z.literal(this.typeName), z.literal(type), {
            encode: () => this.typeName,
            decode: () => type,
          }),
          ...(cluesKey && clueSchema
            ? {
                [cluesKey]: z
                  .array(clueSchema)
                  .describe("Array of element's clues"),
              }
            : {}),
        }),
      )
      .meta({
        id: `${this.typeName}Config`,
        description: `"${main.title}" element config. Element description: ${main.description}`,
      }) as any;
    this.globalSchema = schema;
    this.clue = clue;
    this.main = main;
    this.options = options;
  }

  getElementMetadata(
    config: PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
    spec: z.input<typeof Spec>,
  ) {
    let detectedOption: SudokuMakerElementOption<
      PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
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

export interface SudokuMakerElementOption<
  ConfigT,
  ClueKeyT extends string | never,
  ParamsSchemaT extends z.ZodObject = z.ZodObject<{}>,
> {
  title: string;
  getTitle?: ConfigGetter<ConfigT, string>;
  description: string;
  getDescription?: SpecGetter<string>;
  paramsSchema?: ParamsSchemaT;
  defaultConfig?:
    | Omit<ConfigT, "type" | ClueKeyT>
    | SpecGetter<Omit<ConfigT, "type" | ClueKeyT>, [z.input<ParamsSchemaT>]>;
}

export interface SecondarySudokuMakerElementOption<
  ConfigT,
  ClueKeyT extends string | never,
  ParamsSchemaT extends z.ZodObject = z.ZodObject<{}>,
> extends SudokuMakerElementOption<ConfigT, ClueKeyT, ParamsSchemaT> {
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

export enum ElementType {
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

  // Placeable single-cell elements
  Even = 100,
  Odd,
  Maximum,
  Minimum,

  // Placeable cell-pair elements
  Difference = 200,
  Ratio,
  XV,

  // Simple placeable elements
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

  // Outside of grid clued elements
  LittleKillers = 500,
  SandwichSums,
  XSums,
  Skyscrapers,
  NumberedRooms,

  // Other elements
  RowIndexer = 600,
  ColumnIndexer,

  // Custom
  Custom = 1000,

  // Cosmetics
  CosmeticLine = 2000,
  CosmeticCage = 2001,
  CosmeticSymbol = 2002,

  // Complex placeable elements
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

const LineClueSchema = z.array(CellId).meta({
  id: "LineCells",
  description: "The list of all cells that lines goes through",
});
const LineClue: ClueDescriptor<"lines", typeof LineClueSchema> = {
  key: "lines",
  schema: LineClueSchema,
  getAffectedCells: (cells) => cells,
};

export const LineElementConfigBase = z
  .object({
    style: LineStyle,
  })
  .meta({
    id: "LineElementConfigBase",
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
  } as ClueDescriptor<"clues", typeof schema>;
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
  } as ClueDescriptor<"clues", typeof schema>;
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
  } as ClueDescriptor<"cages", typeof schema>;
};
// endregion

// region Single-option elements
export const SudokuRulesElement = new SudokuMakerElement({
  type: ElementType.SudokuRules,
  schema: z.object({
    areas: z.array(CellsRectangle).optional().describe(""),
  }),
  main: {
    title: "Rows and columns",
    description: "All rows and columns must contain different digits.",
  },
});

export const GivensElement = new SudokuMakerElement({
  type: ElementType.Givens,
  main: {
    title: "Given digits",
    description:
      "This elements doesn't do anything, just indicates that the setter wants to place some given digits. " +
      "The actual given digits are being placed by editing the grid cells.",
  },
});

export const RegionsElement = new SudokuMakerElement({
  type: ElementType.Regions,
  schema: z.object({
    regions: CellsArray(
      // Transform internal zero-based region index to the visible region number
      z
        .codec(z.number(), z.number(), {
          encode: (value) => value + 1,
          decode: (value) => value - 1,
        })
        .describe(
          "Region number assigned to the cell. " +
            "Cells that have the same index are part of the same region. " +
            "0 means no region.",
        ),
    ),
  }),
  main: {
    title: "Regions",
    description: "Digits cannot repeat in marked regions.",
    defaultConfig: {
      // TODO: construct dynamically based on spec
      regions: [
        [1, 1, 1, 2, 2, 2, 3, 3, 3],
        [1, 1, 1, 2, 2, 2, 3, 3, 3],
        [1, 1, 1, 2, 2, 2, 3, 3, 3],
        [4, 4, 4, 5, 5, 5, 6, 6, 6],
        [4, 4, 4, 5, 5, 5, 6, 6, 6],
        [4, 4, 4, 5, 5, 5, 6, 6, 6],
        [7, 7, 7, 8, 8, 8, 9, 9, 9],
        [7, 7, 7, 8, 8, 8, 9, 9, 9],
        [7, 7, 7, 8, 8, 8, 9, 9, 9],
      ],
    },
  },
});

export const DiagonalMinusElement = new SudokuMakerElement({
  type: ElementType.DiagonalMinus,
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

export const DiagonalPlusElement = new SudokuMakerElement({
  type: ElementType.DiagonalPlus,
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

export const AntikingElement = new SudokuMakerElement({
  type: ElementType.Antiking,
  main: {
    title: "Antiking",
    description:
      "Cells seperated by a king’s move in chess cannot have the same digit.",
  },
});

export const AntiknightElement = new SudokuMakerElement({
  type: ElementType.Antiknight,
  main: {
    title: "Antiknight",
    description:
      "Cells seperated by a knight’s move in chess cannot have the same digit.",
  },
});

export const DisjointGroupsElement = new SudokuMakerElement({
  type: ElementType.DisjointGroups,
  main: {
    title: "Disjoint groups",
    description:
      "Cells with the same position within the boxes contain all the numbers 1 to 9",
  },
});

export const NonconsecutiveElement = new SudokuMakerElement({
  type: ElementType.Nonconsecutive,
  main: {
    title: "Non-consecutive",
    description:
      "Cells that are orthogonally adjacent cannot contain consecutive digits.",
  },
});

const SingleCellClue: ClueDescriptor<"cells", typeof CellId> = {
  key: "cells" as const,
  schema: CellId,
  getAffectedCells: (cell) => [cell],
};

export const EvenElement = new SudokuMakerElement({
  type: ElementType.Even,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
        size: z.number().describe(""),
      })
      .describe(""),
  }),
  clue: SingleCellClue,
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

export const OddElement = new SudokuMakerElement({
  type: ElementType.Odd,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
        size: z.number().describe(""),
      })
      .describe(""),
  }),
  clue: SingleCellClue,
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

export const MaximumElement = new SudokuMakerElement({
  type: ElementType.Maximum,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  clue: SingleCellClue,
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

export const MinimumElement = new SudokuMakerElement({
  type: ElementType.Minimum,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  clue: SingleCellClue,
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

export const DifferenceElement = new SudokuMakerElement({
  type: ElementType.Difference,
  schema: z.object({
    negative: z.array(z.number()).describe(""),
    overrideNegativeRatios: z.boolean().describe(""),
  }),
  clue: EdgeClue(z.number().describe("")),
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

export const RatioElement = new SudokuMakerElement({
  type: ElementType.Ratio,
  schema: z.object({
    negative: z.array(z.number()).describe(""),
    overrideNegativeDifferences: z.boolean().describe(""),
  }),
  clue: EdgeClue(z.number().describe("")),
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

export const XVElement = new SudokuMakerElement({
  type: ElementType.XV,
  schema: z.object({
    negative: z.array(z.number()).describe(""),
  }),
  clue: EdgeClue(z.number().describe("")),
  main: {
    title: "XV",
    description: "Cells joined by an X or V must sum to 10 (X) or 5 (V).",
    defaultConfig: {
      negative: [],
    },
  },
});

export const KillerCagesElement = new SudokuMakerElement({
  type: ElementType.KillerCages,
  schema: z.object({
    style: CageStyle,
  }),
  clue: Cage(z.number().describe("")),
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

export const CloneElement = new SudokuMakerElement({
  type: ElementType.Clone,
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

export const QuadrupleElement = new SudokuMakerElement({
  type: ElementType.Quadruple,
  schema: z.object({
    style: z
      .object({
        singleLine: z.boolean().describe(""),
      })
      .describe(""),
  }),
  clue: {
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

export const LookAndSayCagesElement = new SudokuMakerElement({
  type: ElementType.LookAndSayCages,
  schema: z.object({
    style: CageStyle,
  }),
  clue: Cage(z.string().describe("")),
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
export const DifferentValuesElement = new SudokuMakerElement({
  type: ElementType.DifferentValues,
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

export const RenbanElement = new SudokuMakerElement({
  type: ElementType.Renban,
  schema: LineElementConfigBase,
  clue: LineClue,
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

export const PalindromeElement = new SudokuMakerElement({
  type: ElementType.Palindrome,
  schema: LineElementConfigBase,
  clue: LineClue,
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

export const BetweenLinesElement = new SudokuMakerElement({
  type: ElementType.BetweenLines,
  schema: LineWithEndPointsConfigBase,
  clue: LineClue,
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

export const RegionSumLineElement = new SudokuMakerElement({
  type: ElementType.RegionSumLine,
  schema: z.intersection(
    LineElementConfigBase,
    z.object({
      singleRegionTotals: z.boolean().describe(""),
    }),
  ),
  clue: LineClue,
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

export const SequenceElement = new SudokuMakerElement({
  type: ElementType.Sequence,
  schema: LineElementConfigBase,
  clue: LineClue,
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

export const LockoutLinesElement = new SudokuMakerElement({
  type: ElementType.LockoutLines,
  schema: LineWithEndPointsConfigBase,
  clue: LineClue,
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

export const ArrowElement = new SudokuMakerElement({
  type: ElementType.Arrow,
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
  clue: {
    key: "bulbsWithArrows",
    schema: z.object({
      bulbCells: z
        .array(CellId)
        .describe(
          "Cells occupied by the arrow's bulb. " +
            'Usually the bulb is only one cell (and it\'s called just "circle"), ' +
            "but it could take several orthogonally connected cells, " +
            "meaning that the digits in these cells read as a multi-digit number.",
        ), // Important: index 0 is 1s, index 1 is 10s, etc
      arrows: z
        .array(z.array(CellId))
        .describe(
          "Arrow lines attached to the bulb. " +
            "Every arrow line array MUST include one of the bulb cells as its first element, followed by the cells along the arrow path. " +
            "The bulb cell itself is not counted towards the sum - only the subsequent cells are. " +
            "If multiple arrows attached to the bulb, digits on each arrow line sum to the number in the bulb INDIVIDUALLY.",
        ),
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

export const DoubleArrowElement = new SudokuMakerElement({
  type: ElementType.DoubleArrow,
  schema: LineWithEndPointsConfigBase,
  clue: LineClue,
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

export const LittleKillersElement = new SudokuMakerElement({
  type: ElementType.LittleKillers,
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
  clue: {
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

export const SandwichSumsElement = new SudokuMakerElement({
  type: ElementType.SandwichSums,
  schema: z.object({
    style: OuterClueStyle,
  }),
  clue: OuterClue(z.number().describe("")),
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

export const XSumsElement = new SudokuMakerElement({
  type: ElementType.XSums,
  schema: z.object({
    style: OuterClueStyle,
  }),
  clue: OuterClue(z.number().optional().describe("")),
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

export const SkyscrapersElement = new SudokuMakerElement({
  type: ElementType.Skyscrapers,
  schema: z.object({
    style: OuterClueStyle,
  }),
  clue: OuterClue(z.number().optional().describe("")),
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

export const NumberedRoomsElement = new SudokuMakerElement({
  type: ElementType.NumberedRooms,
  schema: z.object({
    style: OuterClueStyle,
  }),
  clue: OuterClue(z.number().optional().describe("")),
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

export const RowIndexerElement = new SudokuMakerElement({
  type: ElementType.RowIndexer,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  clue: SingleCellClue,
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

export const ColumnIndexerElement = new SudokuMakerElement({
  type: ElementType.ColumnIndexer,
  schema: z.object({
    style: z
      .object({
        color: z.string().describe(""),
      })
      .describe(""),
  }),
  clue: SingleCellClue,
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

export const CustomConstraintInputGroupsSchema = z.array(
  z.object({
    cells: z.array(CellId),
    value: z.string(),
  }),
);

export const CustomComponentSchema = z
  .object({
    type: z.literal("code"),
    name: z.string(),
    code: z.string(),
  })
  .describe("");

export const CustomElement = new SudokuMakerElement({
  type: ElementType.Custom,
  schema: z.codec(
    z.object({
      name: z.string(),
      isGlobal: z
        .boolean()
        .describe(
          "Is it a global constraint? " +
            "Global constraints don't have input groups, they iterate over the cells in the initialization code instead. " +
            "Local constraints use input groups to define which cells they apply to.",
        ),
      inputGroups: CustomConstraintInputGroupsSchema,
      initializationCode: z.string(),
      customComponents: z.array(CustomComponentSchema),
    }),
    z.object({
      definition: z.object({
        name: z.string(),
        input: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            params: z.object({ type: z.literal("raw") }),
          }),
        ),
        backend: z.object({
          type: z.literal("code"),
          code: z.string(),
        }),
        components: z.array(CustomComponentSchema),
      }),
      input: z.object({
        groups: CustomConstraintInputGroupsSchema.optional(),
      }),
      style: z.record(z.string(), z.any()),
    }),
    {
      encode: ({
        definition: {
          name,
          input,
          backend: { code },
          components,
        },
        input: { groups = [] },
      }) => ({
        name,
        isGlobal: !input.some(({ id }) => id === "groups"),
        inputGroups: CustomConstraintInputGroupsSchema.decode(groups),
        initializationCode: code,
        customComponents: components,
      }),
      decode: ({
        name,
        isGlobal,
        inputGroups,
        initializationCode,
        customComponents,
      }) => ({
        definition: {
          name,
          input: isGlobal
            ? []
            : [
                {
                  id: "groups",
                  label: "Groups",
                  params: { type: "raw" as const },
                },
              ],
          backend: {
            type: "code" as const,
            code: initializationCode,
          },
          components: customComponents,
        },
        input: isGlobal
          ? {}
          : { groups: CustomConstraintInputGroupsSchema.encode(inputGroups) },
        style: {},
      }),
    },
  ),
  main: {
    title: "Custom constraint",
    getTitle: (config) => config.name || "Custom constraint",
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

export const CosmeticLineElement = new SudokuMakerElement({
  type: ElementType.CosmeticLine,
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

export const CosmeticCageElement = new SudokuMakerElement({
  type: ElementType.CosmeticCage,
  schema: z.object({
    style: CageStyle,
  }),
  clue: Cage(z.string().describe("")),
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

export const CosmeticSymbolElement = new SudokuMakerElement({
  type: ElementType.CosmeticSymbol,
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

export const FogLightsElement = new SudokuMakerElement({
  type: ElementType.FogLights,
  clue: {
    ...SingleCellClue,
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

export const FogTriggersElement = new SudokuMakerElement({
  type: ElementType.FogTriggers,
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

// region Multi-option elements
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
export const GlobalEntropyElement = new SudokuMakerElement({
  type: ElementType.GlobalEntropy,
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

export const ThermometerElement = new SudokuMakerElement({
  type: ElementType.Thermometer,
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
  clue: {
    ...LineClue,
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

export const WhisperElement = new SudokuMakerElement({
  type: ElementType.Whisper,
  schema: z.intersection(LineElementConfigBase, WhisperParamsSchema),
  clue: LineClue,
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
export const EntropyLinesElement = new SudokuMakerElement({
  type: ElementType.EntropyLines,
  schema: z.intersection(LineElementConfigBase, EntropyLinesParamsSchema),
  clue: LineClue,
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

const AllElementsMap = {
  [ElementType.SudokuRules]: SudokuRulesElement,
  [ElementType.Givens]: GivensElement,
  [ElementType.Regions]: RegionsElement,
  [ElementType.DiagonalMinus]: DiagonalMinusElement,
  [ElementType.DiagonalPlus]: DiagonalPlusElement,
  [ElementType.Antiking]: AntikingElement,
  [ElementType.Antiknight]: AntiknightElement,
  [ElementType.DisjointGroups]: DisjointGroupsElement,
  [ElementType.Nonconsecutive]: NonconsecutiveElement,
  [ElementType.Even]: EvenElement,
  [ElementType.Odd]: OddElement,
  [ElementType.Maximum]: MaximumElement,
  [ElementType.Minimum]: MinimumElement,
  [ElementType.Difference]: DifferenceElement,
  [ElementType.Ratio]: RatioElement,
  [ElementType.XV]: XVElement,
  [ElementType.KillerCages]: KillerCagesElement,
  [ElementType.Clone]: CloneElement,
  [ElementType.Quadruple]: QuadrupleElement,
  [ElementType.LookAndSayCages]: LookAndSayCagesElement,
  [ElementType.DifferentValues]: DifferentValuesElement,
  [ElementType.Renban]: RenbanElement,
  [ElementType.Palindrome]: PalindromeElement,
  [ElementType.BetweenLines]: BetweenLinesElement,
  [ElementType.RegionSumLine]: RegionSumLineElement,
  [ElementType.Sequence]: SequenceElement,
  [ElementType.LockoutLines]: LockoutLinesElement,
  [ElementType.Arrow]: ArrowElement,
  [ElementType.DoubleArrow]: DoubleArrowElement,
  [ElementType.LittleKillers]: LittleKillersElement,
  [ElementType.SandwichSums]: SandwichSumsElement,
  [ElementType.XSums]: XSumsElement,
  [ElementType.Skyscrapers]: SkyscrapersElement,
  [ElementType.NumberedRooms]: NumberedRoomsElement,
  [ElementType.RowIndexer]: RowIndexerElement,
  [ElementType.ColumnIndexer]: ColumnIndexerElement,
  [ElementType.Custom]: CustomElement,
  [ElementType.CosmeticLine]: CosmeticLineElement,
  [ElementType.CosmeticCage]: CosmeticCageElement,
  [ElementType.CosmeticSymbol]: CosmeticSymbolElement,
  [ElementType.FogLights]: FogLightsElement,
  [ElementType.FogTriggers]: FogTriggersElement,
  [ElementType.GlobalEntropy]: GlobalEntropyElement,
  [ElementType.Thermometer]: ThermometerElement,
  [ElementType.Whisper]: WhisperElement,
  [ElementType.EntropyLines]: EntropyLinesElement,
};
export const AllElements = Object.values(AllElementsMap);
export const getElementByTypeName = (typeName: string) =>
  AllElements.find((element) => element.typeName === typeName)!;
export const getElementByConfig = <TypeT extends ElementType>(
  config: ElementConfigByType<TypeT>,
) =>
  getElementByTypeName(config.type) as unknown as SudokuMakerElement<
    TypeT,
    z.ZodType<unknown, ElementConfigByType<TypeT>>,
    any,
    any,
    any
  >;

export const ElementConfigSchema = SmartDiscriminatedUnion(
  "type",
  AllElements.map(({ schema }) => schema),
).meta({
  id: "ElementConfig",
  description: "Element configuration",
});

export const ElementSchema = z
  .intersection(
    z.object({
      id: z
        .number()
        .optional()
        .describe("Element ID, must be unique within the puzzle"),
      name: z
        .string()
        .optional()
        .describe(
          "Element name. Leave it empty to use the default (recommended when there is only one element of the type).",
        ),
      enabled: z
        .boolean()
        .describe(
          "Is the element enabled? Disabling an element will hide its visual clues from the grid and exclude its logic from the solver, which is the same as if the element doesn't exist. Useful to temporarily exclude the element from the puzzle without deleting it from the list.",
        ),
      solverIgnored: z
        .boolean()
        .describe(
          "Ignore the element's logic in the solver while still showing the visuals in the grid. Use it to make element cosmetic-only, or if you want to temporarily ignore its logic.",
        ),
      config: ElementConfigSchema,
    }),
    z.codec(
      z.object({
        elementMetadata: z
          .object({
            defaultName: z
              .string()
              .describe(
                'Element name, adjusted to the specific element\'s config - this value would be displayed if the "name" field omitted',
              ),
            description: z
              .string()
              .describe(
                "Element description, adjusted to the specific element's config",
              ),
          })
          .optional()
          .readonly()
          .describe(
            "Element metadata adjusted to the specific element's config (more accurate than the general element info from the schema)",
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

export type ElementConfigByType<TypeT extends ElementType> = z.input<
  (typeof AllElementsMap)[TypeT]["schema"]
>;

export type ElementByType<TypeT extends ElementType> = Omit<
  z.input<typeof ElementSchema>,
  "config"
> & { config: ElementConfigByType<TypeT> };
