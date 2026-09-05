import { CallbackToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getElementById, getElementFinalName } from "./elementUtils";
import { addElementToolName, getPuzzleToolName, removeElementToolName } from "./toolNames";
import { elementsDiffSummary } from "../format/puzzle/diffSummary";
import { elementIdNote } from "./descriptionSnippets";

export const removeElementTool = new CallbackToolImplementation(
  {
    definition: {
      name: removeElementToolName,
      title: "Remove SudokuMaker element",
      description:
        // language=markdown
        `Delete an entire element (and all of its clues, if any) from the puzzle by ID.`,
    },
  },
  z.object({
    elementId: z
      .number()
      .int()
      .describe(
        // language=markdown
        `
ID of the element to remove, as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.
${elementIdNote}
        `.trim(),
      ),
    elementName: z.string().describe(
      // language=markdown
      `The element's display name - set it so the user sees which element they're deleting when reviewing this call, not just a bare ID.`,
    ),
  }),
  async function ({ elementId }) {
    const {
      tabState,
      result: { index, targetElement },
    } = await this.updatePuzzle(
      (puzzle) => {
        const { index, targetElement } = getElementById(puzzle, elementId);

        puzzle.allElements.splice(index, 1);

        return { result: { index, targetElement } };
      },
      (_from, to, { index }) => {
        to.allConstraints.splice(index, 1);
      },
      (_puzzle, { targetElement }) => `Remove ${getElementFinalName(targetElement)}`,
    );

    return {
      content: [
        {
          type: "text",
          text: [
            `Element "${getElementFinalName(targetElement)}" of type "${targetElement.config.type}" removed from position ${index + 1} in puzzle "${tabState.puzzle.name || "(untitled)"}".`,
            elementsDiffSummary(tabState),
          ].join("\n"),
        },
      ],
    };
  },
);
