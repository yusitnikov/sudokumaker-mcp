import { z } from "zod";
import { CssHexColor } from "./CssHexColor";

export const LineStyle = z.object({
  color: CssHexColor,
  thickness: z.number().describe("Line thickness, in cell-size units."),
});
