import { z } from "zod";
import { CallbackToolImplementation } from "./ToolImplementation";
import { renderIndex, topics } from "./docs/topics";
import { getElementTopic } from "./docs/elementTopic";
import { docsToolName } from "./toolNames";
import { introTopicName } from "./docs/topicNames";

export const docsTool = new CallbackToolImplementation(
  {
    definition: {
      name: docsToolName,
      title: "Read SudokuMaker MCP documentation",
      description:
        // language=markdown
        `
Fetch a documentation topic by name.
Start every session with the \`${introTopicName}\` topic.
        `.trim(),
    },
    global: true,
  },
  z.object({
    topic: z
      .string()
      .optional()
      .describe(
        // language=markdown
        `
The documentation topic to fetch.
Omit to get the index of available topics.
        `.trim(),
      ),
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
