import type { DocsTopic } from "./topics";
import { AllElements } from "../../../SudokuMakerElement";
import { addCluesTool } from "../addCluesTool";
import { updateCluesTool } from "../updateCluesTool";
import { removeCluesTool } from "../removeCluesTool";
import { updateGivenDigitsTool } from "../updateGivenDigitsTool";
import { updateElementTool } from "../updateElementTool";
import { customConstraintsTopic } from "./customConstraints";
import { cosmeticsTopic } from "./cosmetics";
import { elementTopicPattern } from "./elementTopic";

const renderCatalog = (): string =>
  AllElements.flatMap(({ typeName, main: { title, description }, options }) => [
    `- \`${typeName}\` — "${title}": ${description}`,
    ...options.map((option) => `  - "${option.title}": ${option.description}`),
  ]).join("\n");

export const elementsTopic: DocsTopic = {
  name: "elements",
  description:
    "Built-in element types: how their clues are managed, the catalog of available types, and what to do when none fits.",
  content: () =>
    // language=markdown
    `
# Elements

An element is one entry in the puzzle's \`allElements\` array — one item in the Elements panel.
Every element has a type (e.g. \`KillerCages\`, \`Thermometer\`), a name, an enabled flag, and a solver-ignored flag,
plus a type-specific config that holds its clues and appearance.

## How clues are managed

**Single-clue elements** — only one clue of this type can exist per puzzle (e.g. \`SudokuRules\`, \`DiagonalPlus\`, \`Antiking\`).
Adding the element adds its one clue automatically; there's no separate clue array to manage.

**Multi-clue elements** — support any number of clues placed on the grid (e.g. \`Arrows\`, \`Thermometer\`, \`KillerCages\`).
Clues live in an array inside the element's config (key varies by type: \`lines\`, \`cages\`, \`clues\`, …) and are managed with
\`${addCluesTool.name}\`, \`${updateCluesTool.name}\`, \`${removeCluesTool.name}\` rather than by rewriting the whole config.

**Special-case elements** — conceptually have clues, but go through dedicated tools instead of the clue-array tools:
- **Given digits** are conceptually one clue per filled cell, but live directly in grid cells, not in an element's config.
  Use \`${updateGivenDigitsTool.name}\`.
- **Regions** are conceptually one clue per region, but are defined by a grid-wide region-number mapping rather than a clue array.
  Update the whole mapping via \`${updateElementTool.name}\`.

## Catalog

${renderCatalog()}

Each entry's own \`${elementTopicPattern}\` topic has its exact config and clue shape — fetch that before writing its data.

## When nothing built-in fits

- A rule no built-in type implements: see topic \`${customConstraintsTopic.name}\`.
- Something purely visual, with no effect on solving: see topic \`${cosmeticsTopic.name}\`.
`.trim(),
};
