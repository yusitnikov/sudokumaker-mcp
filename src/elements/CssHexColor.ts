import { z } from "zod";

export const CssHexColor = z
  .string()
  .regex(/^#[a-f0-9]{3,8}$/i)
  .describe('Hex color code: "#rrggbb", or "#rrggbbaa" to include alpha.');
