#!/usr/bin/env node
/**
 * Launches a fresh (or resumed) `claude` CLI session in the directory given by `--project-dir`
 * and reports the tool calls, their results, and the agent's own reasoning text in the order they
 * happened. Point `--project-dir` at a project kept intentionally empty (no CLAUDE.md, no source
 * files) to get a cold-start agent with the sudokumaker MCP tools registered but no project
 * knowledge biasing its behavior.
 *
 * On the first call for a given run, pass only `--prompt` and `--project-dir`; a session id is
 * generated and printed so a later call can resume the same agent with
 * `--resume <id> --prompt "..."`.
 */
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { program } from "commander";

interface StreamJsonToolUse {
  type: "tool_use";
  name: string;
  input: unknown;
}

interface StreamJsonText {
  type: "text";
  text: string;
}

type StreamJsonAssistantContent = StreamJsonToolUse | StreamJsonText;

interface StreamJsonToolResultTextContent {
  type: "text";
  text: string;
}

interface StreamJsonToolResultToolReferenceContent {
  type: "tool_reference";
  tool_name: string;
}

type StreamJsonToolResultContent = StreamJsonToolResultTextContent | StreamJsonToolResultToolReferenceContent;

interface StreamJsonToolResult {
  type: "tool_result";
  tool_use_id: string;
  content: StreamJsonToolResultContent[] | string;
}

/** Renders one tool_result content item - ToolSearch's matches come back as `tool_reference`, not `text`. */
const renderToolResultContent = (content: StreamJsonToolResultContent): string =>
  content.type === "text" ? content.text : content.tool_name;

interface StreamJsonEvent {
  type: string;
  message?: {
    content?: (StreamJsonAssistantContent | StreamJsonToolResult)[];
  };
  result?: string;
}

type ReportEntry =
  | { kind: "text"; text: string }
  | { kind: "tool_use"; name: string; input: unknown }
  | { kind: "tool_result"; text: string }
  | { kind: "final_result"; text: string };

/** Parses one `claude --output-format stream-json` line into report entries, in emission order. */
const parseStreamJsonLine = (line: string): ReportEntry[] => {
  const trimmed = line.trim();
  if (!trimmed) {
    return [];
  }

  let event: StreamJsonEvent;
  try {
    event = JSON.parse(trimmed) as StreamJsonEvent;
  } catch {
    return [];
  }

  const entries: ReportEntry[] = [];

  if (event.type === "assistant") {
    for (const content of event.message?.content ?? []) {
      if (content.type === "tool_use") {
        entries.push({
          kind: "tool_use",
          name: content.name,
          input: content.input,
        });
      } else if (content.type === "text" && content.text.trim()) {
        entries.push({ kind: "text", text: content.text });
      }
    }
  } else if (event.type === "user") {
    for (const content of event.message?.content ?? []) {
      if (content.type === "tool_result") {
        const inner = content.content;
        const text = Array.isArray(inner) ? inner.map(renderToolResultContent).join("\n") : inner;
        entries.push({ kind: "tool_result", text });
      }
    }
  } else if (event.type === "result" && event.result) {
    entries.push({ kind: "final_result", text: event.result });
  }

  return entries;
};

/** Renders parsed report entries as the interleaved tool-call/result/reasoning transcript. */
const renderReport = (entries: ReportEntry[]): string =>
  entries
    .map((entry) => {
      switch (entry.kind) {
        case "text":
          return `--- ASSISTANT TEXT ---\n${entry.text}`;
        case "tool_use":
          return `=== TOOL_USE: ${entry.name} ===\n${JSON.stringify(entry.input, null, 2)}`;
        case "tool_result":
          return `--- TOOL_RESULT ---\n${entry.text}`;
        case "final_result":
          return `=== FINAL RESULT ===\n${entry.text}`;
      }
    })
    .join("\n\n");

program
  .name("cold-start-claude")
  .description(
    "Launch a cold-start `claude` CLI agent against the sudokumaker MCP server and report its tool calls, results, and reasoning in order.",
  )
  .requiredOption("--prompt <text>", "The user-facing prompt to send")
  .requiredOption(
    "--project-dir <path>",
    "Directory to launch `claude` in - relative paths resolve against the current working directory",
  )
  .option("--resume <sessionId>", "Resume an existing session id instead of starting a fresh one")
  .action((options: { prompt: string; projectDir: string; resume?: string }) => {
    const projectDir = resolve(process.cwd(), options.projectDir);
    const sessionId = options.resume ?? randomUUID();
    const args = [
      "-p",
      options.prompt,
      "--allowedTools",
      "mcp__sudokumaker",
      options.resume ? "--resume" : "--session-id",
      sessionId,
      "--output-format",
      "stream-json",
      "--verbose",
    ];

    const result = spawnSync("claude", args, {
      cwd: projectDir,
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
    });

    console.log(`Session ID: ${sessionId}\n`);

    if (result.error) {
      console.error("Failed to launch claude:", result.error);
      process.exit(1);
    }

    const entries = result.stdout.split("\n").flatMap((line) => parseStreamJsonLine(line));

    console.log(renderReport(entries));

    if (result.status !== 0) {
      console.error(`\nclaude exited with status ${result.status}`);
      if (result.stderr) {
        console.error(result.stderr);
      }
      process.exit(result.status ?? 1);
    }
  });

program.parse();
