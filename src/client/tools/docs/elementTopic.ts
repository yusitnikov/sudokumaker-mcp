import { z } from "zod";
import { AllElements } from "../../../SudokuMakerElement";
import { updateElementToolName } from "../toolNames";
import { elementsTopicName, elementTopicPrefix } from "./topicNames";

/** Renders the `params` schema of one main/option variant, when it declares one, as an inline JSON block. */
const renderParams = (paramsSchema: z.ZodObject | undefined): string[] =>
  paramsSchema
    ? [
        "Creating this variant takes a `params` object:",
        "```json",
        ...JSON.stringify(
          z.toJSONSchema(paramsSchema, { io: "input" }),
          null,
          2,
        ).split("\n"),
        "```",
      ]
    : [];

/**
 * Renders the content of an `element:<TypeName>` topic, or `undefined` if `name` isn't one.
 * An unknown type name still returns content (not `undefined`): a message naming the bad type.
 */
export const getElementTopic = (name: string): string | undefined => {
  if (!name.startsWith(elementTopicPrefix)) {
    return undefined;
  }

  const typeName = name.slice(elementTopicPrefix.length);
  const element = AllElements.find((element) => element.typeName === typeName);
  if (!element) {
    return `Unknown element type \`${typeName}\`. See the \`${elementsTopicName}\` topic for the exact type names.`;
  }

  const { globalSchema, clue, main, options } = element;

  const lines: string[] = [
    `# Element type \`${typeName}\``,
    "",
    "## Variants",
    "",
  ];

  lines.push(
    `"${main.title}" — ${main.description}`,
    ...renderParams(main.paramsSchema),
    "",
  );

  if (options.length > 0) {
    lines.push(
      "This type also covers these variants (same config shape, different default values):",
      "",
      ...options.flatMap((option) => [
        `- **${option.title}** — ${option.description}`,
        ...renderParams(option.paramsSchema).map((line) => `  ${line}`),
      ]),
      "",
    );
  }

  for (const { header, contents } of element.extraDocs ?? []) {
    lines.push(`## ${header}`, "", contents, "");
  }

  if (globalSchema) {
    lines.push(
      "## Config",
      "",
      "```json",
      JSON.stringify(z.toJSONSchema(globalSchema, { io: "input" }), null, 2),
      "```",
      "",
    );
  } else {
    lines.push("This type has no config fields of its own.", "");
  }

  if (clue) {
    lines.push(
      "## Clues",
      "",
      `Clues live in the \`${clue.key}\` array of the element's config. Each clue:`,
      "",
      "```json",
      JSON.stringify(z.toJSONSchema(clue.schema, { io: "input" }), null, 2),
      "```",
      "",
    );
  } else if (globalSchema) {
    /*
     * No `clue` descriptor means either "one implicit clue"
     * (e.g. SudokuRules' `areas`, DiagonalPlus' `style`)
     * or "a collection with no clue-array wiring" (e.g. Regions' whole grid mapping).
     * Nothing in the schema shape tells the two apart:
     * SudokuRules.areas and FogTriggers.triggers are both optional arrays,
     * yet one is auxiliary scoping and the other is the element's entire content.
     * Rather than guess and risk asserting "one clue" where it's false,
     * say only what's true of every case: the fields are set as a whole via `update_element`.
     */
    lines.push(
      `No separate clue array — the whole config above is set at once via \`${updateElementToolName}\`.`,
      "",
    );
  } else {
    lines.push(
      "No clues and no config — the element's mere presence in the puzzle is the whole clue.",
      "",
    );
  }

  return lines.join("\n").trim();
};
