/** Cuts `text` to at most `max` characters, replacing the tail with `…` when it doesn't fit. */
export const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;
