import { ElementType } from "./ElementType";
import { CellId } from "../SudokuMakerSchemas";
import type { ClueDescriptor } from "./ClueDescriptor";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";
import { CssHexColor } from "./CssHexColor";

const CageStyle = z.object({
  cage: z
    .object({
      color: CssHexColor,
    })
    .describe("Style of the cage's dashed outline"),
  text: z
    .object({
      color: CssHexColor,
    })
    .describe("Style of the cage's clue text"),
});

const Cage = <ValueT extends z.ZodType>(ValueType: ValueT) => {
  const schema = z.object({
    value: ValueType,
    cells: z.array(CellId).describe("Cage cells"),
  });

  return {
    key: "cages",
    schema,
    getAffectedCells: ({ cells }) => cells,
  } satisfies ClueDescriptor<"cages", typeof schema>;
};

export const KillerCagesElement = new SudokuMakerElement({
  type: ElementType.KillerCages,
  schema: z.object({
    style: CageStyle,
  }),
  clue: Cage(z.number().describe("Sum the cage's digits must add up to")),
  main: {
    title: "Killer cages",
    description: "Digits in cages must sum to the number in the top-left corner and cannot repeat",
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

export const LookAndSayCagesElement = new SudokuMakerElement({
  type: ElementType.LookAndSayCages,
  schema: z.object({
    style: CageStyle,
  }),
  clue: Cage(z.string().describe('Look-and-say reading of the cage\'s digits, e.g. "1522"')),
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

export const CosmeticCageElement = new SudokuMakerElement({
  type: ElementType.CosmeticCage,
  schema: z.object({
    style: CageStyle,
  }),
  clue: Cage(z.string().describe("Text shown in the cage's corner")),
  main: {
    title: "Cosmetic cages",
    description: "Place cages without any (programmed) logic associated with them.",
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
