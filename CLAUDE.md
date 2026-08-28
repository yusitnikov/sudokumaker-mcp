# sudokumaker-mcp

An MCP server that controls [Sudoku Maker](https://sudokumaker.app) puzzles open in browser tabs.
The server runs in Node; everything that touches a puzzle runs inside the page. There is no HTTP API
and no database - the only channel into a tab is `execute_js`, provided by the
`@sitnikov/browser-automation` base server.

## How a tool call reaches the puzzle

`SudokuMakerMcpServer` (`src/SudokuMakerMcpServer.ts`) extends `BrowserMcpServer`. Its
`setupHandlers` registers every entry of the `tools` array (`src/client/tools/index.ts`) with the MCP
SDK, then dispatches each call like this:

1. The SDK validates the arguments in Node against the tool's **advertised** schema (see
   "Advertised vs. real schemas" below) and calls the handler.
2. The handler strips the three session fields (`sessionToken`, `extensionConnectionId`, `tabId`) and
   probes the tab for the page runtime: `window.__smMcp?.h`.
3. If the probe returns something other than the current build hash, the whole page bundle is eval'd
   into the tab first. The server computes that hash itself (`sha256` of the bundle, first 16 hex
   chars) because the bundle can't know its own; a rebuilt server therefore reinstalls automatically,
   as does a reloaded tab.
4. `window.__smMcp.call(name, params, {tabId})` runs the tool page-side. The extension
   JSON-stringifies whatever it returns, which is the tool's own `CallToolResult`.

A tool marked `global: true` (only `docs` today) skips all of that: no session, no tab, no page - it
runs in the Node process directly. `global` says nothing about where the file lives; `docsTool.ts`
sits in `src/client/tools/` with every other tool.

`tool.run` is where the **real** schema runs: `inputSchema.parse(params)` then
`inputSchema.encode(...)`, so the handler body always receives encoded (public-format) values.

## The page runtime bundle

`src/client/runtime.ts` is the page-side entry point. `vite.config.ts` carries a custom `injected`
plugin that resolves `import runtimeCode from "injected:./client/runtime"` by bundling that entry
in-process (iife, esbuild-minified) and handing back the generated code as a string constant. Nothing
is written to disk, and nothing is read out of `dist` at runtime.

The bundle is ~107 KB because it carries zod plus the whole puzzle schema graph - hence the
install-once-per-tab design rather than shipping it per call. The plugin asserts that the emitted
code contains the literal `window.__smMcp=`; minification would otherwise be free to drop an install
it thinks is unreachable, and that failure would only appear in the page, on dispatch.

Because the page bundle is what the plugin builds from `src/client/`, **anything imported from
`src/client/` ships to the browser** - including all of the docs text.

## Advertised vs. real schemas

The puzzle schemas are zod **codecs** that read grid geometry off `window.Api` (cell IDs are
computed from the grid's width, corner/edge IDs from the app's own helper objects). They describe
themselves fine in Node, but `.parse()` on the full schema would reach a codec's `decode` and throw
`window is not defined`.

`ToolImplementation.publicShape` (`src/client/tools/ToolImplementation.ts`) resolves this. It
projects the tool's real input object into a shallow zod object where each top-level parameter is
advertised by its own name, typed as `z.any()` but carrying the real field's JSON Schema as `.meta()`.
So the tool list shows real parameter names and shapes, while Node validates nothing that needs a
browser. Optionality is reapplied explicitly - `z.any()` still rejects a missing value in zod v4.

`withAdvertisedSchema(realSchema, advertisedSchema)` registers a hand-written replacement for a field
whose real schema is unusable on the wire - `add_element`'s `element` field is the 50+-branch element
union, replaced by a small `{type, subType, params, overrides}` object that points at the
`element:<TypeName>` docs topics for the actual shapes. The override lives in a private zod registry,
not in `.meta()`, so `tool.definition`'s JSON Schema still reflects the true shape.

## Public formats

The wire format is deliberately the format a puzzle setter speaks:

- **Cells are `"rXcY"` strings** (`CellIdPublic` in `src/SudokuMakerSchemas.ts`) - 1-based, counted
  from the top-left, and allowed to go to 0/negative/oversize for clues outside the grid.
  `parseCellNotation`/`formatCellNotation` are the one reader and writer; `CellId`, `CornerId`,
  `OuterCellId`, and both sides of `EdgeId` all ride on that string. `CornerId` names *the cell whose
  top-left corner is meant*, which its own `.describe()` spells out because the string is otherwise
  indistinguishable from a plain cell. `EdgeId` stays a 2-tuple of cell strings.
- **Cosmetic points stay `{x, y}` objects** - they are not cells, and their origin is the grid's
  top-left *corner*, offset by one from the cell numbering.
- **Cells arrive as a 2-D array** (`CellsArray`), though the app stores them flat.
- **Digit sets arrive as arrays** (`DigitSetSchema`), though the app stores them as bitmasks.

`getPuzzle()` (`src/client/utils.ts`) encodes the app's puzzle into that public shape and injects a
read-only `elementMetadata` per element (the app's own title/description for that exact config).
`updatePuzzle()` encodes, hands the public object to a callback, decodes the result, and copies it
back into the app's live object - the copy step is per-tool, because the app's object identity
matters to its reactivity.

## The formatting layer (`src/client/format/`)

Every human-readable rendering of puzzle data goes through one descriptor family. It runs page-side,
always on encoded values.

**`ObjectNode<T, RootT>`** wraps a value with the handle that reached it (`allElements.3.config.style`),
the whole puzzle as `root` (so `cells` can read `allElements` for its region separators), and an
**`ObjectDescriptor<T, RootT>`** with three members:

- `child(node, segment)` - one named child, for `resolveHandle`'s fold. Throws `NoSuchHandleError`
  naming what it *does* accept; the node that owns the vocabulary writes its own error text.
- `format(node, opts)` - this node's whole text. `opts.collapse` picks the one-line short form.
- `diff(from, to)` - this node against an older version of itself.

Descriptors are composed by hand along the known structure, never inferred from values or schemas:
`puzzleDescriptor` → `cellsDescriptor` and an array descriptor of `elementDescriptor` → per-type clue
descriptors looked up in the element registry. Anything unrecognized falls through to
`getUnknownDescriptor()`, which dispatches on runtime shape.

**Handles** are the only vocabulary for reaching collapsed data: dot-joined segments, except grid
nodes, which take cell notation (`cells.r2c3`, and `cells.r2` for a whole row) and never row/column
indices. A printed handle is exactly the segment chain that reached it, so it always resolves back.

**Grids** print one token per cell folding the cell's entire state - `*5` given, `[5]` solved, bare
digits candidates, `^` corner marks, `#` colors, leading `X` invalid, `.` empty - with `|` and `-`
separators read off the enabled `Regions` element. The `grid-notation` docs topic owns that grammar,
and every grid rendering ends with a line pointing at it.

**Diffs** omit what didn't change and print what did in place. Arrays are aligned by `renderDiff.ts`,
which pairs items by an explicit key where one exists (`allElements` by element ID) and reports one
that only changed position as a move rather than as a deletion plus an insertion.

**No descriptor does its own no-diff check.** The three entry points in
`src/client/format/puzzle/diffSummary.ts` - `puzzleDiffSummary`, `elementsDiffSummary`,
`cellsDiffSummary` - compare the two snapshots first and return a scope-specific "Nothing changed in
X." sentence instead of calling `diff()` at all. Nested `diff()` calls are already gated by
`diffChild`, so a descriptor's `diff` may assume something actually changed.

## Tool responses

Every mutating tool snapshots the puzzle before and after the write and answers with:

1. a sentence naming what happened **and the puzzle title** - a wrong-tab write is then visible
   immediately;
2. one of the three diff summaries, always preceded by a sentence saying what the block below is.

Solver tools additionally return the app's own log entries verbatim (`src/SudokuMakerLogs.ts` reads
`.LogsView` from the DOM), because the diff alone cannot carry a verdict. `undo`/`redo` open with the
app's own name for the action they reverted, read off the toolbar button's tooltip through Vue
internals (`src/SudokuMakerUndoRedo.ts`), and end by naming what the next undo/redo would do.

Both DOM readers are keyed only on literal source strings (`.LogsView`, `.UndoIcon`/`.RedoIcon`, the
`Tooltip` component's `text` prop) - never on `data-v-xxxxxxxx` scope-id hashes, which change every
rebuild.

Solver and check responses close with a blind-spot warning naming the elements the solver couldn't
see, an overwrite reminder on the runs that write, and a pointer to the `solving` topic - each
carried only by the tools it applies to, and only once the run has actually finished.

`ToolImplementation.run` catches whatever a tool throws and returns it as an `isError: true` result,
so a failure arrives as readable text instead of a rejected `execute_js` carrying a stack trace
through the minified bundle.

## Documentation (`src/client/tools/docs/`)

The server's guidance surface is three channels and nothing else: the advertised tool list, the
`instructions` field, and tool responses. The `instructions` field is one line telling the client to
read the `intro` topic first; everything else is fetched on demand through the `docs` tool.

Topics are registered in `topics.ts`. Their names live in `topicNames.ts` and are **always
interpolated, never retyped** - the same goes for tool names (`toolNames.ts`) and element type names
(`SomeElement.typeName`), so a rename can't leave a dangling reference in prose.

Hand-written topics: `intro` (terminology, the user persona, coordinates, tabs, plus a capability map
naming every other topic), `elements`, `solving`, `custom-constraints` (+ its two reference
sub-topics), `cosmetics`, `grid-notation`. Generated on demand from the same zod schemas that
validate: `element:<TypeName>`, one per element type (`elementTopic.ts`).

**Each subject is explained in exactly one topic**; every other surface links by name. Duplication is
a defect - two copies drift, and a reader can't tell which is authoritative. `intro` is the one
exception, and only in one direction: it may *name* a capability in a line so the LLM knows it exists,
never explain how it works.

An unknown topic name is not an error - it returns the compact index as a normal response.

## The element registry (`src/SudokuMakerElement.ts`)

One `SudokuMakerElement` instance per type (~50 of them), each carrying: its `ElementType` id and
`typeName`, a config `schema`, an optional `clue` descriptor (`{key, schema, getAffectedCells}`), a
`main` variant, and secondary `options` that share the config shape but differ in defaults and carry
a `detect` predicate. `AllElements` is the array; `getElementByTypeName`/`getElementByConfig` look
one up.

`element.clue` is what makes a type multi-clue. It is the single source for: which config key holds
the clues, that array's item schema, and which cells a given clue touches - the last drives clue
targeting (`updateCluesByCellGroups` in `elementUtils.ts`), diff labels, and the `## Clues` section of
the generated topic. A type with no `clue` descriptor is set as a whole through `update_element`.

`ElementConfigSchema` is a `SmartDiscriminatedUnion` over every type's schema
(`src/SmartDiscriminatedUnion.ts`): it rebuilds each branch as a flat `z.object` on both the input and
output sides so zod can discriminate on `type`, while still routing encode/decode through the
original schema.

`ZodDeepPartial` (`src/DeepPartial.ts`) derives the partial-update variant of any schema, used by the
`*Updates` fields. Arrays are never made partial - an array-valued field replaces the whole array.

## Working on this repo

- `npm run lint` = `eslint . && tsc --noEmit`. `npm run build` = `tsc && vite build`.
- `npm test` = `vitest run` (`npm test -- --coverage` for coverage). Tests are `src/**/*.test.ts`.
  `vitest.config.ts` is deliberately separate from `vite.config.ts`, so a test run doesn't load the
  `injected` plugin and rebuild the page bundle in-process.
- The server is launched from source via `vite-node`, not from `dist`. After editing server source,
  the live MCP connection is stale until the user reloads it - don't call the live tools to verify a
  change until they confirm.
- **Never work around a type error.** No `any`, no false casts, no suppressions. The few `any`s that
  do exist are at genuine heterogeneous boundaries (a clue's shape depends on which of ~50 element
  types it belongs to, resolved only at runtime) and are commented as such.
- Fetch library documentation through context7 rather than guessing an API.
