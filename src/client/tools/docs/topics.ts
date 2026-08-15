/**
 * Registry for the `docs` tool's topics. `docsTool` is `global: true` — it lives in
 * `src/client/tools/` like every other tool and is dispatched through the same `tools` array and
 * the same `if (global)` branch in `SudokuMakerMcpServer.setupHandlers`; `global: true` only means
 * "runs with no session/tab plumbing," not "lives outside `tools/`."
 */

import { introTopic } from "./intro";
import { elementsTopic } from "./elements";
import { solvingTopic } from "./solving";
import { customConstraintsTopic } from "./customConstraints";
import { customConstraintsCustomComponentsTopic } from "./customConstraintsCustomComponents";
import { customConstraintsDigitSetTopic } from "./customConstraintsDigitSet";
import { cosmeticsTopic } from "./cosmetics";

export interface DocsTopic {
  /** The exact string passed as the `topic` tool parameter. */
  name: string;
  /** Shown in the topic index; should make the topic findable from a guess at its subject. */
  description: string;
  /** Rendered lazily so generated topics can read the registry/schemas at call time, not at import time. */
  content: () => string;
}

/** Every topic the `docs` tool can serve. Adding a topic means adding it here. */
const topics: DocsTopic[] = [
  introTopic,
  elementsTopic,
  solvingTopic,
  customConstraintsTopic,
  customConstraintsCustomComponentsTopic,
  customConstraintsDigitSetTopic,
  cosmeticsTopic,
];

export const getTopic = (name: string): DocsTopic | undefined =>
  topics.find((topic) => topic.name === name);

/**
 * The response to an unknown topic name: every topic's name and description, one line each, in
 * registration order (so `intro` stays first).
 * Deliberately never the topic content — a wrong guess should cost one cheap round trip, not
 * flood the response with everything.
 */
export const renderIndex = (): string => {
  const lines = topics.map(
    (topic) => `- \`${topic.name}\`: ${topic.description}`,
  );

  return [
    `Unknown docs topic. Available topics:`,
    ...lines,
    ``,
    `Element-specific topics follow the pattern \`element:<TypeName>\` (see the \`${elementsTopic.name}\` topic for the exact type names).`,
  ].join("\n");
};