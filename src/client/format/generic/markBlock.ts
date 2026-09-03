/** Prefixes a (possibly multi-line) block with a marker: every line if `everyLine`, else just the first (rest indented to match). */
export const markLinesBlock = (marker: string, lines: string[] | string, everyLine = false): string[] => {
  if (typeof lines === "string") {
    lines = lines.split("\n");
  }
  const spaces = " ".repeat(marker.length);

  return lines.map((line, i) => `${everyLine || i === 0 ? marker : spaces}${line}`);
};

/** Prefixes a (possibly multi-line) block with a marker: every line if `everyLine`, else just the first (rest indented to match). */
export const markTextBlock = (marker: string, text: string, everyLine = false): string =>
  markLinesBlock(marker, text, everyLine).join("\n");
