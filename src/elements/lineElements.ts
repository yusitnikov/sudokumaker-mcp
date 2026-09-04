import { ElementType } from "./ElementType";
import { LineStyle } from "./LineStyle";
import { BasicShapeStyle } from "./BasicShapeStyle";
import type { ClueDescriptor } from "./ClueDescriptor";
import { CellId, DigitSetSchema } from "../SudokuMakerSchemas";
import { type SpecGetter, SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";
import { areSameDigitGroups, describeDigitGroups, getEntropicGroups, getModuloGroups } from "./digitGroups";

const LineWithEndPointsStyle = z
  .object({
    lines: LineStyle,
    endPoints: BasicShapeStyle,
  })
  .meta({
    description: "",
  });

const LineClueSchema = z.array(CellId).meta({
  description: "The list of all cells that lines goes through",
});

const getLineClue = <KeyT extends string>(key: KeyT): ClueDescriptor<KeyT, typeof LineClueSchema> => ({
  key,
  schema: LineClueSchema,
  getAffectedCells: (cells) => cells,
});

const LineClue = getLineClue("lines");

const LineElementConfigBase = z
  .object({
    style: LineStyle,
  })
  .meta({
    description: "",
  });

const LineWithEndPointsConfigBase = z
  .object({
    style: LineWithEndPointsStyle,
  })
  .meta({
    description: "",
  });

export const RenbanElement = new SudokuMakerElement({
  type: ElementType.Renban,
  schema: LineElementConfigBase,
  clue: LineClue,
  main: {
    title: "Renban lines",
    description: "Every renban line contains a set of consecutive digits in any order, without repeats",
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
    description: "Digits on a palindrome line read the same forwards and backwards",
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
    description: "Digits along a between line must be between the digits on the circled ends of the line.",
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
    description: "For each line, digits on the line have an equal sum N within each box it passes through.",
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

const getGermanWhisperDiff: SpecGetter<number> = ({ digitCount }) => Math.ceil(digitCount / 2);

const getDutchWhisperDiff: SpecGetter<number> = (spec) => getGermanWhisperDiff(spec) - 1;

const WhisperParamsSchema = z.object({
  minDifference: z.number().describe("Two cells connected by a whisper line must have this minimal difference"),
});

export const WhisperElement = new SudokuMakerElement({
  type: ElementType.Whisper,
  schema: z.intersection(LineElementConfigBase, WhisperParamsSchema),
  clue: LineClue,
  main: {
    title: "Whisper lines",
    getTitle: ({ minDifference }) => `${minDifference}-whisper lines`,
    description: "Two cells connected by a whisper line must have a difference of at least defined number.",
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
      detect: ({ minDifference }, spec) => minDifference === getGermanWhisperDiff(spec),
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
      detect: ({ minDifference }, spec) => minDifference === getDutchWhisperDiff(spec),
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
      detect: ({ groups }, spec) => areSameDigitGroups(groups, getEntropicGroups(spec)),
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
      detect: ({ groups }, spec) => areSameDigitGroups(groups, getModuloGroups(spec, 3)),
    },
    {
      title: "Parity (odd/even) lines",
      description: "Every pair of consecutive cells along a parity line must contain an even and odd digit.",
      defaultConfig: (spec) => ({
        groups: getModuloGroups(spec, 2),
        style: {
          color: "#ff6666",
          thickness: 0.15,
        },
      }),
      detect: ({ groups }, spec) => areSameDigitGroups(groups, getModuloGroups(spec, 2)),
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
  clue: getLineClue("thermometers"),
  main: {
    title: "Thermometers",
    description: "Numbers on a thermometer strictly increase as they move away from the bulb",
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
      description: "Numbers on a slow thermometer increase or stay the same as they move away from the bulb",
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
