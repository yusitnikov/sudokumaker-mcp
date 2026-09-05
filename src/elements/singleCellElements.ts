import { ElementType } from "./ElementType";
import type { ClueDescriptor } from "./ClueDescriptor";
import { CellId } from "../SudokuMakerSchemas";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";
import { CssHexColor } from "./CssHexColor";

const getSingleCellClue = <KeyT extends string>(key: KeyT): ClueDescriptor<KeyT, typeof CellId> => ({
  key,
  schema: CellId,
  getAffectedCells: (cell) => [cell],
});

const SingleCellClue = getSingleCellClue("cells");

export const EvenElement = new SudokuMakerElement({
  type: ElementType.Even,
  schema: z.object({
    style: z.object({
      color: CssHexColor,
      size: z.number().describe("Side length of the square, in cell-size units."),
    }),
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
    style: z.object({
      color: CssHexColor,
      size: z.number().describe("Diameter of the circle, in cell-size units."),
    }),
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
    style: z.object({
      color: CssHexColor,
    }),
  }),
  clue: SingleCellClue,
  main: {
    title: "Maximum",
    description: "Cells with this constraint are greater than all adjacent cells without this constraint.",
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
    style: z.object({
      color: CssHexColor,
    }),
  }),
  clue: SingleCellClue,
  main: {
    title: "Minimum",
    description: "Cells with this constraint are smaller than all adjacent cells without this constraint.",
    defaultConfig: {
      style: {
        color: "#00000033",
      },
    },
  },
});

export const RowIndexerElement = new SudokuMakerElement({
  type: ElementType.RowIndexer,
  schema: z.object({
    style: z.object({
      color: CssHexColor,
    }),
  }),
  clue: SingleCellClue,
  main: {
    title: "Row indexers",
    description: "A marked cell in row X indicates the row where X appears in the column.",
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
    style: z.object({
      color: CssHexColor,
    }),
  }),
  clue: SingleCellClue,
  main: {
    title: "Column indexers",
    description: "A marked cell in column X indicates the column where X appears in the row.",
    defaultConfig: {
      style: {
        color: "#f9000055",
      },
    },
  },
});

export const FogLightsElement = new SudokuMakerElement({
  type: ElementType.FogLights,
  clue: getSingleCellClue("lightCells"),
  main: {
    title: "Fog lights",
    description:
      "Place lights which clear fog at the start. Fog: cover cells with fog that only clears when a correct digit is placed.",
  },
});
