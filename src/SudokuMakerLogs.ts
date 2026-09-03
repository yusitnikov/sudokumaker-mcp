// Reads the app's own solver log (`.LogsView` in the DOM) into structured entries. Runs page-side -
// this module is injected into the puzzle tab, same as the rest of src/Sudoku* domain code.
//
// Verified live against the real DOM (not the minified bundle) across every entry kind the log can
// produce: `deduction` (contradiction messages, text-char icon), `text` with no icon ("No logical
// steps found."), `text` with an info icon ("Stopped counting ..."), `text` with an error icon ("This
// puzzle is broken."), `solved` (icon-less, has a duration), `count` (icon-less, has a duration), the
// in-progress `solvingProgress` entry (no content/icon/duration at all - a `<strong>` + cancel button
// instead), and a `deduction outOfDate` entry (grid edited after the deduction was logged).

// The app's own class name for the entry, read off the `<li>`'s first CSS class token. Not an
// exhaustive enum on purpose - the extraction is structure-based (content present or not, icon
// present or not), so an app update adding a new kind still extracts correctly; this field just
// passes the app's own label through instead of collapsing every kind to the same shape.
export type SudokuMakerLogEntryKind =
  | "deduction"
  | "solved"
  | "count"
  | "text"
  | "solvingProgress"
  | (string & {});

export interface SudokuMakerLogEntry {
  // The app's own class name for this entry - see SudokuMakerLogEntryKind.
  kind: SudokuMakerLogEntryKind;
  // The entry's own text, with internal whitespace collapsed and leading/trailing whitespace trimmed.
  // A plain-character icon (e.g. "💥" on `deduction` entries) is left folded into this text, since it
  // carries no extra machine-readable information beyond the character itself. Doesn't include the
  // duration or the outOfDate marker - those are separate fields.
  text: string;
  // The semantic tags of the entry's icon, when it has an SVG one - `text`-kind entries with "This
  // puzzle is broken." use an error icon whose own CSS classes are "Icon ErrorIcon RedErrorIcon";
  // dropping the bare "Icon" item, then any class that's a suffix of a more specific one ("ErrorIcon"
  // is a suffix of "RedErrorIcon"), then the "Icon" suffix itself, leaves just ["RedError"]. Empty
  // when the entry has no icon or only a plain-character one (see `text` above).
  iconClasses: string[];
  // Wall-clock duration the app printed next to the entry (e.g. "took 0.2s"), when present.
  duration?: string;
  // True when the app has marked this entry stale (invalidated by a later grid edit) via its
  // `outOfDate` CSS class. The entry's own text never says so.
  outOfDate: boolean;
  // True for the one special-case entry the app shows while a solve is still running - it has no
  // content/icon/duration of its own (just a "Solving..." label and a cancel button), and isn't a
  // finished result. Callers must check this before treating an entry as a completed outcome.
  inProgress: boolean;
  // Full HTML in the DOM
  html: string;
  // Human-readable rendering of the entry, combining the fields above the same way the app's own UI
  // implies it (icon character kept inline, duration in parens, an "[outdated]" prefix when stale,
  // an "[in progress] " prefix while solving). This is what callers should show verbatim; the other
  // fields are for callers that want to branch on the entry's properties.
  formatted?: string;
}

export function readSudokuMakerLogs(): SudokuMakerLogEntry[] {
  return Array.from(document.querySelectorAll(".LogsView li"))
    .map((li): SudokuMakerLogEntry | undefined => {
      const html = li.outerHTML;
      const kind = li.classList[0] || "";
      const outOfDate = li.classList.contains("outOfDate");

      if (kind === "solvingProgress") {
        // No `.content`/`.duration` at all - just a "Solving..." label and a "Stop solving" button.
        const strong = li.querySelector(":scope > strong");
        const text = (strong?.textContent || "").replace(/\s+/g, " ").trim();

        return {
          kind,
          text,
          iconClasses: [],
          duration: undefined,
          outOfDate,
          inProgress: true,
          html,
        };
      }

      // Each `<li>`'s meaningful text lives in sibling nodes (`.content`, `.duration`) with no
      // whitespace between them in the DOM - joining `li.textContent` wholesale glues them together
      // (e.g. "Solvedtook 0.2s"). `.duration`, when present, holds the wall-clock time. A plain
      // character icon (e.g. "💥") has no `.icon` class and is left as part of `content.textContent`,
      // so `text` below already includes it; only an SVG icon carries the `.icon` class and its own
      // classes are pulled out separately into `iconClasses` instead.
      const content = li.querySelector(":scope > .content");
      if (!content) {
        return undefined;
      }

      const svg = content.querySelector(":scope > .icon > svg");
      // Drop the bare "Icon" item, then drop any class that's a suffix of another one - e.g. out of
      // "Icon ErrorIcon RedErrorIcon", "Icon" goes first, then "ErrorIcon" is a suffix of
      // "RedErrorIcon" and goes too, leaving just the most specific class: ["RedErrorIcon"]. Finally
      // strip the "Icon" suffix off what's left for readability: ["RedError"].
      const allClasses = (svg?.getAttribute("class") || "")
        .split(/\s+/)
        .filter((cls) => cls && cls !== "Icon");
      const iconClasses = allClasses
        .filter(
          (cls) =>
            !allClasses.some((other) => other !== cls && other.endsWith(cls)),
        )
        .map((cls) => cls.replace(/Icon$/, ""));

      return {
        kind,
        text: (content.textContent || "").replace(/\s+/g, " ").trim(),
        iconClasses,
        duration:
          li.querySelector(":scope > .duration")?.textContent?.trim() ||
          undefined,
        outOfDate,
        inProgress: false,
        html,
      };
    })
    .filter(
      (entry): entry is SudokuMakerLogEntry =>
        entry !== undefined && entry.text.length > 0,
    );
}
