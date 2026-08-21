import { getPuzzleTool } from "./getPuzzleTool";
import { getLogsTool } from "./getLogsTool";
import { updatePuzzleTool } from "./updatePuzzleTool";
import { updateGivenDigitsTool } from "./updateGivenDigitsTool";
import { updateCellValuesTool } from "./updateCellValuesTool";
import { updateCellMarksTool } from "./updateCellMarksTool";
import { redoTool, undoTool } from "./undoRedoTools";
import { clearGridTool } from "./clearGridTool";
import {
  bruteForceSolveTool,
  checkValidityTool,
  doAllLogicalStepsTool,
  doLogicalStepTool,
  stopSolverTool,
  waitForSolverTool,
} from "./solverTools";
import { addElementTool } from "./addElementTool";
import { updateElementTool } from "./updateElementTool";
import { removeElementTool } from "./removeElementTool";
import { addCluesTool } from "./addCluesTool";
import { updateCluesTool } from "./updateCluesTool";
import { removeCluesTool } from "./removeCluesTool";
import { docsTool } from "./docsTool";

export const tools = [
  getPuzzleTool,
  getLogsTool,
  updatePuzzleTool,
  updateGivenDigitsTool,
  updateCellValuesTool,
  updateCellMarksTool,
  addElementTool,
  updateElementTool,
  removeElementTool,
  addCluesTool,
  updateCluesTool,
  removeCluesTool,
  docsTool,
  undoTool,
  redoTool,
  clearGridTool,
  doLogicalStepTool,
  doAllLogicalStepsTool,
  bruteForceSolveTool,
  checkValidityTool,
  waitForSolverTool,
  stopSolverTool,
];
