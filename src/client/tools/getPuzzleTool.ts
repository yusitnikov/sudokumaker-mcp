import { ToolImplementation } from "./ToolImplementation";
import { z } from "zod";
import { getPuzzle } from "../utils";
import { myTabId } from "../myTabId";

export const getPuzzleTool = new ToolImplementation(
  {
    definition: {
      name: "get_puzzle",
      title: "Get puzzle contents for tab",
      description: "Get full puzzle definition per tab ID",
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
      .describe(
        'The path of the puzzle object to retrieve, e.g. ["spec", "type"] to get puzzle.spec.type. ' +
          "Skip the path to get the whole puzzle object (warning: it will produce lots of tokens!). " +
          "DO NOT guess the puzzle structure, you have the exact schema in the instructions!",
      ),
  }),
  ({ path = [] }) => {
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
            uri: ["puzzle:", "", myTabId.get(), ...path].join("/"),
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        },
      ],
    };
  },
);
