/** Standard per-key diff shape: unchanged fields plain, changed/added/removed fields marked. */
export const diffPlainObject = (
  from: Record<string, unknown>,
  to: Record<string, unknown>,
): string => {
  const keys = [...new Set([...Object.keys(from), ...Object.keys(to)])];
  const lines: string[] = ["{"];
  for (const key of keys) {
    const hasFrom = key in from;
    const hasTo = key in to;
    if (
      hasFrom &&
      hasTo &&
      JSON.stringify(from[key]) === JSON.stringify(to[key])
    ) {
      lines.push(`  ${key}: ${JSON.stringify(from[key])},`);
    } else if (hasFrom && hasTo) {
      lines.push(`- ${key}: ${JSON.stringify(from[key])},`);
      lines.push(`+ ${key}: ${JSON.stringify(to[key])},`);
    } else if (hasFrom) {
      lines.push(`- ${key}: ${JSON.stringify(from[key])},`);
    } else {
      lines.push(`+ ${key}: ${JSON.stringify(to[key])},`);
    }
  }
  lines.push("}");
  return lines.join("\n");
};
