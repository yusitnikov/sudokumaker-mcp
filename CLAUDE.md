# sudokumaker-mcp

An MCP server that controls [SudokuMaker](https://sudokumaker.app) puzzles open in browser tabs.
The server runs in Node; everything that touches a puzzle runs inside the page. There is no HTTP API
and no database - the only channel into a tab is `execute_js`, provided by the
`@sitnikov/browser-automation` base server.

## How a tool call reaches the puzzle

A call crosses three layers, one file each:

- `SudokuMakerMcpServer` (`src/SudokuMakerMcpServer.ts`) extends `BrowserMcpServer` and registers
  every entry of the `tools` array (`src/client/tools/frontendTools.ts`) with the MCP SDK. The SDK validates
  arguments against the tool's **advertised** schema (see "Advertised vs. real schemas" below); the
  handler splits off the session fields (`sessionToken`, `extensionConnectionId`, `tabId`) and
  calls `tool.runOnBackend`.
- `TabController` (`src/TabController.ts`) is the only thing that talks to a tab. It installs the
  page runtime if that tab doesn't already carry this build's, then calls one method of one tool on
  it. The installation is guarded by a build hash the server computes and stamps on itself, so a
  rebuilt server and a reloaded tab both reinstall on their own.
- `Runtime` (`src/client/runtime.ts`) receives the call page-side and looks the tool up by name.

## A tool runs in two realms

One tool class, two live instances: one in Node, one in the page bundle, with the whole `src/client/`
source compiled into both. They are not one object - **only JSON crosses between them**, so a field
set page-side is invisible in Node, and a tool keeps no state across the two.

A tool call is therefore a conversation of several `execute_js` round trips, not one dispatch, and
`FrontendToolImplementation.runOnBackend` is the fixed script for it: validate the params page-side,
run the tool's own logic, then ask the page what changed while that ran, so a concurrent edit lands
in the response as a `[WARNING]`. A subclass fills in the middle step; `SimpleFrontendToolImplementation`
is the one-round-trip case almost every tool uses. Which realm a method runs in is in its name
(`...OnBackend` / `...OnFrontend`), and `callFrontend` accepts only the latter - typed off the class,
so a page-side call is checked at compile time.

Splitting on the class rather than per tool is what lets a tool do work in both realms: keep the body
page-side where `window.Api` is, and still have Node steps around it - `BackendToolImplementation`
(no tab at all, `docs` alone today) and `checkPuzzleOnBackend` (inspect the written puzzle back in
Node) are the two ends of that range.

Tool bodies run as methods of the page-side instance, so **a tool body that touches the tab is a
`function`, never an arrow**.

Anything a backend step needs that must stay out of the page arrives as a `BackendResources`
argument threaded through every `...OnBackend` method, never as an import - importing it from a tool
would inline it into the page bundle (`src/BackendResources.ts`).

The **real** schema runs page-side, in `validateParams`: `inputSchema.parse(params)` then
`inputSchema.encode(...)`, so the tool body always receives encoded (public-format) values.

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

Free-form JSON fields use `jsonValue` (`src/jsonValue.ts`) instead of `z.any()`/`z.unknown()`: those
two emit a typeless JSON-Schema node, which makes at least one real MCP client stringify the value
before sending it.

## Public formats

Where a schema is a codec, it is written `z.codec(<X>Public, <X>Internal)`: **input is the public
format, output is the app's internal one**, so `.decode()` goes public→internal and `.encode()`
internal→public. Internal values enter only through `window.Api.getPuzzle()` and the `updatePuzzle`
updater, and only two places use them: the copy step below, and the codecs in
`src/SudokuMakerSchemas.ts` that read grid geometry off the live puzzle. Everything else - tools,
formatting, docs - is public format. `window.Api` itself is typed only by hand-written ambient
declarations (`src/SudokuMakerApi.ts`), which the compiler cannot check against the real app -
a green build proves nothing about the page API.

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
- **Long text arrives as an edit operation**, not as the whole new text: the `editTextOperation`
  union in `src/client/tools/editText.ts` (write/edit/appendLines/prependLines) is shared by every
  tool that edits a free-text field, such as the rules text or a `Custom` element's code.

`getPuzzle()` (`src/client/tabState.ts`) encodes the app's puzzle into that public shape and injects a
read-only `elementMetadata` per element (the app's own title/description for that exact config).
`FrontendToolImplementation.updatePuzzle()` encodes, hands the public object to a callback, decodes the
result, and copies it back into the app's live object - the copy step is per-tool, because the app's
object identity matters to its reactivity.

## Tab state (`src/client/tabState.ts`)

A tool never reads the tab twice to build a before/after pair. Instead `TabState.read()` takes one
snapshot - the puzzle, the undo/redo labels, and the solver log - and pairs it with the snapshot the
*previous* tool call left behind on `window.__smMcp.lastTabStateSnapshot`. Because that baseline
outlives an `execute_js` call, "before" means *before this tool call*, and the user's own edits in the
app's UI count as changes just as much as the server's do. `TabState` is that pair plus a `*Changed`
flag per part, and it is what every diff summary and every response is written from.

That makes a change detected under a tool an event to act on, not just something to print:
`checkPrevTabState` rejects the call with a `TabStateChangedError` carrying the diff (`undo`/`redo`
reject on *any* part changing, since a stale label would name the wrong action), a change that lands
while the tool runs is folded into its result as a `[WARNING]`, and a different puzzle loaded into the
tab always rejects and reports the whole new state, there being nothing meaningful to diff against.

Reads and writes therefore live on `FrontendToolImplementation`, not in free functions -
`checkPrevTabState`, `updatePuzzle`, `updateCluesByCellGroups`. `updatePuzzle` dry-runs its callback
against a copy before letting it near `window.Api`, so a rejected write leaves no half-applied edit
and no spurious undo entry; a tool signals any failure by throwing, and `runOnFrontend` renders it.

## The formatting layer (`src/client/format/`)

Every human-readable rendering of tab state goes through one descriptor family - the puzzle and the
solver log alike. It runs page-side, always on encoded values.

**`ObjectNode<T, RootT>`** wraps a value with the handle that reached it (`allElements.3.config.style`),
the whole puzzle as `root` (so `cells` can read `allElements` for its region separators), and an
**`ObjectDescriptor<T, RootT>`** with three members:

- `child(node, segment)` - one named child, for `resolveHandle`'s fold. Throws `NoSuchHandleError`
  naming what it *does* accept; the node that owns the vocabulary writes its own error text.
- `format(node, opts)` - this node's whole text. `opts.collapse` picks the short form, which is
  always exactly one line.
- `getSummary(node)` - optional shorter fallback for when even that line doesn't fit; `ObjectNode.getSummary` picks.
- `diff(from, to)` - this node against an older version of itself.

Descriptors are composed by hand along the known structure, never inferred from values or schemas:
the snapshot descriptor (`format/tabState/`) → `puzzleDescriptor` → `cellsDescriptor` and an array
descriptor of `elementDescriptor` → per-type clue descriptors looked up in the element registry.
Anything unrecognized falls through to `getUnknownDescriptor()`, which dispatches on runtime shape.
`RootObjectNode` is the entry point for a value nothing else contains, and is read-only, as every
snapshot is.

**Handles** are the only vocabulary for reaching collapsed data: dot-joined segments, except grid
nodes, which take cell notation (`cells.r2c3`, and `cells.r2` for a whole row) and never row/column
indices. A printed handle is exactly the segment chain that reached it, so it always resolves back.

**Grids** print one token per cell folding the cell's entire state - `*5` given, `[5]` solved, bare
digits candidates, `^` corner marks, `#` colors, leading `X` invalid, `.` empty - with `|` and `-`
separators read off the enabled `Regions` element. The `grid-notation` docs topic owns that grammar,
and every grid rendering ends with a line pointing at it.

**Diffs** omit what didn't change and print what did in place. `diff.ts` matches an array's items
by an explicit key where one exists (`allElements` by element ID) and reports one that only changed
position as a move rather than as a deletion plus an insertion. An array whose items are opaque
records rather than things that can be edited in place - the solver log - turns `canEditItems` off,
so a changed item reads as a removal plus an addition instead of an edit.

**No descriptor does its own no-diff check.** The three entry points in
`src/client/format/puzzle/diffSummary.ts` - `puzzleDiffSummary`, `elementsDiffSummary`,
`cellsDiffSummary` - each take the `TabState` and return a scope-specific "Nothing changed in X."
sentence, both when that scope is equal across the pair and when there is no previous snapshot at all,
instead of calling `diff()`. Nested `diff()` calls are already gated by `diffChild`, so a descriptor's
`diff` may assume something actually changed.

## Tool responses

Every mutating tool answers from the `TabState` it took after the write:

1. a sentence naming what happened **and the puzzle title** - a wrong-tab write is then visible
   immediately;
2. one of the three diff summaries, always preceded by a sentence saying what the block below is.

Solver tools additionally report the app's own log (`src/SudokuMakerLogs.ts` reads `.LogsView` from
the DOM), because the diff alone cannot carry a verdict. Some solver actions append to that log and
others replace it outright, so what a run did is read off the log's own diff rather than by comparing
lengths; entries are paired by the app's markup, which is an entry's identity and folds in every
other field it has. `undo`/`redo` open with the app's own name for the action they reverted, read off
the toolbar button's tooltip through Vue internals (`src/SudokuMakerUndoRedo.ts`), and end by naming
what the next undo/redo would do.

Both DOM readers are keyed only on literal source strings (`.LogsView`, `.UndoIcon`/`.RedoIcon`, the
`Tooltip` component's `text` prop) - never on `data-v-xxxxxxxx` scope-id hashes, which change every
rebuild.

Solver and check responses close with a blind-spot warning naming the elements the solver couldn't
see, an overwrite reminder on the runs that write, and a pointer to the `solving` topic - each
carried only by the tools it applies to, and only once the run has actually finished.

The code-editing tools close with the problems the snippet checker found, as a `[WARNING]`.

`runOnFrontend` catches whatever a tool throws and returns it as an `isError: true` result, so a
failure arrives as readable text instead of a rejected `execute_js` carrying a stack trace through
the minified bundle; `runOnBackend` does the same for a failed round trip. That is the only way a
tool reports a failure - no tool assembles an error result itself.

## Checking a snippet (`src/client/tools/typecheckSnippet.ts`, `src/typescript/`)

A tool that writes code typechecks what it wrote against the scanned declarations and reports the
problems the way `tsc` prints them. **The edit lands either way** - the declarations are recovered
from a minified app, so a false positive must never block a real edit.

`SnippetTypescript` is the shared checker, one subclass per scope. A scope supplies its globals and
may override `annotate` to inject declarations, map the resulting spans back to the author's lines,
and add findings of its own. The two scopes declare different `helpers`, so they can never be
compiled together.

**A snippet is checked as JavaScript**, which is what the worker runs - so a construct that is
ordinary JS may be reported only if a type annotation could fix it. Reassigning a variable to
another type qualifies, the author having `/** @type */` as the remedy; anything with no
annotation-shaped remedy is a false positive, and the declarations are what to fix.

**A hook's parameters are typed from the hook table, and the author's own JSDoc sharpens that.**
Untyped code a setter already wrote has to keep compiling, so what the table cannot know - the
constructor arguments two of the hooks receive, the members `setParams` puts on `instance` - stays
permissive on its own: `instance` takes any member at all, so a typo in one is invisible. An author
who says what those are gets them checked, and an ordinary `@param` is all it takes. Tagging
`instance` is what closes it to anything undeclared, so the typo is finally reported - that is the
point of tagging it, and any tag does it. A tag is written once, in whichever hook it reads best in:
the hooks share the values they receive, so one `ResolvedArgument` per constructor position collects
what every hook declared about it, and the instance likewise. Nothing here is a convention of ours to
learn, which is what lets an LLM tighten a component by documenting it.

**That list is also the component's public signature**, so a tag types every `new` of the component
as well as its own body. Both checkers therefore take the element's whole `customComponents` map, not
the one snippet they are checking: the initialization code is checked against a
`class <Name> extends Component` per component, and a component against the `customComponents`
global, which is how one constructs another.

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

The guidance surface is tested end to end by `utils/coldStartClaude.ts`, which launches a fresh,
uncoached `claude` CLI session against the server and renders its stream-json transcript readable.

## The element registry (`src/elements`)

One `SudokuMakerElement` instance per type (~50 of them), each carrying: its `ElementType` id and
`typeName`, a config `schema`, an optional `clue` descriptor (`{key, schema, getAffectedCells}`), a
`main` variant, and secondary `options` that share the config shape but differ in defaults and carry
a `detect` predicate. `AllElements` is the array; `getElementByTypeName`/`getElementByConfig` look
one up.

`element.clue` is what makes a type multi-clue. It is the single source for: which config key holds
the clues, that array's item schema, and which cells a given clue touches - the last drives clue
targeting (`FrontendToolImplementation.updateCluesByCellGroups`), diff labels, and the `## Clues` section of
the generated topic. A type with no `clue` descriptor is set as a whole through `update_element`.

`ElementConfigSchema` is a `SmartDiscriminatedUnion` over every type's schema
(`src/SmartDiscriminatedUnion.ts`): it rebuilds each branch as a flat `z.object` on both the input and
output sides so zod can discriminate on `type`, while still routing encode/decode through the
original schema.

`ZodDeepPartial` (`src/DeepPartial.ts`) derives the partial-update variant of any schema, used by the
`*Updates` fields. Arrays are never made partial - an array-valued field replaces the whole array.

## The scanned worker scope (`utils/scanSmCode.ts` → `src/generated/`)

Custom-constraint code runs in SudokuMaker's own worker scope, which has no published types. The
scanner reads that scope out of a live tab - so regenerating needs one open - and emits the
declarations the snippet checkers typecheck against. Everything under
`src/generated/` is output; never edit it.

The app is minified, so what a scanned body reveals is limited and often wrong in the details.
**`utils/scanSmCode/functionSignatures.ts` is the hand-reviewed correction layer**: entries marked
`processed: true` survive regeneration, everything else is overwritten each run by what the scanner
inferred. Whatever can't be expressed there - members `getOwnPropertyNames` can't see, internals
only reachable through minified aliases, the `number` aliases that separate a cell id from a digit
from a bitmask - is hardcoded in the emitter alongside them.

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
