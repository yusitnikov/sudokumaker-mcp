import { getPuzzle, updatePuzzle } from "../utils";
import {
  type ElementPublic,
  getElementByTypeName,
} from "../../SudokuMakerElement";
import { type CellNotation, CellIdPublic } from "../../SudokuMakerSchemas";
import { z } from "zod";
import { elementTopicPrefix } from "./docs/topicNames";
import { docsToolName } from "./toolNames";

export const getElementFinalName = ({
  name,
  config: { type },
  elementMetadata,
}: ElementPublic) => name || elementMetadata?.defaultName || type;

/**
 * Validates data whose shape depends on the element type, pointing at that type's docs topic on failure.
 * `shape` mirrors the tool's own schema, so error paths name the fields the caller passed.
 */
export const parseElementSpecificData = <T extends z.ZodRawShape>(
  typeName: string,
  shape: T,
  data: unknown,
) => {
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

export const getElementById = (elementId: number) => {
  const { allElements: currentElements } = getPuzzle();

  const targetElement = currentElements.find(({ id }) => id === elementId);
  if (!targetElement) {
    // The puzzle's actual elements travel with the error, so retrying costs no extra read.
    const available = currentElements
      .map(
        (element) =>
          `${element.id} ("${getElementFinalName(element)}", type ${element.config.type})`,
      )
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
export const getElementWithClueById = (elementId: number) => {
  const { index, targetElement } = getElementById(elementId);
  const elementType = getElementByTypeName(targetElement.config.type);

  const clueType = elementType.clue;
  if (!clueType) {
    throw new Error(
      `Element type "${targetElement.config.type}" has no clues - this tool only applies to multi-clue element types.`,
    );
  }

  return { index, targetElement, elementType, clueType };
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

export const updateCluesByCellGroups = (
  elementId: number,
  clueCellGroups: CellNotation[][],
  updateCallback: (
    clues: any[],
    matchingIndexGroups: number[][],
    allMatchingIndexes: Set<number>,
  ) => any[] | void,
  operationDescription: string,
) => {
  const { index, targetElement, elementType, clueType } =
    getElementWithClueById(elementId);

  const cluesKey = clueType.key;
  const clues = ((targetElement.config as any)[cluesKey] as any[]).map(
    (clue, index) => ({
      index,
      clue,
      cells: clueType.getAffectedCells(clue),
    }),
  );
  const matchingClues = clueCellGroups.map((cells) =>
    clues.filter((clue) => cells.every((cell1) => clue.cells.includes(cell1))),
  );
  const allMatchingIndexes = new Set(
    matchingClues.flat().map(({ index }) => index),
  );

  if (allMatchingIndexes.size === 0) {
    const allClueCells = clues.map(
      ({ cells }) => `(${cells.join(", ") || "none"})`,
    );

    throw new Error(
      `No matching clues found, please check the filters. There are clues with the following affected cells - you can target only these cells: ${allClueCells.join("; ") || "none"}`,
    );
  }

  updatePuzzle(
    (puzzle) => {
      const config = puzzle.allElements[index].config as any;
      const result = updateCallback(
        config[cluesKey],
        matchingClues.map((group) => group.map(({ index }) => index)),
        allMatchingIndexes,
      );
      if (result) {
        config[cluesKey] = result;
      }
    },
    (from, to) => {
      (to.allConstraints[index].config as any)[cluesKey] = (
        from.allConstraints[index].config as any
      )[cluesKey];
    },
    operationDescription,
  );

  const updatedElement = getPuzzle().allElements[index];
  const updatedClues = (updatedElement.config as any)[cluesKey] as any[];

  return {
    index,
    targetElement,
    elementType,
    cluesKey,
    clues,
    matchingClues,
    allMatchingIndexes,
    updatedElement,
    updatedClues,
    messages: [
      ...matchingClues.map(
        (matches, groupIndex) =>
          // TODO: format properly or remove
          `Cells group #${groupIndex + 1} - targeted ${matches.length} clues: ${JSON.stringify(matches.map(({ clue }) => clue))}`,
      ),
      "If some of the targeted clues above don't match your expectations, UNDO THE OPERATION IMMEDIATELY!",
    ],
  };
};
