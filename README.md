# SudokuMaker MCP

An MCP server for editing [SudokuMaker](https://sudokumaker.app) puzzles open in the browser.

It is built on [`@sitnikov/browser-automation`](https://github.com/yusitnikov/websocket-mcp),
which reaches the browser through a Chrome extension and a local WebSocket connection broker.

## Setup

**1. Install the Chrome extension.**

Download [browser-automation-extension.zip](https://github.com/yusitnikov/websocket-mcp/releases/download/extension-0.1.0/browser-automation-extension.zip),
unzip it, and load the unzipped folder in Chrome:
open `chrome://extensions`, turn on "Developer mode", click "Load unpacked",
and pick the `browser-automation-extension` folder (containing the `manifest.json` file).

**2. Start the connection broker:**

```bash
npx @sitnikov/connection-broker
```

**3. Add the server to your MCP client**, e.g. Claude Desktop:

```json
{
    "mcpServers": {
        "sudokumaker": {
            "command": "npx",
            "args": ["-y", "sudokumaker-mcp"]
        }
    }
}
```

Options:

- `--broker <url>` - WebSocket URL of the connection broker (default `ws://localhost:3004`)
- `--log <file>` - write a log file (omitted by default)

## Usage

Open a puzzle on sudokumaker.app and ask the client to work on it.
On the first call the server asks for access to sudokumaker.app tabs,
and the browser shows an approval dialog with a session code to compare against the one in the chat.
The server can reach only sudokumaker.app tabs, and it can't run arbitrary JavaScript in them.

## License

MIT