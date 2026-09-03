import { CellSchema } from "../SudokuMakerSchemas";
import { z } from "zod";

/**
 * Copy cell contents from one internal puzzle object to another.
 *
 * Use it for
 * @see ToolImplementation.updatePuzzle()
 */
export const copyCells = (
  from: z.output<typeof CellSchema>[],
  to: z.output<typeof CellSchema>[],
) => {
  for (const [index, cell] of from.entries()) {
    Object.assign(to[index], cell);
  }
};
