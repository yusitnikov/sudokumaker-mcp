import { type CellCoords, CellSchema } from "../SudokuMakerSchemas";
import { z } from "zod";
import { PuzzleSchema } from "../SudokuMakerPuzzleSchema";
import {
  type ElementByType,
  ElementType,
  getElementByConfig,
} from "../SudokuMakerElement";

export const getPuzzle = () => {
  const puzzle = PuzzleSchema.encode(window.Api.getPuzzle());

  puzzle.allElements.forEach(
    <TypeT extends ElementType>(element: ElementByType<TypeT>) => {
      const elementType = getElementByConfig<TypeT>(element.config);

      const elementMetadata = elementType.getElementMetadata(
        element.config,
        puzzle.spec,
      );

      element.elementMetadata = {
        defaultName: elementMetadata.title,
        description: elementMetadata.description,
      };
    },
  );

  return puzzle;
};

export const updatePuzzle = (
  updateCallback: (
    puzzle: z.input<typeof PuzzleSchema>,
  ) => z.input<typeof PuzzleSchema> | void,
  copyCallback: (
    from: z.output<typeof PuzzleSchema>,
    to: z.output<typeof PuzzleSchema>,
  ) => void,
  operationDescription?: string,
) =>
  window.Api.updatePuzzle((sudokuMakerPuzzle) => {
    const puzzle = PuzzleSchema.encode(sudokuMakerPuzzle);

    const updatedPuzzle = updateCallback(puzzle) ?? puzzle;

    const updatedSudokuMakerPuzzle = PuzzleSchema.decode(updatedPuzzle);

    copyCallback(updatedSudokuMakerPuzzle, sudokuMakerPuzzle);
  }, operationDescription);

export const copyCells = (
  from: z.output<typeof CellSchema>[],
  to: z.output<typeof CellSchema>[],
) => {
  for (const [index, cell] of from.entries()) {
    Object.assign(to[index], cell);
  }
};

export const waitForSolver = async (timeout: number) => {
  const step = 200;
  for (let time = 0; time < timeout && window.Api.busy.value; time += step) {
    await new Promise((resolve) => setTimeout(resolve, step));
  }

  const isBusy = window.Api.busy.value;
  return {
    isBusy,
    message: isBusy
      ? `The solver is still running after ${timeout / 1000} seconds...`
      : "The solver finished running.",
  };
};

export const toShortCellNotation = (
  cellOrCells: CellCoords | CellCoords[],
): string =>
  Array.isArray(cellOrCells)
    ? cellOrCells.map(toShortCellNotation).join(", ")
    : `r${cellOrCells.row}c${cellOrCells.column}`;
