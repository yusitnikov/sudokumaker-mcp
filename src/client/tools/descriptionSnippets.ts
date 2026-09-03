import { z } from "zod";
import { redoToolName, undoToolName } from "./toolNames";

/** Shared description fragment for actions that can be undone/redone like any other puzzle edit. */
export const reversibleActionNote = `Note: this action could be undone and redone by calling "${undoToolName}" and "${redoToolName}" tools, similar to any other action in the puzzle`;

/** Shared description for every mutating tool's `operationDescription` field: the plain-language basis for the user's approve/reject decision, not a log label. */
export const operationDescriptionNote =
  "Plain-language sentence describing what this call will actually change, for the user to approve or reject.";

export const operationDescriptionParam = z.string().describe(operationDescriptionNote);

/**
 * Shared description fragment for partial-update fields: the merge is recursive, so this applies at
 * every nesting level, not just the top one.
 */
export const partialUpdateNote =
  "Send only the fields you want to change, at any nesting level - any field you omit (at any level) keeps its current value. If you include an array-valued field, it replaces the whole array rather than merging item-by-item.";

/** Shared description fragment for every `elementId` field: the ID is a stable identifier, not the element's position in `allElements`, which shifts if elements are reordered. */
export const elementIdNote =
  "This is the element's ID, not its `allElements.N` handle - the handle shifts if elements are reordered, the ID doesn't.";
