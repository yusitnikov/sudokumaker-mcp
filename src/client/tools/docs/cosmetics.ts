import type { DocsTopic } from "./topics";
import { addElementTool } from "../addElementTool";
import { addCluesTool } from "../addCluesTool";

export const cosmeticsTopic: DocsTopic = {
  name: "cosmetics",
  description:
    "Drawing on the grid without affecting the logic: cosmetic lines, cages and symbols, and when to use them.",
  content: () =>
    // language=markdown
    `
# Cosmetics

Cosmetic elements draw something on the grid without enforcing any rule — the automated solver ignores them entirely.
They're ordinary elements: added with \`${addElementTool.name}\`, and (being multi-clue types) filled in with
\`${addCluesTool.name}\`, exactly like any built-in constraint type.

## The types

- \`CosmeticLine\` — freeform lines of any shape (as opposed to logical line constraints like thermometers).
- \`CosmeticCage\` — an outline around a group of cells, with no sum or other rule attached.
- \`CosmeticSymbol\` — shapes (rectangle, ellipse, text, arrow) placed at an arbitrary point.

See each type's own \`element:<TypeName>\` topic for its exact config and clue shape before writing its data.

## Positioning symbols

\`CosmeticSymbol\` clues are placed by \`{x, y}\` point coordinates rather than cell notation, because a symbol can sit
anywhere — a cell centre, an edge, a corner, or between cells. Topic \`intro\` describes that point system.

## Why you'd add them

- **Decoration** — making a puzzle look the way its setter wants it to look.
- **Indicating a constraint without implementing it** — the drawing shows where the rule applies and the rules text
  says what it means, but nothing enforces it in the app. Ask the setter whether they also want the logic implemented:
  they don't always, and it's their call, not yours.
- **Accessibility** — making a drawing readable when its meaning would otherwise rest on something not everyone can
  perceive, e.g. labelling lines when the puzzle distinguishes them by color alone.
- **Mirroring a custom constraint** — a custom constraint has no visuals of its own, so whatever should indicate it on
  the grid has to be drawn separately, and kept in sync with it. Topic \`custom-constraints\` covers that case.

Whatever the reason, give the element a meaningful name (e.g. "Prime cell marks" rather than the default "Cosmetic
symbols") so it's identifiable later, both to you and to the user browsing the Elements panel.
`.trim(),
};
