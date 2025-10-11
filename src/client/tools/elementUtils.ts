import { getPuzzle, toShortCellNotation, updatePuzzle } from "../utils";
import { ElementSchema, getElementByTypeName } from "../../SudokuMakerElement";
import { type CellCoords, CellIdPublic } from "../../SudokuMakerSchemas";
import { z } from "zod";

export const getElementFinalName = ({
  name,
  config: { type },
  elementMetadata,
}: z.input<typeof ElementSchema>) =>
  name || elementMetadata?.defaultName || type;

export const getElementSummary = (element: z.input<typeof ElementSchema>) =>
  `"${getElementFinalName(element)}" (type ${element.config.type}, ID ${element.id}, ${!element.enabled ? "disabled" : element.solverIgnored ? "solver-ignored" : "enabled"})`;

export const getElementById = (elementId: number, type?: string) => {
  const { allElements: currentElements } = getPuzzle();

  const targetElement = currentElements.find(({ id }) => id === elementId);
  if (!targetElement) {
    throw new Error(`Element with ID ${elementId} not found in the puzzle`);
  }
  if (type !== undefined && targetElement.config.type !== type) {
    throw new Error(
      `Type mismatch: element with ID ${elementId} is of type "${targetElement.config.type}", but type "${type}" requested. Are you sure that it's the element that you wanted to edit?`,
    );
  }
  const index = currentElements.indexOf(targetElement);

  return { index, targetElement };
};

export const ClueCellsGroupFilter = z.array(CellIdPublic).meta({
  id: "ClueCellsGroupFilter",
  description:
    "A group of cells that indicates which clue to target. Only clues that affect ALL cells in the group will be targeted. " +
    "Please pass enough cells here to identify the clue uniquely unless you want to target multiple clues at the time.",
});

export const updateCluesByCellGroups = (
  elementId: number,
  type: string,
  clueCellGroups: CellCoords[][],
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
  const { index, targetElement } = getElementById(elementId, type);

  const elementType = getElementByTypeName(type);
  const cluesKey = elementType.clue!.key;
  const clues = ((targetElement.config as any)[cluesKey] as any[]).map(
    (clue, index) => ({
      index,
      clue,
      cells: elementType.clue!.getAffectedCells(clue),
    }),
  );
  const matchingClues = clueCellGroups.map((cells) =>
    clues.filter((clue) =>
      cells.every((cell1) =>
        clue.cells.some(
          (cell2) => cell2.row === cell1.row && cell2.column === cell1.column,
        ),
      ),
    ),
  );
  const allMatchingIndexes = new Set(
    matchingClues.flat().map(({ index }) => index),
  );

  if (allMatchingIndexes.size === 0) {
    const allClueCells = clues
      .map(({ cells }) => toShortCellNotation(cells))
      .map((cellsStr) => `(${cellsStr || "none"})`);

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
