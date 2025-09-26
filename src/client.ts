import { TabSyncClient } from "@sitnikov/tab-sync";
import type { ToolImplementation } from "./shared.ts";

const code = `
    import { run } from "${import.meta.url.replace("/client", "/worker")}";
    run("sudokumaker", "Sudoku Maker");
`;
const url = "data:application/javascript;base64," + btoa(code);

const tabSyncClient = new TabSyncClient<{ connected: boolean }>({
  sharedWorkerPath: url,
  sharedWorkerOptions: { name: "Sudoku Maker MCP", type: "module" },
});

tabSyncClient.onExtraPingDataChanged = ({ connected }) =>
  console.log("Connection status changed:", { connected });

const getPuzzle = () => {
  let puzzle = (window as any).Api.getPuzzle();
  puzzle = JSON.parse(JSON.stringify(puzzle));
  delete puzzle.helpers;
  return puzzle;
};

tabSyncClient.onCustomMessage("getPuzzle", getPuzzle);

const getTypesWikiTool: ToolImplementation = {
  definition: {
    name: "get_types_wiki",
    title: "Get Sudoku Maker typescript definitions",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  global: true,
  run: async () => {
    const response = await fetch(
      "https://raw.githubusercontent.com/yusitnikov/puzzletv/refs/heads/main/src/types/SudokuMaker.ts",
    );
    const code = await response.text();

    return {
      content: [
        {
          type: "resource",
          resource: {
            uri: "wiki://types",
            mimeType: "text/plain",
            text: code,
          },
        },
      ],
    };
  },
};
const getPuzzleTool: ToolImplementation = {
  definition: {
    name: "get_puzzle",
    title: "Get puzzle contents for tab",
    description: `Get full puzzle definition per tab ID. You MUST call the ${getTypesWikiTool} tool to understand the puzzle's data.`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  run: () => ({
    content: [
      {
        type: "resource",
        resource: {
          uri: `puzzle://${tabSyncClient.myTabInfo.id}`,
          mimeType: "application/json",
          text: JSON.stringify(getPuzzle(), null, 2),
        },
      },
    ],
  }),
};
const tools = [getTypesWikiTool, getPuzzleTool];

tabSyncClient.onCustomMessage("getInfo", () => {
  const puzzle = getPuzzle();

  return `Puzzle author: "${puzzle.author}"; Puzzle spec: ${JSON.stringify(puzzle.spec)}; Puzzle constraints count: ${puzzle.allConstraints.length}; In order to get and UNDERSTAND the full puzzle contents, use wiki tools first, and ONLY THEN call the ${getPuzzleTool.definition.name} tool.`;
});

tabSyncClient.onCustomMessage("listTools", () =>
  tools.map(({ run, ...tool }) => tool),
);

tabSyncClient.onCustomMessage(
  "callTool",
  ({ name, params }: { name: string; params: any }) =>
    tools.find(({ definition }) => definition.name === name)!.run(params),
);

tabSyncClient.start();

console.log("MCP client started");
