import { getPuzzle, updatePuzzle } from "../utils";
import { ElementSchema, getElementByTypeName } from "../../SudokuMakerElement";
import { type CellNotation, CellIdPublic } from "../../SudokuMakerSchemas";
import { z } from "zod";

export const getElementFinalName = ({
  name,
  config: { type },
  elementMetadata,
}: z.input<typeof ElementSchema>) =>
  name || elementMetadata?.defaultName || type;

export const getElementSummary = (element: z.input<typeof ElementSchema>) =>
  `"${getElementFinalName(element)}" (type ${element.config.type}, ID ${element.id}, ${!element.enabled ? "disabled" : element.solverIgnored ? "solver-ignored" : "enabled"})`;

export const getElementById = (elementId: number) => {
  const { allElements: currentElements } = getPuzzle();

  const targetElement = currentElements.find(({ id }) => id === elementId);
  if (!targetElement) {
    throw new Error(`Element with ID ${elementId} not found in the puzzle`);
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
  id: "ClueCellsGroupFilter",
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
  operationDescription: (
    targetElement: z.input<typeof ElementSchema>,
    affectedCluesCount: number,
  ) => string,
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
    operationDescription(targetElement, allMatchingIndexes.size),
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
      ...matchingClues.map((matches, groupIndex) => ({
        type: "text" as const,
        text: `Cells group #${groupIndex + 1} - targeted ${matches.length} clues: ${JSON.stringify(matches.map(({ clue }) => clue))}`,
      })),
      {
        type: "text" as const,
        text: "If some of the targeted clues above don't match your expectations, please undo the operation immediately!",
      },
    ],
  };
};
