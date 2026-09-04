import { CellId } from "../SudokuMakerSchemas";
import { ElementType } from "./ElementType";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";

export const CustomConstraintInputGroupsSchema = z.array(
  z.object({
    cells: z.array(CellId),
    value: z.string(),
  }),
);

export const CustomComponentSchema = z
  .object({
    type: z.literal("code"),
    name: z.string(),
    code: z.string(),
  })
  .describe("");

export const CustomElement = new SudokuMakerElement({
  type: ElementType.Custom,
  schema: z.codec(
    z.object({
      name: z.string(),
      isGlobal: z
        .boolean()
        .describe(
          "Is it a global constraint? " +
            "Global constraints don't have input groups, they iterate over the cells in the initialization code instead. " +
            "Local constraints use input groups to define which cells they apply to.",
        ),
      inputGroups: CustomConstraintInputGroupsSchema,
      initializationCode: z.string(),
      customComponents: z.array(CustomComponentSchema),
    }),
    z.object({
      definition: z.object({
        name: z.string(),
        input: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            params: z.object({ type: z.literal("raw") }),
          }),
        ),
        backend: z.object({
          type: z.literal("code"),
          code: z.string(),
        }),
        components: z.array(CustomComponentSchema),
      }),
      input: z.object({
        groups: CustomConstraintInputGroupsSchema.optional(),
      }),
      style: z.record(z.string(), z.any()),
    }),
    {
      encode: ({
        definition: {
          name,
          input,
          backend: { code },
          components,
        },
        input: { groups = [] },
      }) => ({
        name,
        isGlobal: !input.some(({ id }) => id === "groups"),
        inputGroups: CustomConstraintInputGroupsSchema.decode(groups),
        initializationCode: code,
        customComponents: components,
      }),
      decode: ({ name, isGlobal, inputGroups, initializationCode, customComponents }) => ({
        definition: {
          name,
          input: isGlobal
            ? []
            : [
                {
                  id: "groups",
                  label: "Groups",
                  params: { type: "raw" as const },
                },
              ],
          backend: {
            type: "code" as const,
            code: initializationCode,
          },
          components: customComponents,
        },
        input: isGlobal ? {} : { groups: CustomConstraintInputGroupsSchema.encode(inputGroups) },
        style: {},
      }),
    },
  ),
  main: {
    title: "Custom constraint",
    getTitle: (config) => config.name || "Custom constraint",
    description: "Code your own constraints in Javascript",
    defaultConfig: {
      name: "New constraint",
      isGlobal: true,
      inputGroups: [],
      initializationCode: "",
      customComponents: [],
    },
  },
});
