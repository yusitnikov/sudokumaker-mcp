/**
 * Registry for the `docs` tool's topics. `docsTool` is `global: true` like `instructionsTool` —
 * it still lives in `src/client/tools/` and is dispatched through the same `tools` array and the
 * same `if (global)` branch in `SudokuMakerMcpServer.setupHandlers`; `global: true` only means
 * "runs with no session/tab plumbing," not "lives outside `tools/`."
 */

export interface DocsTopic {
  /** The exact string passed as the `topic` tool parameter. */
  name: string;
  /** Shown in the topic index; should make the topic findable from a guess at its subject. */
  description: string;
  /** Rendered lazily so generated topics can read the registry/schemas at call time, not at import time. */
  content: () => string;
}

export const getTopic = (
  topics: DocsTopic[],
  name: string,
): DocsTopic | undefined => topics.find((topic) => topic.name === name);

/**
 * The response to an unknown topic name: every topic's name and description, one line each.
 * Deliberately never the topic content — a wrong guess should cost one cheap round trip, not
 * flood the response with everything.
 */
export const renderIndex = (topics: DocsTopic[]): string => {
  const lines = [...topics]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((topic) => `- \`${topic.name}\`: ${topic.description}`);

  return [
    `Unknown docs topic. Available topics:`,
    ...lines,
    ``,
    `Element-specific topics follow the pattern \`element:<TypeName>\` (see the \`elements\` topic for the exact type names).`,
  ].join("\n");
};
