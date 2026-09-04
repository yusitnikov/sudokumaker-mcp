import { z } from "zod";
import { CellsArray, CellSchema, Spec } from "./SudokuMakerSchemas";

import { ElementSchema } from "./elements/schemas";

export const PuzzleSchema = z
  .intersection(
    z.codec(
      z.object({
        allElements: z.array(ElementSchema).describe("The list of all elements (aka constraints, clues) of the puzzle"),
      }),
      z.object({
        allConstraints: z.array(ElementSchema),
      }),
      {
        encode: ({ allConstraints }) => ({
          allElements: allConstraints.map((element) => ElementSchema.decode(element)),
        }),
        decode: ({ allElements }) => ({
          allConstraints: allElements.map((element) => ElementSchema.encode(element)),
        }),
      },
    ),
    z.object({
      author: z.string().describe("Puzzle author (aka setter)"),
      cells: CellsArray(CellSchema),
      comment: z
        .string()
        .describe(
          "Puzzle comment provided by the setter. Usually it just describes the rules of the puzzle, but there's no limitation",
        ),
      creationTimestamp: z.number().readonly().describe("Timestamp of when the puzzle was created, in milliseconds"),
      exportSettings: z
        .object({
          sudokuPad: z
            .object({
              showColorMarks: z.boolean().describe(""),
              showDigits: z.boolean().describe(""),
              solution: z
                .object({
                  // TODO: it's usually "grid", what else could be here?
                  type: z.string().describe(""),
                })
                .describe(""),
              useIncompleteGridAsSolution: z.boolean().describe(""),
            })
            .describe("Settings that control how the puzzle will be exported from SudokuMaker to SudokuPad"),
        })
        .describe("Settings that control how the puzzle will be exported from SudokuMaker to other platforms"),
      id: z
        .number()
        .readonly()
        .describe(
          "Puzzle ID. Every new puzzle gets a new unique ID, but then the ID is preserved when reloading the puzzle or duplicating a browser tab with a puzzle",
        ),
      messages: z.object({
        completion: z
          .string()
          .optional()
          .describe("Message that will be displayed to the solver after completing the puzzle successfully"),
      }),
      name: z.string().describe("Puzzle name"),
      spec: Spec,
    }),
  )
  .meta({
    description: "Full puzzle object",
  });
export type PuzzlePublic = z.input<typeof PuzzleSchema>;
