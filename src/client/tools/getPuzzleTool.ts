import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getPuzzle } from "../utils";
import { getPuzzleToolName } from "./toolNames";
import { NoSuchHandleError } from "../format/NoSuchHandleError";
import { puzzleNode } from "../format/puzzle/puzzle";

export const getPuzzleTool = new ToolImplementation(
  {
    definition: {
      name: getPuzzleToolName,
      title: "Get puzzle contents for tab",
      description:
        "Read the puzzle object for the target tab, formatted for reading, or one nested value inside it via `path`.",
    },
  },
  z.object({
    path: z
      .string()
      .optional()
      .describe(
        // language=markdown
        `
Dot-joined handle to a nested value inside the puzzle (e.g. \`"allElements.3.config.style"\`), copied
from a handle printed in a previous \`${getPuzzleToolName}\` call or a mutation echo. Grid nodes take cell
notation (\`"cells.r2c3"\`, \`"cells.r2"\`).

Omit to read the entire puzzle. Narrow with \`path\` whenever you already know which part you need -
it returns only that sub-value instead of the whole puzzle, which is cheaper for a large puzzle.
        `.trim(),
      ),
  }),
  ({ path = "" }) => {
    const puzzle = getPuzzle();
    const rootNode = puzzleNode(puzzle);

    let node;
    try {
      node = rootNode.resolveHandle(path);
    } catch (error) {
      if (error instanceof NoSuchHandleError) {
        return {
          content: [{ type: "text" as const, text: error.message }],
          isError: true,
        };
      }
      throw error;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: [
            path && `"${puzzle.name}" — ${path}`,
            node.format({ collapse: false }, true),
            // language=markdown
            `
Handles are dot-joined paths (e.g. \`allElements.3.config.style\`); grid nodes take cell notation
(\`cells.r2c3\`, \`cells.r2\`). Pass one as \`path\` to read a collapsed node in full.
            `.trim(),
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    };
  },
);
