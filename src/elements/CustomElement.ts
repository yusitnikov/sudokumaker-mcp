import { CellId } from "../SudokuMakerSchemas";
import { ElementType } from "./ElementType";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { z } from "zod";
import { customComponentsTopicName, customConstraintsTopicName } from "../client/tools/docs/topicNames";
import { editInitializationCodeToolName, updateElementToolName } from "../client/tools/toolNames";

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
      // TODO: don't allow editing `initializationCode` and `customComponents` via `update_element`
      initializationCode: z
        .string()
        .describe(
          `JavaScript code that adds components to the puzzle; read the \`${customConstraintsTopicName}\` docs topic first, its API and conventions cannot be guessed. ` +
            `To change part of it without resending the whole body, use \`${editInitializationCodeToolName}\` instead of resending this field.`,
        ),
      /*
       * TODO: keying the components by name makes a rename diff as one component removed and another added,
       *       since the diff matches record entries by key.
       *       Teach the formatting layer to recognize an entry whose code stayed the same
       *       under a new key as a rename, and render it as one.
       */
      customComponents: z
        .record(
          z.string().describe("The component's name, as passed to its constructor in the initialization code."),
          z
            .string()
            .describe(
              `The component's JavaScript implementation; read the \`${customComponentsTopicName}\` docs topic first, its API cannot be guessed.`,
            ),
        )
        .describe(
          `
Custom components used by the initialization code, beyond the standard ones, keyed by the component's name.
Read the \`${customComponentsTopicName}\` docs topic before writing or editing one.
Use dedicated tools to modify the custom components, NOT the \`${updateElementToolName}\` tool.
          `.trim(),
        ),
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
        components: z.array(
          z.object({
            type: z.literal("code"),
            name: z.string(),
            code: z.string(),
          }),
        ),
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
      }) => {
        const customComponents: Record<string, string> = {};
        for (const component of components) {
          customComponents[component.name] = component.code;
        }

        return {
          name,
          isGlobal: !input.some(({ id }) => id === "groups"),
          initializationCode: code,
          customComponents,
        };
      },
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
          components: Object.entries(customComponents).map(([name, code]) => ({
            type: "code" as const,
            name,
            code,
          })),
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
      customComponents: {},
    },
  },
});
