import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import {
  ClueCellsGroupFilter,
  CluePositionsFilter,
  getElementFinalName,
} from "./elementUtils";
import {
  elementIdNote,
  operationDescriptionParam,
} from "./descriptionSnippets";
import { ArrowElement, ThermometerElement } from "../../SudokuMakerElement";
import {
  addElementToolName,
  getPuzzleToolName,
  removeCluesToolName,
} from "./toolNames";
import { elementsDiffSummary } from "../format/puzzle/diffSummary";

export const removeCluesTool = new ToolImplementation(
  {
    definition: {
      name: removeCluesToolName,
      title: "Remove SudokuMaker clues",
      description:
        // language=markdown
        `
Delete one or more existing clues of a multi-clue element (e.g. remove a \`${ThermometerElement.typeName}\`,
delete an \`${ArrowElement.typeName}\`).

The response lists which clues were matched and removed - **undo immediately** if a match wasn't
the clue you intended.
`.trim(),
    },
  },
  z.object({
    elementId: z
      .number()
      .int()
      .describe(
        // language=markdown
        `
ID of the target element (the multi-clue element to remove clues from), as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.
${elementIdNote}
        `.trim(),
      ),
    operationDescription: operationDescriptionParam,
    match: z
      .union([
        z.object({ positions: CluePositionsFilter }),
        z.object({ clueCellGroups: z.array(ClueCellsGroupFilter) }),
      ])
      .describe(
        // language=markdown
        `
Which clues to remove: either \`positions\` to remove exact clues directly, or \`clueCellGroups\` -
one or more cell groups, each independently selecting the clue(s) it matches.
`.trim(),
      ),
  }),
  async function ({ elementId, match, operationDescription }) {
    const { tabState, allMatchingIndexes, updatedElement, messages } =
      await this.updateCluesByCellGroups(
        elementId,
        "positions" in match
          ? [{ positions: match.positions }]
          : match.clueCellGroups.map((clueCells) => ({ clueCells })),
        (clues, _, allMatchingIndexes) =>
          clues.filter((_value, index) => !allMatchingIndexes.has(index)),
        operationDescription,
      );

    return {
      content: [
        {
          type: "text",
          text: [
            `Removed ${allMatchingIndexes.size} clues from "${getElementFinalName(updatedElement)}" in puzzle "${tabState.puzzle.name || "(untitled)"}".`,
            "",
            ...messages,
            "",
            elementsDiffSummary(tabState),
          ].join("\n"),
        },
      ],
    };
  },
);
