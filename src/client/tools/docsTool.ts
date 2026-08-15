import { z } from "zod";
import { ToolImplementation } from "./ToolImplementation";
import { renderIndex, topics } from "./docs/topics";
import { introTopic } from "./docs/intro";
import { getElementTopic } from "./docs/elementTopic";

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
  ({ topic: name }) => {
    let text = renderIndex();

    if (name !== undefined) {
      const simpleTopic = topics.find((topic) => topic.name === name);
      if (simpleTopic) {
        text = simpleTopic.content().trim();
      }

      const elementTopic = getElementTopic(name);
      if (elementTopic !== undefined) {
        text = elementTopic;
      }
    }

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  },
);
