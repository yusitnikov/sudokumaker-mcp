import { CellIdPublic } from "../../SudokuMakerSchemas";
import { z } from "zod";
import { elementTopicPrefix } from "./docs/topicNames";
import { docsToolName } from "./toolNames";
import type { PuzzlePublic } from "../../SudokuMakerPuzzleSchema";
import { type ElementPublic, isElementWithClue } from "../../elements/types";
import { getElementByTypeName } from "../../elements/AllElements";

export const getElementFinalName = ({ name, config: { type }, elementMetadata }: ElementPublic) =>
  name || elementMetadata?.defaultName || type;

/**
 * Validates data whose shape depends on the element type, pointing at that type's docs topic on failure.
 * `shape` mirrors the tool's own schema, so error paths name the fields the caller passed.
 */
export const parseElementSpecificData = <T extends z.ZodRawShape>(typeName: string, shape: T, data: unknown) => {
  try {
    z.object(shape).parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `${error.message}\n\nThe exact schema for this element type is in the \`${elementTopicPrefix}${typeName}\` topic of the \`${docsToolName}\` tool - read it and retry.`,
        { cause: error },
      );
    }
    throw error;
  }
};

export const getElementById = ({ allElements: currentElements }: PuzzlePublic, elementId: number) => {
  const targetElement = currentElements.find(({ id }) => id === elementId);
  if (!targetElement) {
    // The puzzle's actual elements travel with the error, so retrying costs no extra read.
    const available = currentElements
      .map((element) => `${element.id} ("${getElementFinalName(element)}", type ${element.config.type})`)
      .join(", ");

    throw new Error(
      `Element with ID ${elementId} not found in the puzzle. The puzzle has ${currentElements.length === 0 ? "no elements at all" : `these elements: ${available}`}.`,
    );
  }

  const index = currentElements.indexOf(targetElement);

  return { index, targetElement };
};

/**
 * Resolves an element by ID, its real `SudokuMakerElement` type descriptor, and its clue descriptor -
 * throwing a clear domain error if the resolved type has no clues at all.
 * Shared by every tool that targets an element's clues, since the element's real type (and whether it has clues)
 * is always known server-side, never supplied by the caller.
 */
export const getElementWithClueById = (puzzle: PuzzlePublic, elementId: number) => {
  const { index, targetElement } = getElementById(puzzle, elementId);
  const elementType = getElementByTypeName(targetElement.config.type);

  if (!isElementWithClue(elementType)) {
    throw new Error(
      `Element type "${targetElement.config.type}" has no clues - this tool only applies to multi-clue element types.`,
    );
  }

  return { index, targetElement, elementType, clueType: elementType.clue! };
};

export const ClueCellsGroupFilter = z.array(CellIdPublic).meta({
  description:
    // language=markdown
    `
A group of cells that identifies which clue(s) to target.
A clue matches only if **all** cells in the group are among the cells it affects.

Pass enough cells to identify one clue uniquely, or fewer to target several clues at once.
    `.trim(),
});

export const CluePositionsFilter = z
  .array(z.number().int().min(1))
  .describe("1-based positions in the element's clue array, selecting exactly those clues.");

export const ClueMatch = z.union([
  z.object({ clueCells: ClueCellsGroupFilter }),
  z.object({ positions: CluePositionsFilter }),
]);
