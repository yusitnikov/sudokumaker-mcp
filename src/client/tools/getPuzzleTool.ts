import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getPuzzle } from "../utils";
import { getPuzzleToolName } from "./toolNames";
import { resolveHandle } from "../format/resolveHandle";
import { getElementFinalName } from "./elementUtils";
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
    expand: z
      .array(z.string())
      .optional()
      .describe(
        // language=markdown
        `
Handles of collapsed nodes to print in full instead of collapsing, e.g. \`["allElements.2.config.cages"]\`.
Relative to \`path\` when \`path\` is set (an absolute handle still copied from the default view also
resolves, with the \`path\` prefix stripped).
        `.trim(),
      ),
  }),
  ({ path = "", expand = [] }) => {
    const puzzle = getPuzzle();
    const rootNode = puzzleNode(puzzle);

    let node;
    try {
      node = resolveHandle(rootNode, path);
    } catch (error) {
      if (error instanceof NoSuchHandleError) {
        return {
          content: [{ type: "text" as const, text: error.message }],
          isError: true,
        };
      }
      throw error;
    }

    const expanded = new Set(
      expand.map((handle) => relativizeExpandHandle(handle, path)),
    );
    // path exists to narrow onto exactly one node - that node must never collapse itself away, or
    // a caller who already asked for it by path has no handle left that shows them anything path
    // didn't already. The default (no path) read is unaffected: node.handle is then the root's own
    // handle, which nothing collapses on regardless.
    if (path) {
      expanded.add(path);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: [
            path &&
              `"${puzzle.name}" — ${path}${describeEnclosingElement(puzzle, path)}`,
            node.format({ collapse: false, expanded }),
            // language=markdown
            `
Handles are dot-joined paths (e.g. \`allElements.3.config.style\`); grid nodes take cell notation
(\`cells.r2c3\`, \`cells.r2\`). \`expand\` opens a collapsed node in place; \`path\` returns only that node.
            `.trim(),
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    };
  },
);

/** Strips a `path` prefix from an `expand` handle, if present, so an absolute handle copied off the default view still resolves under a re-rooted read. */
const relativizeExpandHandle = (handle: string, path: string): string => {
  if (!path) {
    return handle;
  }
  if (handle === path) {
    return "";
  }
  const prefix = `${path}.`;
  return handle.startsWith(prefix) ? handle.slice(prefix.length) : handle;
};

/** For a re-rooted `path` inside `allElements.N`, a one-line gloss naming which element this is: ` of "Slow thermometers" (type Thermometer, ID 5)`. Empty string when `path` doesn't reach into an element. */
const describeEnclosingElement = (
  puzzle: ReturnType<typeof getPuzzle>,
  path: string,
): string => {
  const match = /^allElements\.(\d+)/.exec(path);
  if (!match) {
    return "";
  }
  const element = puzzle.allElements[Number(match[1])];
  if (!element) {
    return "";
  }
  return ` of "${getElementFinalName(element)}" (type ${element.config.type}, ID ${element.id})`;
};
