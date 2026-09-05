import { CellId } from "../SudokuMakerSchemas";
import { ElementType } from "./ElementType";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";
import { customComponentsTopicName, customConstraintsTopicName } from "../client/tools/docs/topicNames";

const CustomComponentSchema = z
  .object({
    type: z.literal("code"),
    name: z.string().describe("The component instance's name, as passed to the component's constructor."),
    code: z
      .string()
      .describe(
        `The component's JavaScript implementation; read the \`${customComponentsTopicName}\` docs topic first, its API cannot be guessed.`,
      ),
  })
  .describe(
    `A custom component: a reusable piece of constraint logic; read the \`${customComponentsTopicName}\` docs topic before writing or editing one.`,
  );

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
      initializationCode: z
        .string()
        .describe(
          `JavaScript code that adds components to the puzzle; read the \`${customConstraintsTopicName}\` docs topic first, its API and conventions cannot be guessed.`,
        ),
      customComponents: z
        .array(CustomComponentSchema)
        .describe("Custom components used by the initialization code, beyond the standard ones."),
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
      }) => ({
        name,
        isGlobal: !input.some(({ id }) => id === "groups"),
        initializationCode: code,
        customComponents: components,
      }),
      decode: ({ name, isGlobal, initializationCode, customComponents }) => ({
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
        style: {},
      }),
    },
  ),
  clue: {
    key: "inputGroups",
    internalPath: ["input", "groups"] as const,
    schema: z.object({
      cells: z.array(CellId),
      value: z
        .string()
        .describe(
          "Free-form parameter string, interpreted by the initialization code according to its own convention. May be empty if the constraint needs no parameter.",
        ),
    }),
    getAffectedCells: ({ cells }) => cells,
  },
  main: {
    title: "Custom constraint",
    getTitle: (config) => config.name || "Custom constraint",
    description: "Code your own constraints in Javascript",
    defaultConfig: {
      name: "New constraint",
      isGlobal: true,
      initializationCode: "",
      customComponents: [],
    },
  },
});
