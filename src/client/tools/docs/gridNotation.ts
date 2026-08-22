import type { DocsTopic } from "./topics";
import { getPuzzleToolName } from "../toolNames";
import { gridNotationTopicName, introTopicName } from "./topicNames";

export const gridNotationTopic: DocsTopic = {
  name: gridNotationTopicName,
  description: `How to read a grid cell's one-token notation in a \`${getPuzzleToolName}\` read or diff: given/solved digit, candidates, corner marks, colors, and validity.`,
  content: () =>
    // language=markdown
    `
# Grid notation

Every cell's full state - given/solved digit, candidates, corner pencil marks, background colors,
and validity - is folded into one token per cell. This is the notation \`${getPuzzleToolName}\`'s
\`cells\` output (and any diff touching \`cells\`) uses.

## The token grammar

- \`*5\` - a **given** 5.
- \`[5]\` - a **solved (non-given) value** 5.
- \`139\` - **candidates** 1, 3 and 9 (bare digits, no prefix).
- \`^28\` - **corner pencil marks** 2 and 8, prefixed with \`^\`.
- \`#1\` - **background color** index 1, prefixed with \`#\`. See topic \`${introTopicName}\` for what
  color indices mean.
- \`.\` - a cell with nothing set: no given/value, no candidates, no corner marks, no colors.
- A leading \`X\` flags a cell the solver marked **invalid**, e.g. \`X139\`.

Candidates, corner marks and colors can combine in one token, in that order: \`139^28#1\` is a cell
with candidates 1/3/9, corner marks 2/8, and color 1. A given or solved value excludes all of that -
placing a value clears candidates/corner marks in the app itself, so a cell is never both \`*5\` and
\`139\` at once.

## Compacting runs

A run of 3 or more **consecutive** numbers compacts to \`first-last\`: candidates 1, 2, 3, 4, 8, 9
print as \`1-489\` (the run 1-4, then bare 8 and 9).

## The grid layout

A \`|\` between two cells, or a line of \`-\` between two rows, marks a region boundary; no separator
means the two cells share a region.

## Diffs

A \`cells\` diff prints only the rows that changed, each twice: a \`-\` line showing that row as it
was, a \`+\` line showing it as it is now, both labeled with the row number (\`r5 -\`, \`r5 +\`). An
unchanged row does not print at all - the row labels on the pairs that do print carry the position.
`.trim(),
};
