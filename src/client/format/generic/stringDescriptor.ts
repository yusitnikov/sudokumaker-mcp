import type { ObjectDescriptor } from "../ObjectDescriptor";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { getArrayDiff, type ArrayItem } from "../diff";
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
    // Move detection isn't rendered here yet - a moved line's two halves print as a plain
    // removal and addition, the same as any other line that happens to match one elsewhere.
    const ops = getArrayDiff(fromLines, toLines);

    // Line numbers are 1-based, while the items' indexes count from 0.
    // Padded to the widest number either side can print, so the colons line up down the block.
    const numberWidth = Math.max(
      fromLines.length.toString().length,
      toLines.length.toString().length,
    );

    const lines: string[] = ["", `${" ".repeat(numberWidth + 4)}<<EOF`];

    const printLine = (
      marker: string,
      item: ArrayItem<string>,
      printLineNumber = true,
    ) =>
      lines.push(
        `${marker}${(printLineNumber ? `${item.index + 1}:` : "").padStart(numberWidth + 1)} ${item.value}`,
      );

    ops.forEach((op) => {
      if (op.type === "unchanged") {
        const { items } = op;
        // A blank line is never useful context on its own, so each boundary extends past blanks
        // to the nearest real content.
        let leadEnd = 1;
        while (leadEnd < items.length && items[leadEnd - 1].value === "") {
          leadEnd++;
        }
        let tailStart = items.length - 1;
        while (tailStart > 0 && items[tailStart].value === "") {
          tailStart--;
        }

        items.slice(0, leadEnd).forEach((item) => printLine("  ", item));
        if (tailStart > leadEnd) {
          lines.push("…");
        }
        items
          .slice(Math.max(tailStart, leadEnd))
          .forEach((item) => printLine("  ", item));
      } else if (op.type === "removed") {
        printLine("- ", op.item, false);
      } else if (op.type === "added") {
        printLine("+ ", op.item);
      } else {
        throw new Error(
          `Internal error: unexpected ${op.type} operation for a string diff`,
        );
      }
    });

    lines.push(`${" ".repeat(numberWidth + 4)}EOF`);

    return lines.join("\n");
  },
};
