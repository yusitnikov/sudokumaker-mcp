export const childHandle = (parentHandle: string, segment: string): string =>
  parentHandle ? `${parentHandle}.${segment}` : segment;
