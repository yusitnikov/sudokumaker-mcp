import type { ObjectDescriptor } from "../ObjectDescriptor";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { getArrayDiff } from "../diff";
import { truncate } from "./truncate";
import { SIZE_FLOOR, SUMMARY_BUDGET } from "../sizeLimits";
import { formatHandleMarker } from "../formatHandleMarker";

/** A string leaf. No children; long text collapses/diffs by line, per the "long text" collapse rule. */
export const stringDescriptor: ObjectDescriptor<string, any> = {
  child(node) {
    throw new NoSuchHandleError(
      node.handle,
      "(no children - this is a leaf value)",
    );
  },

  format(node, opts, isRoot) {
    const { value } = node;

    if (opts.collapse) {
      // Short form: quoted, truncated to one short line - truncate the raw value first so
      // JSON.stringify handles escaping and always closes the quote cleanly.
      const truncated = truncate(value, 40);
      return (
        JSON.stringify(truncated) +
        (truncated === value
          ? ""
          : ` (${value.length} characters)${formatHandleMarker(node, opts)}`)
      );
    }

    const lineCount = value.split("\n").length;

    // A text asked for by `path` prints in full - the caller already used the handle a cut would name.
    if (value.length > SIZE_FLOOR && !isRoot) {
      return `${lineCount} ${lineCount > 1 ? "lines" : "line"}${formatHandleMarker(node, opts)}`;
    }

    // A multi-line string printed in full prints as a heredoc, not
    // JSON.stringify'd - escaped \n's turn a whole script into one illegible line.
    return lineCount > 1 ? `<<EOF\n${value}\nEOF` : JSON.stringify(value);
  },

  getSummary({ value }) {
    const lineCount = value.split("\n").length;
    return lineCount > 1
      ? `${lineCount} lines`
      : `"${truncate(value, SUMMARY_BUDGET - 2)}"`;
  },

  diff({ value: from }, { value: to }) {
    const isLong = (text: string) =>
      text.length > 100 || text.split("\n").length > 1;
    if (!isLong(from) && !isLong(to)) {
      return `${JSON.stringify(from)} → ${JSON.stringify(to)}`;
    }

    const fromLines = from.split("\n");
    const toLines = to.split("\n");
    const ops = getArrayDiff(fromLines, toLines);

    const lines: string[] = [`${fromLines.length} → ${toLines.length} lines:`];
    for (const op of ops) {
      // Line numbers are 1-based, while the items' indexes count from 0.
      if (op.type === "removed") {
        lines.push(`- ${op.item.index + 1}: ${op.item.value}`);
      } else if (op.type === "added") {
        lines.push(`+ ${op.item.index + 1}: ${op.item.value}`);
      } else if (op.type === "edited") {
        lines.push(`- ${op.from.index + 1}: ${op.from.value}`);
        lines.push(`+ ${op.to.index + 1}: ${op.to.value}`);
      }
    }
    return lines.join("\n");
  },
};
