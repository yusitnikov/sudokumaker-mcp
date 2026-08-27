import type { ObjectDescriptor } from "../ObjectDescriptor";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { alignArray } from "../renderDiff";
import { truncate } from "./truncate";
import { SIZE_FLOOR } from "../SIZE_FLOOR";

/** A string leaf. No children; long text collapses/diffs by line, per the "long text" collapse rule. */
export const stringDescriptor: ObjectDescriptor<string, any> = {
  child(node) {
    throw new NoSuchHandleError(
      node.handle,
      "(no children - this is a leaf value)",
    );
  },

  format({ value, handle }, opts, isRoot) {
    if (opts.collapse) {
      // Short form: quoted, truncated to one short line - truncate the raw value first so
      // JSON.stringify handles escaping and always closes the quote cleanly.
      const truncated = truncate(value, 40);
      return (
        JSON.stringify(truncated) +
        (truncated === value ? "" : ` (${value.length} characters)`)
      );
    }

    const lineCount = value.split("\n").length;

    // A text asked for by `path` prints in full - the caller already used the handle a cut would name.
    if (value.length > SIZE_FLOOR && !isRoot) {
      let result = `${lineCount} line`;
      if (lineCount > 1) {
        result += "s";
      }
      if (!opts.skipHandle) {
        result += `   <read it with path "${handle}">`;
      }
      return result;
    }

    // A multi-line string printed in full prints as a heredoc, not
    // JSON.stringify'd - escaped \n's turn a whole script into one illegible line.
    return lineCount > 1 ? `<<EOF\n${value}\nEOF` : JSON.stringify(value);
  },

  diff({ value: from }, { value: to }) {
    const isLong = (text: string) =>
      text.length > 100 || text.split("\n").length > 1;
    if (!isLong(from) && !isLong(to)) {
      return `${JSON.stringify(from)} → ${JSON.stringify(to)}`;
    }

    const fromLines = from.split("\n");
    const toLines = to.split("\n");
    const ops = alignArray(fromLines, toLines);

    const lines: string[] = [`${fromLines.length} → ${toLines.length} lines:`];
    let fromLineNum = 0;
    let toLineNum = 0;
    for (const op of ops) {
      if (op.type === "unchanged" || op.type === "moved") {
        fromLineNum++;
        toLineNum++;
      } else if (op.type === "removed") {
        fromLineNum++;
        lines.push(`- ${fromLineNum}: ${op.value}`);
      } else if (op.type === "added") {
        toLineNum++;
        lines.push(`+ ${toLineNum}: ${op.value}`);
      } else {
        fromLineNum++;
        toLineNum++;
        lines.push(`- ${fromLineNum}: ${op.from}`);
        lines.push(`+ ${toLineNum}: ${op.to}`);
      }
    }
    return lines.join("\n");
  },
};
