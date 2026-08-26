import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getElementById, getElementFinalName } from "./elementUtils";
import { getPuzzle, updatePuzzle } from "../utils";
import {
  addElementToolName,
  getPuzzleToolName,
  removeElementToolName,
} from "./toolNames";
import { resolveHandle } from "../format/resolveHandle";
import { puzzleNode } from "../format/puzzle/puzzle";

export const removeElementTool = new ToolImplementation(
  {
    definition: {
      name: removeElementToolName,
      title: "Remove Sudoku Maker element",
      description:
        // language=markdown
        `Delete an entire element (and all of its clues, if any) from the puzzle by ID.`,
    },
  },
  z.object({
    elementId: z.number().int().describe(
      // language=markdown
      `ID of the element to remove, as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.`,
    ),
    elementName: z.string().describe(
      // language=markdown
      `The element's display name - set it so the user sees which element they're deleting when reviewing this call, not just a bare ID.`,
    ),
  }),
  ({ elementId }) => {
    const { index, targetElement } = getElementById(elementId);

    const before = getPuzzle();

    updatePuzzle(
      (puzzle) => {
        puzzle.allElements.splice(index, 1);
      },
      (_from, to) => {
        to.allConstraints.splice(index, 1);
      },
      `Remove ${getElementFinalName(targetElement)}`,
    );

    const after = getPuzzle();

    return {
      content: [
        {
          type: "text",
          text: [
            `Element "${getElementFinalName(targetElement)}" of type "${targetElement.config.type}" removed from position ${index + 1} in puzzle "${after.name || "(untitled)"}".`,
            resolveHandle(puzzleNode(before), "allElements").diff(
              resolveHandle(puzzleNode(after), "allElements"),
            ),
          ].join("\n\n"),
        },
      ],
    };
  },
);
