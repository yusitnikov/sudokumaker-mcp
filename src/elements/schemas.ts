import { SmartDiscriminatedUnion } from "../SmartDiscriminatedUnion";
import { z } from "zod";
import { AllElements } from "./AllElements";

export const ElementConfigSchema = SmartDiscriminatedUnion(
  "type",
  AllElements.map(({ schema }) => schema),
).meta({
  description: "Element configuration",
});

export const ElementMainSchema = z.object({
  id: z.number().optional().describe("Element ID, must be unique within the puzzle"),
  name: z
    .string()
    .optional()
    .describe(
      "Element name. Leave it empty to use the default (recommended when there is only one element of the type).",
    ),
  enabled: z
    .boolean()
    .describe(
      "Is the element enabled? Disabling an element will hide its visual clues from the grid and exclude its logic from the solver, " +
        "which is the same as if the element doesn't exist. " +
        "Useful to temporarily exclude the element from the puzzle without deleting it from the list.",
    ),
  solverIgnored: z
    .boolean()
    .describe(
      "Ignore the element's logic in the solver while still showing the visuals in the grid. " +
        "Use it to make element cosmetic-only, or if you want to temporarily ignore its logic.",
    ),
  config: ElementConfigSchema,
});

export const ElementSchema = z
  .intersection(
    ElementMainSchema,
    z.codec(
      z.object({
        elementMetadata: z
          .object({
            defaultName: z
              .string()
              .describe(
                'Element name, adjusted to the specific element\'s config - this value would be displayed if the "name" field omitted',
              ),
            description: z.string().describe("Element description, adjusted to the specific element's config"),
          })
          .optional()
          .readonly()
          .describe(
            "Element metadata adjusted to the specific element's config (more accurate than the general element info from the schema)",
          ),
      }),
      z.object({}),
      {
        encode: () => ({}),
        decode: () => ({}),
      },
    ),
  )
  .describe("");
