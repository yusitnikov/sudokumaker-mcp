import { EdgeId } from "../SudokuMakerSchemas";
import type { ClueDescriptor } from "./ClueDescriptor";
import { z } from "zod";
import { ElementType } from "./ElementType";
import { SudokuMakerElement } from "./SudokuMakerElement";

const EdgeClue = <ValueT extends z.ZodType>(ValueType: ValueT) => {
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
