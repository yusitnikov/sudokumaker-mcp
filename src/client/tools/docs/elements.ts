import type { DocsTopic } from "./topics";
import {
  AllElements,
  AntikingElement,
  ArrowElement,
  DiagonalPlusElement,
  KillerCagesElement,
  SudokuRulesElement,
  ThermometerElement,
} from "../../../SudokuMakerElement";
import {
  addCluesToolName,
  removeCluesToolName,
  updateCluesToolName,
  updateElementToolName,
  updateGivenDigitsToolName,
} from "../toolNames";
import { cosmeticsTopicName, customConstraintsTopicName, elementsTopicName, elementTopicPattern } from "./topicNames";

const renderCatalog = (): string =>
  AllElements.flatMap(({ typeName, main: { title, description }, options, extraDocs }) => {
    const formattedExtraDocs = (extraDocs ?? [])
      .map(({ header, contents }) => ` **${header}**: ${contents.replaceAll("\n", " ")}`)
      .join("");

    return [
      `- \`${typeName}\` — "${title}": ${description}${formattedExtraDocs}`,
      ...options.map((option) => `  - "${option.title}": ${option.description}`),
    ];
  }).join("\n");

export const elementsTopic: DocsTopic = {
  name: elementsTopicName,
  description:
    "Built-in element types: how their clues are managed, the catalog of available types, and what to do when none fits.",
  content: () =>
    // language=markdown
    `
# Elements

An element is one entry in the puzzle's \`allElements\` array — one item in the Elements panel.
Every element has a type (e.g. \`${KillerCagesElement.typeName}\`, \`${ThermometerElement.typeName}\`), a name, an enabled flag, and a solver-ignored flag,
plus a type-specific config that holds its clues and appearance.

## How clues are managed

**Single-clue elements** — only one clue of this type can exist per puzzle (e.g. \`${SudokuRulesElement.typeName}\`, \`${DiagonalPlusElement.typeName}\`, \`${AntikingElement.typeName}\`).
Adding the element adds its one clue automatically; there's no separate clue array to manage.

**Multi-clue elements** — support any number of clues placed on the grid (e.g. \`${ArrowElement.typeName}\`, \`${ThermometerElement.typeName}\`, \`${KillerCagesElement.typeName}\`).
Clues live in an array inside the element's config (key varies by type: \`lines\`, \`cages\`, \`clues\`, …) and are managed with
\`${addCluesToolName}\`, \`${updateCluesToolName}\`, \`${removeCluesToolName}\` rather than by rewriting the whole config.

**Special-case elements** — conceptually have clues, but go through dedicated tools instead of the clue-array tools:
- **Given digits** are conceptually one clue per filled cell, but live directly in grid cells, not in an element's config.
  Use \`${updateGivenDigitsToolName}\`.
- **Regions** are conceptually one clue per region, but are defined by a grid-wide region-number mapping rather than a clue array.
  Update the whole mapping via \`${updateElementToolName}\`.

## Catalog

${renderCatalog()}

Each entry's own \`${elementTopicPattern}\` topic has its exact config and clue shape — fetch that before writing its data.

## When nothing built-in fits

- A rule no built-in type implements: see topic \`${customConstraintsTopicName}\`.
- Something purely visual, with no effect on solving: see topic \`${cosmeticsTopicName}\`.
`.trim(),
};
