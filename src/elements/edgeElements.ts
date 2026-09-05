import { EdgeId } from "../SudokuMakerSchemas";
import type { ClueDescriptor } from "./ClueDescriptor";
import { z } from "zod";
import { ElementType } from "./ElementType";
import { SudokuMakerElement } from "./SudokuMakerElement";

const EdgeClue = <ValueT extends z.ZodType>(ValueType: ValueT) => {
  const schema = z.object({
    value: ValueType,
    edge: EdgeId,
  });

  return {
    key: "clues",
    schema,
    getAffectedCells: ({ edge }) => edge,
  } as ClueDescriptor<"clues", typeof schema>;
};

export const DifferenceElement = new SudokuMakerElement({
  type: ElementType.Difference,
  schema: z.object({
    negative: z
      .array(z.number())
      .describe(
        "Differences that are forbidden between any two orthogonally adjacent cells not joined by a difference dot.",
      ),
    overrideNegativeRatios: z
      .boolean()
      .describe("Whether this element's negative constraint also excludes the ratio element's negative ratios."),
  }),
  clue: EdgeClue(z.number().describe("The required difference between the two cells; defaults to 1 if omitted.")),
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
    negative: z
      .array(z.number())
      .describe("Ratios that are forbidden between any two orthogonally adjacent cells not joined by a ratio dot."),
    overrideNegativeDifferences: z
      .boolean()
      .describe(
        "Whether this element's negative constraint also excludes the difference element's negative differences.",
      ),
  }),
  clue: EdgeClue(z.number().describe("The required ratio between the two cells; defaults to 2 if omitted.")),
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
    negative: z
      .array(z.number())
      .describe("Sums that are forbidden between any two orthogonally adjacent cells not marked with X or V."),
  }),
  clue: EdgeClue(z.number().describe("The required sum: 10 for X, 5 for V.")),
  main: {
    title: "XV",
    description: "Cells joined by an X or V must sum to 10 (X) or 5 (V).",
    defaultConfig: {
      negative: [],
    },
  },
});
