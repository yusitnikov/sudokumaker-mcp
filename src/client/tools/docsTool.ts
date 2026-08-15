import { z } from "zod";
import { ToolImplementation } from "./ToolImplementation";
import { getTopic, renderIndex } from "./docs/topics";
import { introTopic } from "./docs/intro";

export const docsTool = new ToolImplementation(
  {
    definition: {
      name: "docs",
      title: "Read Sudoku Maker MCP documentation",
      description:
        "Fetch a documentation topic by name. Call with an unknown or omitted topic to get the index of available topics. " +
        `Start every session with the \`${introTopic.name}\` topic.`,
    },
    global: true,
  },
  z.object({
    topic: z.string().optional().describe("The documentation topic to fetch."),
  }),
  ({ topic }) => {
    const found = topic === undefined ? undefined : getTopic(topic);

    return {
      content: [
        {
          type: "text",
          text: found ? found.content().trim() : renderIndex(),
        },
      ],
    };
  },
);