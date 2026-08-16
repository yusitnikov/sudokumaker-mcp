import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getPuzzle } from "../utils";

export const getPuzzleTool = new ToolImplementation(
  {
    definition: {
      name: "get_puzzle",
      title: "Get puzzle contents for tab",
      description: "Read the puzzle object for the target tab, or one nested value inside it.",
    },
  },
  z.object({
    path: z
      .array(
        z.union([
          z.string().describe("Object property name"),
          z.number().int().min(0).describe("Zero-based array index"),
        ]),
      )
      .optional()
      // TODO:
      // The whole-puzzle response is currently a raw JSON dump, not a formatted summary (see plan's
      // "get_puzzle" section / Phase 9). Until that lands, prefer path for a known sub-value is
      // genuinely cheaper. Once Phase 9 ships a clue-complete summary as the no-path default, this
      // guidance flips - the summary becomes the cheap default and path is for narrowing a known
      // follow-up read - so rewrite this description then.
      .describe(
        // language=markdown
        `
Path of property names and zero-based array indexes to a nested value inside the puzzle object,
e.g. \`["allElements", 0, "config"]\` to read \`puzzle.allElements[0].config\`.

Omit to read the entire puzzle object. Prefer passing \`path\` whenever you already know which part
you need (e.g. from a previous \`get_puzzle\` call or a mutation echo) - it returns only that
sub-value instead of the whole puzzle, which is cheaper for a large puzzle.
        `.trim(),
      ),
  }),
  ({ path = [] }, { tabId }) => {
    let result: any = getPuzzle();
    for (const key of path) {
      result = result?.[key];
    }

    if (result === undefined) {
      return {
        content: [
          {
            type: "text",
            text: "The value at the specified path is not defined. Try checking the parents...",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "resource",
          resource: {
            uri: ["puzzle:", "", tabId, ...path].join("/"),
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        },
      ],
    };
  },
);
