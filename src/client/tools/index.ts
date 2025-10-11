import { z } from "zod";
import { ToolImplementation } from "./ToolImplementation";
import { getPuzzleTool } from "./getPuzzleTool";
import { updatePuzzleTool } from "./updatePuzzleTool";
import { updateGivenDigitsTool } from "./updateGivenDigitsTool";
import { updateCellValuesTool } from "./updateCellValuesTool";
import { updateCellMarksTool } from "./updateCellMarksTool";
import { redoTool, undoTool } from "./undoRedoTools";
import { clearGridTool } from "./clearGridTool";
import {
  bruteForceSolveTool,
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
import { instructions } from "./instructions";
import { getCustomConstraintsDocsTool } from "./getCustomConstraintsDocsTool";

const globalSchema = z.toJSONSchema(z.globalRegistry, { io: "input" }).schemas;
for (const schema of Object.values(globalSchema)) {
  delete schema.$schema;
  delete schema.id;
}
const globalSchemaStr = JSON.stringify(globalSchema);

const instructionsTool = new ToolImplementation(
  {
    definition: {
      name: "server_instructions",
      title: "MCP server usage instructions",
      description:
        "# Server instructions\n\n" +
        "This tool exists solely to provide general MCP server documentation.\n" +
        "Some MCP clients only receive tool metadata from MCP servers, making this the only available method for communicating server-wide instructions.\n" +
        "Do not call this tool - instead, read and follow the guidance below when working with any Sudoku Maker tools.\n\n" +
        "--------------------------------------\n\n" +
        instructions.replace("{{ GLOBAL_SCHEMA }}", globalSchemaStr),
    },
    global: true,
  },
  z.object({}),
  () => ({
    content: [
      {
        type: "text",
        text: "You're not supposed to call this tool. All instructions are already present in the tool's description.",
      },
    ],
    isError: true,
  }),
);

export const tools = [
  instructionsTool,
  getPuzzleTool,
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
  getCustomConstraintsDocsTool,
  undoTool,
  redoTool,
  clearGridTool,
  doLogicalStepTool,
  doAllLogicalStepsTool,
  bruteForceSolveTool,
  waitForSolverTool,
  stopSolverTool,
];
