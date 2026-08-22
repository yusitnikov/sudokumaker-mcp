/** JSON.stringify, except undefined stringifies to the text "undefined" instead of the value undefined. */
export const stringifyValue = (value: unknown): string =>
  value === undefined ? "undefined" : JSON.stringify(value);
