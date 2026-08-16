import { undoTool, redoTool } from "./undoRedoTools";
import { z } from "zod";

/** Shared description fragment for actions that can be undone/redone like any other puzzle edit. */
export const reversibleActionNote = `Note: this action could be undone and redone by calling "${undoTool.name}" and "${redoTool.name}" tools, similar to any other action in the puzzle`;

/** Shared description for every mutating tool's `operationDescription` field: the plain-language basis for the user's approve/reject decision, not a log label. */
export const operationDescriptionNote =
  "Plain-language sentence describing what this call will actually change, for the user to approve or reject.";

export const operationDescriptionParam = z
  .string()
  .optional()
  .describe(operationDescriptionNote);
