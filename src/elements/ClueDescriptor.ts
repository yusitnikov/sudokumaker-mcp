import type { CellNotation } from "../SudokuMakerSchemas";
import { z } from "zod";

export interface ClueDescriptor<ClueKeyT extends string, ClueConfigSchemaT extends z.ZodType> {
  key: ClueKeyT;
  schema: ClueConfigSchemaT;
  getAffectedCells: (clue: z.input<ClueConfigSchemaT>) => CellNotation[];
}
