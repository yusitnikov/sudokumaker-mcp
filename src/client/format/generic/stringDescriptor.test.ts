import { describe, expect, test } from "vitest";
import { stringDescriptor } from "./stringDescriptor";
import { ObjectNode } from "../ObjectNode";

const node = (value: string) => new ObjectNode(value, () => undefined, "text", value, stringDescriptor);

const diff = (from: string, to: string) => stringDescriptor.diff(node(from), node(to));

const lines = (...ls: string[]) => ls.join("\n");

describe("stringDescriptor diff, short text", () => {
  test("prints old and new inline when neither side is long", () => {
    expect(diff("hello", "world")).toBe('"hello" → "world"');
  });

  test("counts as short by character count even under 100, not by line count alone", () => {
    expect(diff("a", "b")).toBe('"a" → "b"');
  });

  test("treats a single line over 100 characters as long", () => {
    const from = "x".repeat(101);
    const to = "y".repeat(101);
    expect(diff(from, to)).toBe(lines("", "     <<EOF", `-    ${from}`, `+ 1: ${to}`, "     EOF"));
  });

  // An empty string has no newline, so it's one short line - clearing a whole rules field down to
  // nothing takes the plain inline path, not the heredoc, same as any other short single-line edit.
  test("treats a text cleared down to nothing as short, not as a multi-line diff", () => {
    expect(diff("Normal sudoku rules apply.", "")).toBe('"Normal sudoku rules apply." → ""');
  });
});

describe("stringDescriptor diff, multi-line text", () => {
  test("reports an untouched text with its first and last line shown, the middle folded", () => {
    // Nothing borders the run on either side, so nothing would show at all if not for the
    // first/last-line rule - only the middle line has no reason to print.
    expect(diff(lines("a", "b", "c"), lines("a", "b", "c"))).toBe(
      lines("", "     <<EOF", "  1: a", "…", "  3: c", "     EOF"),
    );
  });

  // The change sits right after line 1, so line 1 shows as ordinary context - the point here is
  // line 8, far from any change, which only shows because it's the text's own last line.
  test("shows the last line even when it's far from the nearest change", () => {
    expect(diff(lines("a", "b", "c", "d", "e", "f", "g", "h"), lines("a", "x", "c", "d", "e", "f", "g", "h"))).toBe(
      lines("", "     <<EOF", "  1: a", "-    b", "+ 2: x", "  3: c", "…", "  8: h", "     EOF"),
    );
  });

  test("shows a changed line in place, with its unchanged neighbors as context", () => {
    expect(diff(lines("a", "b", "c"), lines("a", "x", "c"))).toBe(
      lines("", "     <<EOF", "  1: a", "-    b", "+ 2: x", "  3: c", "     EOF"),
    );
  });

  test("reports an inserted line as added, keeping the line after it as context", () => {
    // "c" is line 4, the text's own last line - it shows even with no change bordering it, per
    // the first/last-line rule.
    expect(diff(lines("a", "b", "c"), lines("a", "z", "b", "c"))).toBe(
      lines("", "     <<EOF", "  1: a", "+ 2: z", "  3: b", "  4: c", "     EOF"),
    );
  });

  test("reports a dropped line as removed, keeping its neighbors as context", () => {
    // "d" is line 3, the text's own last line - it shows even with no change bordering it, per
    // the first/last-line rule.
    expect(diff(lines("a", "b", "c", "d"), lines("a", "c", "d"))).toBe(
      lines("", "     <<EOF", "  1: a", "-    b", "  2: c", "  3: d", "     EOF"),
    );
  });

  test("windows several runs of different lengths around several changes", () => {
    expect(
      diff(
        lines("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"),
        lines("1", "2", "3", "40", "5", "6", "7", "80", "9", "100", "11", "12", "13"),
      ),
    ).toBe(
      lines(
        "",
        "      <<EOF",
        "   1: 1",
        "…",
        "   3: 3",
        "-     4",
        "+  4: 40",
        "   5: 5",
        "…",
        "   7: 7",
        "-     8",
        "+  8: 80",
        "   9: 9",
        "-     10",
        "+ 10: 100",
        "  11: 11",
        "…",
        "  13: 13",
        "      EOF",
      ),
    );
  });

  // 10 falls outside the "from" side's own width (9 lines), so the padding has to be computed
  // from both sides' line counts, not just whichever side a given line happens to belong to.
  test("pads line numbers to the wider side's width, not just its own side's", () => {
    expect(
      diff(lines("a", "b", "c", "d", "e", "f", "g", "h", "i"), lines("a", "x", "b", "c", "d", "e", "f", "g", "h", "i")),
    ).toBe(lines("", "      <<EOF", "   1: a", "+  2: x", "   3: b", "…", "  10: i", "      EOF"));
  });

  // Line 10 itself now prints, next to single-digit context lines - both must come out at the
  // same width, and 10 doesn't get truncated to fit the single-digit lines' column.
  test("pads a single-digit context line to match a two-digit line printed beside it", () => {
    expect(
      diff(lines("a", "b", "c", "d", "e", "f", "g", "h", "i"), lines("a", "b", "c", "d", "e", "f", "g", "h", "i", "x")),
    ).toBe(lines("", "      <<EOF", "   1: a", "…", "   9: i", "+ 10: x", "      EOF"));
  });

  // Move detection isn't rendered here yet: a line that reappears elsewhere is reported as a plain
  // removal and addition at its own positions, same as any other pair of unrelated lines.
  test("reports a moved line as a removal and an addition, not as a move", () => {
    expect(diff(lines("a", "b", "c"), lines("a", "c", "b"))).toBe(
      lines("", "     <<EOF", "  1: a", "-    b", "  2: c", "+ 3: b", "     EOF"),
    );
  });

  test("reports an unrelated removal and addition next to each other, not as one changed line", () => {
    expect(diff(lines("a", "b", "c"), lines("a", "c", "bb"))).toBe(
      lines("", "     <<EOF", "  1: a", "-    b", "  2: c", "+ 3: bb", "     EOF"),
    );
  });
});

describe("stringDescriptor diff, empty lines", () => {
  // A trailing newline on rules text is common (setters often leave one) - the added blank line
  // must show up as a real line, not vanish because it has no visible content.
  test("shows an added trailing blank line", () => {
    expect(diff("Normal sudoku rules apply.", "Normal sudoku rules apply.\n")).toBe(
      lines("", "     <<EOF", "  1: Normal sudoku rules apply.", "+ 2: ", "     EOF"),
    );
  });

  test("shows a removed trailing blank line", () => {
    expect(diff("Normal sudoku rules apply.\n", "Normal sudoku rules apply.")).toBe(
      lines("", "     <<EOF", "  1: Normal sudoku rules apply.", "-    ", "     EOF"),
    );
  });

  // The number of trailing blank lines is itself meaningful (one blank line reads differently
  // from three in the app), so each one is its own line, not folded into a single marker.
  test("shows every added trailing blank line separately, not folded into one", () => {
    expect(diff(lines("a", "b"), lines("a", "b", "", "", ""))).toBe(
      lines("", "     <<EOF", "  1: a", "  2: b", "+ 3: ", "+ 4: ", "+ 5: ", "     EOF"),
    );
  });

  test("shows every removed trailing blank line separately, not folded into one", () => {
    expect(diff(lines("a", "b", "", "", ""), lines("a", "b"))).toBe(
      lines("", "     <<EOF", "  1: a", "  2: b", "-    ", "-    ", "-    ", "     EOF"),
    );
  });

  // The text's own last line is blank, so a bare last-line-only context ("3: " with nothing after
  // it) would give the reader nothing to anchor on - the shown region extends back to include the
  // nearest real content ("b") instead of stopping at the empty line alone.
  test("shows real content leading up to a blank last line, not the blank line alone", () => {
    expect(diff(lines("a", "b", ""), lines("a", "b", ""))).toBe(
      lines("", "     <<EOF", "  1: a", "  2: b", "  3: ", "     EOF"),
    );
  });

  // A blank line changing to non-blank (or the reverse) mid-text is an ordinary edit, and prints
  // like one - the blank side just has nothing after the colon.
  test("shows a blank line replaced by real content as an edit", () => {
    expect(diff(lines("a", "", "c"), lines("a", "x", "c"))).toBe(
      lines("", "     <<EOF", "  1: a", "-    ", "+ 2: x", "  3: c", "     EOF"),
    );
  });

  // The blank line and "c" trade positions - same shape as swapping two named lines elsewhere in
  // this file: no move annotation, the blank shows as a plain removal and a plain addition at its
  // new position, and "c" itself, being unchanged content, shows at its new line number.
  test("shows a blank line that changes position as a plain removal and addition, not a move", () => {
    expect(diff(lines("a", "", "c"), lines("a", "c", ""))).toBe(
      lines("", "     <<EOF", "  1: a", "-    ", "  2: c", "+ 3: ", "     EOF"),
    );
  });

  // The item a long run folds away is itself blank here - the fold marker must still read as
  // "one line hidden", not blur together with the blank line's own empty appearance.
  test("folds a blank line in the middle of a run the same as any other line", () => {
    expect(diff(lines("a", "", "c", "d"), lines("a", "", "c", "x"))).toBe(
      lines("", "     <<EOF", "  1: a", "…", "  3: c", "-    d", "+ 4: x", "     EOF"),
    );
  });

  // Same suppressed-number rule as any other removed line, just at two-digit width - the blank
  // line's removal marker must pad to the same column the digits use, not fall back to width 1.
  test("pads a removed blank line to a two-digit width like any other removed line", () => {
    expect(
      diff(lines("a", "b", "c", "d", "e", "f", "g", "h", "i", ""), lines("a", "b", "c", "d", "e", "f", "g", "h", "i")),
    ).toBe(lines("", "      <<EOF", "   1: a", "…", "   9: i", "-     ", "      EOF"));
  });

  // A new blank-separated paragraph inserted next to an existing blank line: the pre-existing
  // separator is unchanged context, the new separator is a genuine addition, and the two blank
  // lines must not be conflated with each other despite identical content.
  test("keeps an inserted blank line distinct from an adjacent unchanged one", () => {
    expect(diff(lines("Rule one.", "", "Rule two."), lines("Rule one.", "", "Rule two.", "", "Rule three."))).toBe(
      lines("", "     <<EOF", "  1: Rule one.", "…", "  3: Rule two.", "+ 4: ", "+ 5: Rule three.", "     EOF"),
    );
  });

  // Clearing a multi-line rules field down to nothing: `to` still has "one line" (the empty
  // string), so this stays on the heredoc path unlike the single-line clear above - every old
  // line is gone and the one new blank line arrived, nothing is left unchanged.
  test("removes every old line and adds the one new blank line when cleared to nothing", () => {
    expect(diff(lines("line one", "line two", "line three"), "")).toBe(
      lines("", "     <<EOF", "-    line one", "-    line two", "-    line three", "+ 1: ", "     EOF"),
    );
  });

  // The trailing blank run grows from two blanks to three. "b" is the nearest real content to the
  // run's blank tail, so it (and the two existing blanks after it) show as context - that's more
  // informative than folding them, since seeing there were already two blanks is what tells the
  // reader the count just went from two to three.
  test("shows the existing blanks as context leading up to the newly added one", () => {
    expect(diff(lines("a", "b", "", ""), lines("a", "b", "", "", ""))).toBe(
      lines("", "     <<EOF", "  1: a", "  2: b", "  3: ", "  4: ", "+ 5: ", "     EOF"),
    );
  });

  // The final "\n\n" splits into two trailing blank lines (6 and 7) - the text's true last line is
  // blank, so the shown tail extends back past both blanks to "e" (line 5), the nearest real
  // content, rather than stopping at an isolated blank line with nothing to anchor it.
  test("extends the shown tail back to real content when the last line is blank", () => {
    expect(diff("a\nb\nc\nd\ne\n\n", "a\nB\nc\nd\ne\n\n")).toBe(
      lines("", "     <<EOF", "  1: a", "-    b", "+ 2: B", "  3: c", "…", "  5: e", "  6: ", "  7: ", "     EOF"),
    );
  });

  // The same "always show the true boundary line" rule applies at the start: a leading blank
  // line is the text's own first line, so it shows right after "<<EOF" even though it's blank -
  // the reader needs to know the text doesn't start with something missing.
  test("shows the text's true first blank line the same way as its true last line", () => {
    expect(diff("\nb\nc", "\nB\nc")).toBe(lines("", "     <<EOF", "  1: ", "-    b", "+ 2: B", "  3: c", "     EOF"));
  });

  // The leading run is blank all the way through - there's no real content in it to extend
  // toward, so the whole run shows plainly (both blank lines, correctly numbered) rather than
  // folding down to a bare boundary line with nothing to anchor it.
  test("shows a leading run in full when every line in it is blank", () => {
    expect(diff("\n\nb\nc", "\n\nB\nc")).toBe(
      lines("", "     <<EOF", "  1: ", "  2: ", "-    b", "+ 3: B", "  4: c", "     EOF"),
    );
  });

  // A run of several blank lines sits between two changes, nowhere near the text's own edge, and
  // has no real content anywhere in it to extend toward - every blank line prints anyway, since
  // there's nothing to fold *toward*, and the count of blanks between the two changes is itself
  // meaningful the same way a run of trailing blanks is.
  test("shows every blank line in a wholly blank interior run, none of it folded", () => {
    expect(diff(lines("x", "", "", "", "", "", "y"), lines("X", "", "", "", "", "", "Y"))).toBe(
      lines(
        "",
        "     <<EOF",
        "-    x",
        "+ 1: X",
        "  2: ",
        "  3: ",
        "  4: ",
        "  5: ",
        "  6: ",
        "-    y",
        "+ 7: Y",
        "     EOF",
      ),
    );
  });

  // A run sits between two changes and is blank at both ends but has real content further in -
  // each side extends only as far as its own nearest real content ("b" and "e"), and the
  // untouched middle ("c", "d") between those two anchors still folds.
  test("extends from both ends of a run toward real content, folding what's left between", () => {
    expect(diff(lines("x", "", "b", "c", "d", "e", "", "y"), lines("X", "", "b", "c", "d", "e", "", "Y"))).toBe(
      lines(
        "",
        "     <<EOF",
        "-    x",
        "+ 1: X",
        "  2: ",
        "  3: b",
        "…",
        "  6: e",
        "  7: ",
        "-    y",
        "+ 8: Y",
        "     EOF",
      ),
    );
  });

  // The run needing extension is long enough that, after pulling in the two blank lines next to
  // the real content, there's still an untouched stretch worth folding on the far side of it.
  test("folds the untouched remainder of a run after extending only as far as needed", () => {
    expect(diff(lines("a", "b", "c", "d", "e", "", "", "f"), lines("a", "b", "c", "d", "e", "", "", "g"))).toBe(
      lines("", "     <<EOF", "  1: a", "…", "  5: e", "  6: ", "  7: ", "-    f", "+ 8: g", "     EOF"),
    );
  });
});
