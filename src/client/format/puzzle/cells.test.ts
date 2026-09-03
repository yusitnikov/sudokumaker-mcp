import { describe, expect, test } from "vitest";
import { cellsDescriptor } from "./cells";
import { ObjectNode } from "../ObjectNode";
import { PuzzleTypeNative, type CellPublic } from "../../../SudokuMakerSchemas";
import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import { type ElementPublic, RegionsElement } from "../../../SudokuMakerElement";

const cell = (overrides: Partial<CellPublic> = {}): CellPublic => ({
  coords: "r1c1",
  given: false,
  candidates: [],
  cornerPencilMarks: [],
  colors: [],
  valid: true,
  ...overrides,
});

const root: PuzzlePublic = {
  name: "",
  author: "",
  comment: "",
  id: 0,
  creationTimestamp: 0,
  messages: {},
  exportSettings: {
    sudokuPad: {
      showColorMarks: false,
      showDigits: false,
      solution: { type: "grid" },
      useIncompleteGridAsSolution: false,
    },
  },
  spec: {
    type: PuzzleTypeNative.Sudoku,
    minDigit: 1,
    maxDigit: 9,
    digitCount: 9,
    size: { width: 3, height: 1 },
  },
  cells: [],
  allElements: [],
};

const node = (value: CellPublic[][], puzzleRoot: PuzzlePublic = root) =>
  new ObjectNode(value, () => undefined, "cells", puzzleRoot, cellsDescriptor);

const diff = (from: CellPublic[][], to: CellPublic[][], puzzleRoot: PuzzlePublic = root) =>
  cellsDescriptor.diff!(node(from, puzzleRoot), node(to, puzzleRoot));

const format = (value: CellPublic[][], puzzleRoot: PuzzlePublic = root) =>
  cellsDescriptor.format(node(value, puzzleRoot), { collapse: false });

/** `root`, but with a 2x2 checkerboard Regions element - every adjacent pair of cells differs, so
 * every column and the one row boundary get a separator. */
const rootWithCheckerboardRegions: PuzzlePublic = {
  ...root,
  allElements: [
    {
      id: 1,
      enabled: true,
      solverIgnored: false,
      config: {
        type: RegionsElement.typeName,
        regions: [
          [1, 2],
          [3, 4],
        ],
      },
    } as ElementPublic,
  ],
};

describe("cells diff, column alignment", () => {
  test("pads both the '-' and '+' rows to a shared column width, even when the 'from' token is wider than every 'to' token", () => {
    // r1c2's "from" token (37^24#1, 7 chars) is wider than any token either row has after the
    // change - column widths must be computed from both grids, not just `to`, or padEnd can't
    // widen the shorter "to" token enough to keep column 3 aligned between the two lines.
    const from = [
      [
        cell({ coords: "r1c1", given: true, value: 1 }),
        cell({
          coords: "r1c2",
          candidates: [3, 7],
          cornerPencilMarks: [2, 4],
          colors: [1],
        }),
        cell({ coords: "r1c3" }),
      ],
    ];
    const to = [
      [
        cell({ coords: "r1c1" }),
        cell({
          coords: "r1c2",
          candidates: [7],
          cornerPencilMarks: [4],
          colors: [1],
        }),
        cell({ coords: "r1c3" }),
      ],
    ];

    expect(diff(from, to)).toBe(
      [
        "",
        "r1 - *1 37^24#1 .",
        "r1 + .  7^4#1   .",
        "Colors: 1=red",
        "Read `grid-notation` topic for how to read this, DO NOT GUESS!",
      ].join("\n"),
    );
  });

  test("pads the '+' and '-' rows just as wide when the 'to' token is the wider one instead (the mirror case)", () => {
    const from = [[cell({ coords: "r1c1", given: true, value: 1 }), cell({ coords: "r1c2" })]];
    const to = [
      [
        cell({ coords: "r1c1" }),
        cell({
          coords: "r1c2",
          candidates: [5, 9],
          cornerPencilMarks: [3],
          colors: [2],
        }),
      ],
    ];

    expect(diff(from, to)).toBe(
      [
        "",
        "r1 - *1 .",
        "r1 + .  59^3#2",
        "Colors: 2=orange",
        "Read `grid-notation` topic for how to read this, DO NOT GUESS!",
      ].join("\n"),
    );
  });

  test("keeps column widths uniform across every row of a multi-row grid, even when only one row changed", () => {
    // Row 1 never changes, but its "." tokens still have to be padded to the same column widths
    // as row 2's wide "from" token - widths come from the whole grid, not just the changed row.
    const from = [
      [cell({ coords: "r1c1" }), cell({ coords: "r1c2" }), cell({ coords: "r1c3" })],
      [
        cell({ coords: "r2c1" }),
        cell({
          coords: "r2c2",
          candidates: [3, 7],
          cornerPencilMarks: [2, 4],
          colors: [1],
        }),
        cell({ coords: "r2c3" }),
      ],
    ];
    const to = [
      [cell({ coords: "r1c1" }), cell({ coords: "r1c2" }), cell({ coords: "r1c3" })],
      [cell({ coords: "r2c1" }), cell({ coords: "r2c2" }), cell({ coords: "r2c3" })],
    ];

    expect(diff(from, to)).toBe(
      [
        "",
        "r2 - . 37^24#1 .",
        "r2 + . .       .",
        "Colors: 1=red",
        "Read `grid-notation` topic for how to read this, DO NOT GUESS!",
      ].join("\n"),
    );
  });

  test("keeps the region '| ' separator aligned to the fixed-width columns too", () => {
    // regions [[1,2],[3,4]] put every adjacent cell in a different region, so col 1/col 2 always
    // get a "| " separator. Col 1's widest token is the "from" side's 7-char candidate/mark/color
    // token; col 2 is always ".". The separator must sit right after col 1's padding on both lines.
    const from = [
      [
        cell({
          coords: "r1c1",
          candidates: [3, 7],
          cornerPencilMarks: [2, 4],
          colors: [1],
        }),
        cell({ coords: "r1c2" }),
      ],
      [cell({ coords: "r2c1" }), cell({ coords: "r2c2" })],
    ];
    const to = [
      [cell({ coords: "r1c1" }), cell({ coords: "r1c2" })],
      [cell({ coords: "r2c1" }), cell({ coords: "r2c2" })],
    ];

    // "Colors: 1=red" still appears even though `to` has no colors left - the legend has to cover
    // whatever a "-" line can still print, and color 1 is only visible on the removed side here.
    expect(diff(from, to, rootWithCheckerboardRegions)).toBe(
      [
        "",
        "r1 - 37^24#1| .",
        "r1 + .      | .",
        "Colors: 1=red",
        "Read `grid-notation` topic for how to read this, DO NOT GUESS!",
      ].join("\n"),
    );
  });
});

describe("cells format, column alignment", () => {
  test("pads every row of a single grid to the widest token in each column", () => {
    const grid = [
      [cell({ coords: "r1c1", given: true, value: 1 }), cell({ coords: "r1c2" })],
      [
        cell({ coords: "r2c1" }),
        cell({
          coords: "r2c2",
          candidates: [5, 9],
          cornerPencilMarks: [3],
          colors: [2],
        }),
      ],
    ];

    expect(format(grid)).toBe(
      [
        "",
        "  *1 .",
        "  .  59^3#2",
        "  Colors: 2=orange",
        "  Read `grid-notation` topic for how to read this, DO NOT GUESS!",
      ].join("\n"),
    );
  });

  test("keeps the region '| ' and '---' separators aligned to the fixed-width columns", () => {
    // regions [[1,2],[3,4]]: every column boundary and the one row boundary differ, so both
    // separator kinds appear. Col 1's width (7, from the candidate/mark/color token) has to carry
    // through to the "---" row separator's total width too: (7 + 1) + 1*2 = 10 dashes.
    const grid = [
      [
        cell({
          coords: "r1c1",
          candidates: [3, 7],
          cornerPencilMarks: [2, 4],
          colors: [1],
        }),
        cell({ coords: "r1c2" }),
      ],
      [cell({ coords: "r2c1" }), cell({ coords: "r2c2" })],
    ];

    expect(format(grid, rootWithCheckerboardRegions)).toBe(
      [
        "",
        "  37^24#1| .",
        "  ----------",
        "  .      | .",
        "  Colors: 1=red",
        "  Read `grid-notation` topic for how to read this, DO NOT GUESS!",
      ].join("\n"),
    );
  });
});
