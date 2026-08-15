import { z } from "zod";
import { ToolImplementation } from "./ToolImplementation";
import { getTopic, renderIndex, type DocsTopic } from "./docs/topics";
import { customConstraintsComponentsTopic } from "./docs/customConstraintsComponents";
import { customConstraintsCustomComponentsTopic } from "./docs/customConstraintsCustomComponents";
import { customConstraintsDigitSetTopic } from "./docs/customConstraintsDigitSet";

/** Every topic the `docs` tool can serve. Adding a topic means adding it here. */
const topics: DocsTopic[] = [
  customConstraintsComponentsTopic,
  customConstraintsCustomComponentsTopic,
  customConstraintsDigitSetTopic,
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
