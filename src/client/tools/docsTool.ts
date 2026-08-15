import { z } from "zod";
import { ToolImplementation } from "./ToolImplementation";
import { getTopic, renderIndex, type DocsTopic } from "./docs/topics";
import { introTopic } from "./docs/intro";
import { elementsTopic } from "./docs/elements";
import { solvingTopic } from "./docs/solving";
import { customConstraintsTopic } from "./docs/customConstraints";
import { customConstraintsCustomComponentsTopic } from "./docs/customConstraintsCustomComponents";
import { customConstraintsDigitSetTopic } from "./docs/customConstraintsDigitSet";
import { cosmeticsTopic } from "./docs/cosmetics";

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

export const docsTool = new ToolImplementation(
  {
    definition: {
      name: "docs",
      title: "Read Sudoku Maker MCP documentation",
      description:
        "Fetch a documentation topic by name. Call with an unknown or omitted topic to get the index of available topics. " +
        "Start every session with the `intro` topic.",
    },
    global: true,
  },
  z.object({
    topic: z.string().optional().describe("The documentation topic to fetch."),
  }),
  ({ topic }) => {
    const found = topic === undefined ? undefined : getTopic(topics, topic);

    return {
      content: [
        {
          type: "text",
          text: found ? found.content().trim() : renderIndex(topics),
        },
      ],
    };
  },
);
