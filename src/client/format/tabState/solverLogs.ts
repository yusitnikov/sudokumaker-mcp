import type { ObjectDescriptor } from "../ObjectDescriptor";
import type { SudokuMakerLogEntry } from "../../../SudokuMakerLogs";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { getArrayDescriptor } from "../generic/arrayDescriptor";

/**
 * One solver log entry, printed as the app's own UI implies it - the entry's `formatted` text and
 * nothing else.
 *
 * The remaining fields (`kind`, `iconClasses`, `outOfDate`, `inProgress`, `duration`) are all folded
 * into that text already, and `html` is the entry's identity rather than something to read, so
 * printing them separately would say the same thing three times over.
 */
export const solverLogDescriptor: ObjectDescriptor<SudokuMakerLogEntry, any> = {
  child(node) {
    throw new NoSuchHandleError(node.handle, "(no children - a log entry prints as one line)");
  },

  format(node, opts) {
    const { text, iconClasses, duration, inProgress, outOfDate } = node.value;

    const parts: string[] = inProgress
      ? ["[In progress]"]
      : [...(outOfDate ? ["[Outdated]"] : []), ...iconClasses.map((cls) => `[${cls}]`)];

    parts.push(opts.collapse && parts.length ? "…" : text);

    if (!inProgress && duration && !opts.collapse) {
      parts.push(`(${duration})`);
    }

    return parts.join(" ");
  },

  /**
   * An entry's text is rewritten in place only when the app re-renders it - in practice when a grid
   * edit marks a deduction stale, which `formatted` carries as its "[Outdated]" prefix.
   */
  diff(from, to) {
    // TODO: format outdated-only diff nicely here and in the array descriptor
    return `\n- ${from.format({ collapse: false })}\n+ ${to.format({ collapse: false })}`;
  },
};

/**
 * The solver log, oldest entry first.
 *
 * Keyed by `html`: some solver actions append to the log while others replace it outright, so
 * pairing by position would report a replaced log as every entry having been edited. The app's own
 * markup for an entry is what identifies it - it folds in every other field, including the
 * `outOfDate` class that a later grid edit adds.
 */
export const solverLogsDescriptor = getArrayDescriptor<SudokuMakerLogEntry, any>({
  itemDescriptor: solverLogDescriptor,
  countLabel: "log entries",
  canEditItems: false,
});
