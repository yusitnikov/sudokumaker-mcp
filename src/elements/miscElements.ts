import { ElementType } from "./ElementType";
import {
  CellId,
  CornerId,
  DiagonalType,
  DigitSetSchema,
  formatCellNotation,
  OuterCellId,
  parseCellNotation,
} from "../SudokuMakerSchemas";
import { BasicShapeStyle } from "./BasicShapeStyle";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";
import { areSameDigitGroups, describeDigitGroups, getEntropicGroups, getModuloGroups } from "./digitGroups";

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
    description: "The arrangement of digits in a part of the sudoku must be the same elsewhere",
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
      corner: CornerId.describe(
        'The corner where the 4 quadruple digits are written, as the "rXcY" coordinates of the cell below-right of that corner ' +
          '(e.g. "r3c4" names the corner shared by r2c3, r2c4, r3c3 and r3c4).',
      ),
      digits: z.array(z.number()).max(4).describe("Quadruple digits (up to 4 digits)"),
    }),
    getAffectedCells: ({ corner }) => {
      const { row, column } = parseCellNotation(corner);

      return [
        corner,
        formatCellNotation({ row: row - 1, column }),
        formatCellNotation({ row, column: column - 1 }),
        formatCellNotation({ row: row - 1, column: column - 1 }),
      ];
    },
  },
  main: {
    title: "Quadruples",
    description: "Every digit in a circle has to be assigned to one of the surrounding cells.",
    defaultConfig: {
      style: {
        singleLine: false,
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
    getAffectedCells: ({ bulbCells, arrows }) => [...bulbCells, ...arrows.flat()],
  },
  main: {
    title: "Arrows",
    description: "Numbers along an arrow sum to the number shown in the circled cells.",
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
    description: "Digits along marked diagonals sum to the number indicated outside the grid.",
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

const GlobalEntropyParamsSchema = z.object({
  groups: z.array(DigitSetSchema).describe("digit groups"),
});
export const GlobalEntropyElement = new SudokuMakerElement({
  type: ElementType.GlobalEntropy,
  schema: GlobalEntropyParamsSchema,
  main: {
    title: "Global 2x2 groups",
    getTitle: ({ groups }) => `Global ${describeDigitGroups(groups)}`,
    description: "Every 2x2 square of cells must contain at least 1 digit of every specified group.",
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
      detect: ({ groups }, spec) => areSameDigitGroups(groups, getEntropicGroups(spec)),
    },
    {
      title: "Global modulo-3",
      description:
        "Every 2x2 square of cells must contain a digit from (1,4,7), a digit from (2,5,8) and a digit from (3,6,9).",
      defaultConfig: (spec) => ({
        groups: getModuloGroups(spec, 3),
      }),
      detect: ({ groups }, spec) => areSameDigitGroups(groups, getModuloGroups(spec, 3)),
    },
  ],
});

enum CustomFogClearingPatternNative {
  // noinspection JSUnusedGlobalSymbols
  self,
  orthogonalNeighbors,
  diagonalNeighbors,
  knightsMove,
  row,
  column,
}

const CustomFogClearingPattern = z.enum(CustomFogClearingPatternNative).describe("");

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
