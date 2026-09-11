import { z } from "zod";
import { renderIndex, topics } from "./docs/topics";
import { getElementTopic } from "./docs/elementTopic";
import { docsToolName } from "./toolNames";
import { introTopicName } from "./docs/topicNames";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { BackendToolImplementation } from "./BackendToolImplementation";

const inputSchema = z.object({
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
});

class DocsTool extends BackendToolImplementation<typeof inputSchema> {
  protected run({ topic: name }: z.input<typeof inputSchema>): CallToolResult {
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
  }
}

export const docsTool = new DocsTool({
  name: docsToolName,
  title: "Read SudokuMaker MCP documentation",
  description:
    // language=markdown
    `
Fetch a documentation topic by name.
Start every session with the \`${introTopicName}\` topic.
`.trim(),
  inputSchema,
});
