export const indent = (text: string, prefix = "  "): string =>
  text
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : line))
    .join("\n");
