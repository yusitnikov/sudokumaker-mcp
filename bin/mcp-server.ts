#!/usr/bin/env node
import { program } from "commander";
// noinspection ES6PreferShortImport
import { SudokuMakerMcpServer } from "../src/SudokuMakerMcpServer";
import { version } from "../package.json";

program
  .name("sudokumaker-mcp")
  .description("MCP server for SudokuMaker via browser automation")
  .version(version)
  .option(
    "--broker <url>",
    "WebSocket URL of the connection broker",
    "ws://localhost:3004",
  )
  .option("--log <file>", "Path to log file (omit to disable logging)")
  .action(async (options: { broker: string; log?: string }) => {
    const server = new SudokuMakerMcpServer(options.log, options.broker);

    try {
      await server.start();
    } catch (error) {
      console.error("Failed to start the MCP server:", error);
      process.exit(1);
    }
  });

program.parse();
