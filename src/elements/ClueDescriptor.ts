import type { CellNotation } from "../SudokuMakerSchemas";
import { z } from "zod";

export interface ClueDescriptor<
  ClueKeyT extends string,
  ClueConfigSchemaT extends z.ZodType,
  InternalPathT extends readonly string[] = [ClueKeyT],
> {
  key: ClueKeyT;
  internalPath?: InternalPathT;
  schema: ClueConfigSchemaT;
  getAffectedCells: (clue: z.input<ClueConfigSchemaT>) => CellNotation[];
}
