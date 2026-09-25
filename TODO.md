# TODO

## Medium priority

### add_element singleton refuse list and empty-multi-clue hint

In `add_element`:

1. Adding a second instance of a single-instance type is refused, and the refusal carries the existing element's ID.
   The refuse list is hardcoded — `SudokuRules`, `Givens`, `Antiking`, `Antiknight`, `DisjointGroups`,
   `Nonconsecutive`, `Regions`, `DiagonalMinus`, `DiagonalPlus` — because several no-clue types legitimately repeat
   (`Custom`, `GlobalEntropy`, `DifferentValues`, styled cosmetics, clones).

2. The empty-multi-clue hint: `add_element` returns the new element's ID, and for a multi-clue type appends
   "created with 0 cages — add them with `add_clues` (clue shape: docs `element:KillerCages`)".
   This is the detection for "multi-clue element left empty", and it also exposes the case where
   the caller stuffed clues into `add_element` overrides in a wrong shape and nothing landed.

Plan's check for this item: the refusals fire.

### Give Regions a targeted per-cell write path

Regions' `regions` config field is one grid-wide region-number-per-cell mapping (`CellsArray`), not an array of
independently addressable items — it does not fit the `ClueDescriptor` model (`key`/`schema`/`getAffectedCells`) at all,
since there is no "item" to key on. `update_element`'s deep-partial merge does not descend into arrays either, so today
the only way to change even one cell's region assignment is to resend the entire grid-wide mapping via `update_element`
(or the raw `update_puzzle` escape hatch).

Needs its own design: likely a dedicated tool or a special-cased `update_element` path that accepts a sparse list of
`{cell, region}` pairs and merges them into the existing mapping, rather than requiring the whole grid. Not a clue-array
fit — do not attempt to force this into the `ClueDescriptor` mechanism.

Split out from the "refactor elements to use clue descriptors" task, where Regions was originally flagged as a type
needing per-type evaluation; confirmed by audit that it categorically does not fit that mechanism and needs a separate
solution.

### Fix the missing cell-handle lookup path for CosmeticLine clues past the first 4

The real issue is a genuine formatting gap, not a reasoning problem in the LLM callers: there is no way to get a clue's
authoritative cell-handle summary (e.g. "r4c3 r3c3 r2c3 r1c3 r1c2 r1c1 r2c1") for any CosmeticLine clue past the first
4, short of drilling into raw point data and re-deriving cell membership by hand.

The concrete breakage, reproduced live on the "cosmetics" puzzle (9x9 grid, ~19-20 free-hand cosmetic-line clues, the
established size/complexity stress test for this element):

- `get_puzzle(path: "allElements")` prints only the first 4 items of `config.lines`, each with its correct cell-handle
  summary line (e.g. "r2c1 r3c1 r4c1 r4c2"), then collapses the rest behind "... 16 more items <collapsed, full content
  at path allElements.3.config.lines>".
- Following that path — `get_puzzle(path: "allElements.3.config.lines")` — re-lists all items, but now EVERY item
  (including the first 4, which had handles a moment ago) shows only a raw preview of its first several {x,y} points
  plus "... N more items <collapsed, full content at path ...lines.K>". The cell-handle summary is gone entirely at this
  level.
- The only way to recover a specific clue's cell-handle summary is to drill into that one clue by its exact index
  (`allElements.3.config.lines.K`) — but that request also returns raw points only, never the cell-handle summary. There
  is in fact NO response anywhere in get_puzzle that prints a clue-by-clue cell-handle list beyond the first 4 items of
  the top-level allElements view.

This is what actually caused both observed failures, not carelessness:

- Asked "how many lines pass through r7c7?", an agent could not get handle-based confirmation for clues past the 4th, so
  it fetched raw points for a handful of candidates by index and guessed cell membership geometrically, missing one of
  the two real matches.
- Asked "how many lines pass through r4c3?", a second agent exhaustively fetched all 20 clues' raw points (since no
  handle summary was ever available for them) and manually computed cell membership — correctly noticing a point sat
  exactly on a shared corner, but wrongly judging that as "not a real pass-through" since nothing told it the server's
  own corner/edge-touch convention.

The one place the true membership data actually exists and is easy to reach is `remove_clues` matching a cell that
doesn't exist, which lists every clue's real affected-cells set as an error-message side effect — undocumented, and only
reachable through a call that looks destructive.

Scope: give every CosmeticLine clue (not just the first 4) a reachable cell-handle summary in `get_puzzle`'s output, at
whatever level of the tree a caller drills into — so a reader is never forced to fall back to raw point geometry to
learn which cells a clue's line touches. Also worth deciding, once the lookup exists: whether the corner/edge-touch
counting convention (a point exactly on a shared corner touches all 4 adjacent cells) should be documented plainly at
the point it's shown, since it is the one convention a purely geometric reading gets wrong even when done carefully.

### Response headings name a Custom element by its type, not its name

Reproduced live on the "test here" tab, with a `Custom` element named "New constraint" (ID 10).
The opening sentence of these responses called it "Custom":

- `add_custom_component`: `Added custom component "TestComponent" to "Custom" in puzzle "test here".`
- `edit_initialization_code`: `Updated "Custom"'s initialization code in puzzle "test here".`
- `remove_element`: `Element "Custom" of type "Custom" removed from position 3 in puzzle "test here".`

The diff below each of them shows the same element as `"New constraint" (type Custom, ID 10)`.
The heading exists so that a write to the wrong element or tab is visible at once, and naming the type defeats that
when a puzzle has more than one `Custom` element.
Other element types and the other code-editing tools weren't checked.

## Low priority

### Make the site meta description reach the intro topic

`siteDescription` in src/client/tools/docs/intro.ts reads `<meta name="description">` from the page, but the intro topic
always renders in Node, where `document` doesn't exist — so it always degrades to "" and the served topic shows a blank
line under the "# Sudoku Maker software description" heading. The feature never delivers its content.

Options to pick from (needs a decision, not a silent drop):

- fetch the meta description page-side and cache it in Node (the docs tool is global: true, so it has no tab; some other
  tool call would have to supply it), or
- have the topic render page-side when a tab is available and fall back in Node, or
- hardcode the sentence in the topic (what the refactor plan's risk list suggested).

The plan's risk list already flags this: "The old header's site <meta> description was always empty in Node; dropped
(hardcode a sentence in `intro` if wanted)." Confirmed live: the blank line is visible in the served `docs("intro")`
output.

### QuadrupleElement's clue `corner` field description doesn't explain the convention

In SudokuMakerElement.ts, QuadrupleElement's clue schema field `corner` is described only as "Quadruple position"
(CornerId.describe ("Quadruple position")). It doesn't say which corner of the 4 candidate cells it anchors, or that
`digits` are shared among the 4 cells surrounding that corner rather than assigned to the corner point itself. Fix:
rewrite the `.describe()` text on that field to state the convention explicitly. Model to follow: ArrowElement's
`bulbCells`/`arrows` fields already do this well (real, specific `.describe()` text explaining the
first-arrow-cell-repeats-bulb-cell convention).

### DoubleArrowElement's clue schema doesn't say which line-end is which circle

In SudokuMakerElement.ts, DoubleArrowElement's clue is the inherited generic line-cells shape (`lines: CellId[]`, via
LineClue). No field description says which end of the `lines` array is the "start" circle vs. the "end" circle that
main.description refers to ("the sum of the digits along a double arrow line is equal to the sum of the digits in the
circles at either end of the line"). Fix: add a description clarifying that the first and last cells of the array are
the two circled endpoints.

### BetweenLinesElement/LockoutLinesElement clue schemas don't say which cells are the endpoints

In SudokuMakerElement.ts, BetweenLinesElement and LockoutLinesElement both use LineWithEndPointsStyle for styling (which
describes endpoint *appearance*: size, fill, stroke) but their clue schema (`lines: CellId[]`, generic line-cells shape)
has no field explaining that the first and last cells of the line array *are* the two endpoints referenced by each
rule's text ("the digits on the circled ends of the line"). Fix: add a description on the clue schema (or a shared one
if LineWithEndPoints-style elements share this convention) stating that the first/last array entries are the endpoints.

### Handle out-of-range coordinates in CornerId/OuterCellId/EdgeId's codecs

Low priority. Only cellIds has a "safe" coordinate lookup (getIdFromCoordsSafe, returns undefined instead of throwing
for out-of-grid coordinates) - CellId's codec (SudokuMakerSchemas.ts) already uses it to turn out-of-grid cells into a
proper zod issue instead of an uncaught throw. CornerId (via cornerIds.getIdFromCornerCoords), OuterCellId, and EdgeId
(both via the shared unsafe getCellCoordsCodecParams/edgeIds.getIdFromCoords) still call the unsafe lookup and have no
equivalent handling. Revisit once safe variants exist for those helpers, or another approach is decided.

### update_cell_marks: candidates/cornerPencilMarks/colors render malformed nested allOf/$ref

All three of update_cell_marks' mark fields (`candidates`, `cornerPencilMarks`, `colors`) - not just `colors` - render
as a malformed `"allOf": [{"$ref": ..., "description": ...}]` in the advertised JSON Schema. Confirmed by a full sweep
of all 19 tools' schemas: this pattern appears nowhere else. Root cause: all three are built in `updateCellMarksTool.ts`
as `CellSchemaNoId.shape.<field>.optional().describe(...)` - a second `.describe()` layered on top of a schema that's
already `.meta({id: ...})`-registered in the global registry (`DigitSetSchema`/`ColorsSet` in `SudokuMakerSchemas.ts`).
The emitter can't attach a new sibling description directly to a `$ref` node, so it wraps both in `allOf`. Per JSON
Schema draft-07 (declared via these tools' own `$schema`), sibling keywords next to `$ref` may be ignored by strict
validators, so the outer description (including "Omit to leave X untouched") could be silently dropped by some clients.
Fix: don't re-`.describe()` an already-registered schema at the tool-field level - either drop the outer `.describe()`
and let the registered description stand alone, or restructure so the tool-specific addition doesn't collide with the
`$ref`.

### intro: forbid array indices and handles in user-facing speech

Found in a cold-LLM behavior test. Asked to "make the cosmetic symbol in the top-left corner twice as big", the agent
found two candidate symbols and asked the user:

> "Which one did you mean — the clue above r1c1 (index 0), or the one to the left of r1c1 (index 5)?"

The "index 0" / "index 5" part is an array position in the puzzle JSON. A puzzle setter has no way to know or check it,
and per the persona contract they don't read JSON at all.

Notably the agent was *trying* to comply: it gave cell-relative descriptions ("above r1c1", "left of r1c1") exactly as
`intro`'s coordinate section requires, then appended the index as a disambiguator. The rule it followed (intro.ts:
207-210) says "when talking to the user, always use cell coordinates and Snider notation, even when referring to
arbitrary points on the grid" - it is scoped to *coordinates*, and says nothing about the other technical vocabularies
the server hands out: array indices, handles (`allElements.3.config.symbols.0`), element IDs, tab IDs.

Fix in `intro`, in the persona/coordinates area: state that handles, array indices and internal IDs are addressing
vocabulary for tool calls only, and never appear in a sentence addressed to the user - identify a clue by what the user
can see (its value and where it sits: "the 12 above column 1"). The element data needed for that is already in the
summary; this is a docs gap, not a rendering one.

Keep it short - `intro` is the always-read topic and is already long. Consider whether it belongs as one clause on the
existing line 207 rule rather than a new section.

Verify by re-running the same behavior test and reading how the agent phrases its question.

### Add a way to reorder an existing element, and a clue within an element, without destroy-and-recreate

Audit confirmed: add_element's `position` param only applies at creation time (splice-insert); remove_element only
deletes. There is no dedicated way to move an already-existing element to a new position in `allElements` (element order
affects layering, per add_element's own doc comment). Today, repositioning an existing element means either destroying
and recreating it (which discards its numeric id and forces re-adding all its clues) or using update_puzzle's raw
modifyItems on the allElements path.

The same gap exists one level down, for clues: add_clues appends at the end only (addCluesTool.ts), and neither
update_clues nor remove_clues moves a clue, so the order of an element's clue array can't be changed or a clue inserted
at a position. Whether the order is visible depends on the element type, but update_clues' positional matching
(elementUtils.ts) already exposes it. Today the only way is remove_clues + add_clues, or update_puzzle's modifyItems on
the clue array path.

### Explore IntelliJ's diff implementation for ideas

Look at IntelliJ Community's diff implementation
(https://github.com/JetBrains/intellij-community/tree/master/platform/util/diff/src/com/intellij/diff) for ideas
applicable to this project's own diff/format layer (src/client/format/diff.ts and friends — array alignment, move
detection, etc.).

Check if it's able to detect small changes in large lines and match the changed lines properly.

### Design multi-clue-slot support for FogTriggers' triggers/effects

FogTriggers has two independent array-shaped config fields - `triggers` and `effects` - each shaped as
`{label: string, cells: CellId[]}[]`, each independently a clean fit for the `ClueDescriptor` model
(`getAffectedCells = (item) => item.cells` works trivially for either one alone).

The blocker: `SudokuMakerElement`/`ClueDescriptor` only support one named clue array per element (`this.clue` is a
single optional field, not a list). Giving FogTriggers clue-array tooling (`add_clues`/`update_clues`/`remove_clues`)
for both fields needs either extending the class to support multiple named clue slots, or a product decision to treat
only one of the two as "the" clue array and leave the other as a plain config field (whole-array-replace via
`update_element`).

`patterns` and `overrides` on the same element are flat scalar/cell arrays, not collections of independent items - out
of scope here.

Split out from the "refactor elements to use clue descriptors" task, where this was flagged as an open design gap rather
than a straightforward per-type wiring job.

### Give Clone a clue descriptor, after verifying groups' semantics live

Clone's `groups` field (`z.array(z.array(CellId))`) is mechanically a trivial fit for the `ClueDescriptor` model - each
item is already `CellId[]`, so `getAffectedCells = (group) => group` needs no transformation.

Before wiring it up: the schema itself carries `// TODO: how does it work?` on this field, and the element's one-line
description ("the arrangement of digits in a part of the sudoku must be the same elsewhere") doesn't settle whether one
`group` = one independent clue (matches the natural "one group = one clue-array item" reading) or whether the *whole*
`groups` array is one indivisible clone relationship where 2+ regions must all mutually match. Verify against the live
Sudoku Maker app's Clone element editor UI (does it present groups as a list of separately addable/removable rows, or as
one relationship?) before committing to the clue-array mapping - if the "whole array is one clue" reading is correct
instead, this needs different handling, not a clue descriptor.

Split out from the "refactor elements to use clue descriptors" task.
