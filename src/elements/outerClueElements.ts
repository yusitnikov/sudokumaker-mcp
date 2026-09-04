import { ElementType } from "./ElementType";
import { DiagonalType, OuterCellId } from "../SudokuMakerSchemas";
import type { ClueDescriptor } from "./ClueDescriptor";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";

const OuterClueStyle = z
  .object({
    color: z.string().describe(""),
  })
  .meta({
    description: "",
  });

const OuterClue = <ValueT extends z.ZodType>(ValueType: ValueT) => {
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

export const SandwichSumsElement = new SudokuMakerElement({
  type: ElementType.SandwichSums,
  schema: z.object({
    style: OuterClueStyle,
  }),
  clue: OuterClue(z.number().optional().describe("sandwich sum")),
  main: {
    title: "Sandwich sums",
    description: "Digits between 1 and 9 in the indicated row or column must sum to the indicated value",
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
    description: "Clues at the edge of the grid show the sum of the first X digits, where X is the first seen digit.",
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
