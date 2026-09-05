import { ElementType } from "./ElementType";
import { DiagonalType, OuterCellId } from "../SudokuMakerSchemas";
import type { ClueDescriptor } from "./ClueDescriptor";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";
import { CssHexColor } from "./CssHexColor";

const OuterClueStyle = z.object({
  color: CssHexColor,
});

const OuterClue = <ValueT extends z.ZodType>(ValueType: ValueT) => {
  const schema = z.object({
    value: ValueType,
    outerCell: OuterCellId,
    diagonal: DiagonalType.optional().describe(
      "If set, the clue applies to the diagonal starting at outerCell instead of its row or column.",
    ),
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
  clue: OuterClue(z.number().optional().describe("the sum")),
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
  clue: OuterClue(z.number().optional().describe("the skyscraper clue")),
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
  clue: OuterClue(z.number().optional().describe("the numbered room clue")),
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
