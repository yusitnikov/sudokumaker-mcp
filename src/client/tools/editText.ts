import { z } from "zod";

/** Appends a line break to `text`, unless it's empty or already ends with one. */
const withTrailingLineBreak = (text: string) => (text.length === 0 || text.endsWith("\n") ? text : text + "\n");

export const editTextOperation = z.union([
  z.object({
    write: z.object({
      content: z.string().describe("The new complete text, replacing whatever it held before."),
    }),
  }),
  z.object({
    edit: z
      .object({
        old_string: z.string().describe("Exact text to find and replace."),
        new_string: z.string().describe("Text to put in place of `old_string`."),
        replace_all: z.boolean().optional().describe("Replace every occurrence instead of just one."),
      })
      .describe(
        "Finds `old_string` and replaces it with `new_string`. `old_string` must match exactly one location, unless `replace_all` is set.",
      ),
  }),
  z.object({
    appendLines: z.object({
      content: z.string().describe("Text to add after the current content."),
    }),
  }),
  z.object({
    prependLines: z.object({
      content: z.string().describe("Text to add before the current content."),
    }),
  }),
]);

export const editText = (text: string, operation: z.input<typeof editTextOperation>): string => {
  if ("write" in operation) {
    return operation.write.content;
  }

  if ("edit" in operation) {
    const { old_string, new_string, replace_all } = operation.edit;
    const occurrences = text.split(old_string).length - 1;

    if (occurrences === 0) {
      throw new Error(`"old_string" was not found in the current text.`);
    }
    if (occurrences > 1 && !replace_all) {
      throw new Error(
        `"old_string" matches ${occurrences} locations in the current text - narrow it to match exactly one, or pass "replace_all": true.`,
      );
    }

    return text.replaceAll(old_string, new_string);
  }

  if ("appendLines" in operation) {
    return withTrailingLineBreak(text) + operation.appendLines.content;
  }

  return withTrailingLineBreak(operation.prependLines.content) + text;
};
