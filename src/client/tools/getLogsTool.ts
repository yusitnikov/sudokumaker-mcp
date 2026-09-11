import { z } from "zod";
import {
  bruteForceSolveToolName,
  checkValidityToolName,
  doAllLogicalStepsToolName,
  doLogicalStepToolName,
  getLogsToolName,
} from "./toolNames";
import { readSudokuMakerLogs } from "../../SudokuMakerLogs";
import { RootObjectNode } from "../format/ObjectNode";
import { solverLogsDescriptor } from "../format/tabState/solverLogs";
import { FrontendCallbackToolImplementation } from "./FrontendCallbackToolImplementation";

// TODO: remove after finishing working on the MCP
export const getLogsTool = new FrontendCallbackToolImplementation(
  {
    name: getLogsToolName,
    title: "Read the solver log",
    description:
      // language=markdown
      `
Read the app's own solver log (deductions, solve results, validity check results) as plain text, one
entry per line, oldest first. This is the same log the solver tools (\`${doLogicalStepToolName}\`,
\`${doAllLogicalStepsToolName}\`, \`${bruteForceSolveToolName}\`, \`${checkValidityToolName}\`) already report
their new entries from - use this tool instead when older entries are needed, or when a solver action
was triggered outside this session.
`.trim(),
    inputSchema: z.object({
      // TODO: remove after finishing working on the MCP
      json: z.boolean().default(false).describe("Return the raw log entries as JSON instead of the formatted text."),
    }),
  },
  ({ json }) => {
    const logEntries = readSudokuMakerLogs();

    return {
      response: {
        content: [
          {
            type: "text",
            text:
              logEntries.length === 0
                ? "The solver log is empty - no solving/checking action has been run yet."
                : json
                  ? JSON.stringify(logEntries, null, 2)
                  : new RootObjectNode(logEntries, solverLogsDescriptor).format(),
          },
        ],
      },
    };
  },
);
