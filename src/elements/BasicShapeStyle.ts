import { z } from "zod";
import { CssHexColor } from "./CssHexColor";

const Stroke = z.object({
  color: CssHexColor,
  thickness: z.number().describe("Stroke thickness, in cell-size units."),
});

export const BasicShapeStyle = z.object({
  size: z.number().describe("Overall size of the drawn shape (e.g. marker diameter), in cell-size units."),
  fill: CssHexColor,
  stroke: Stroke,
});
