import type { DocsTopic } from "./topics";
import {
  cosmeticsTopicName,
  customComponentsTopicName,
  customConstraintsTopicName,
  digitSetTopicName,
  elementTopicPrefix,
} from "./topicNames";
import { addCluesToolName, removeCluesToolName, updateCluesToolName } from "../toolNames";
import { CustomElement } from "../../../elements/CustomElement";
import standardComponents from "../../../generated/standardComponents.json";

export const customConstraintsTopic: DocsTopic = {
  name: customConstraintsTopicName,
  description: "How to write a custom constraint: standard components, initialization code, input groups, visuals.",
  // language=markdown
  content: () => `
# Custom constraints

*Custom constraint* is a flexible tool to implement any user-defined logic in the puzzle
by writing JavaScript code snippets that perform the desired logic.

## **IMPORTANT - LLM GUIDELINES**

You (the LLM) **must** follow these rules when working the custom constraints:
- **You should prefer built-in functionality over writing custom code**:
  - **Before writing a custom constraint, STOP** - can your goal be achieved with **built-in puzzle elements**?
  - **Before writing a custom component, STOP** - can your goal be achieved with **built-in components**?
- **You should communicate every piece of logic** that you're implementing to the user.
  You should ask user's confirmation that you understood the logic correctly,
  and only then proceed with the implementation.
- **You should NOT communicate technical implementation details** to the user.
  The user doesn't care about the code, they don't care about internal formats,
  they don't care about the error messages. They only care about the puzzle's logic.
- **You should use only things described in this documentation**.
  You should **never make up** class names, helper functions, data formats.
  If something is not described in this documentation, it likely does not exist!
- You should use your best judgement of **how to define the input groups in the most convenient way**,
  and **communicate this convention to the user** who will use the constraint.
  In general, if the constraint is applied to the whole grid according to some pre-defined pattern,
  then it should be a global constraint; but if the placement and parameters of every clue is defined by user,
  then it's better to use input groups (rather than hardcoding the cells and parameters in the initialization code).

## Basics

### Composing custom constraints out of components and initialization code

Custom constraint consists of one or more *components* - basic units of logic,
and the *initialization code* - code snippet that adds the components to the puzzle.

The purpose of a component is to perform a piece of logic applied to a set of cells
(e.g. digits in the cells are different, digits in the cells are consecutive,
digits in the cells strictly increase, digits in the cells sum to a certain value, etc.).
The purpose of the initialization code is to define which components apply to which grid cells and with which parameters
(e.g. digits in r2c3, r2c4 and r3c4 are different, digits in r5c7 and r6c8 have a ratio of 1:3, etc.).

Complex constraints might use several components to achieve the desired logic.
For instance, the "killer cage" constraint (which is "digits in a cage are different and sum to the cage's clue")
could be combination of 2 components, each of them performing simpler logic:
1. The digits in the specified cells are different.
2. The digits in the specified cells sum to the specified value.

Constraints could be also a combination of the same component, applied to different cells.
For instance, the "German whispers" constraint
(which is "digits in any 2 consecutive cells on a green line have a difference of at least 5")
could be implemented as applying the "minimal difference" constraint to every pair of consecutive cells independently,
i.e. if the German whispers line is r2c2-r3c3-r4c4-r5c5, then the applied components would be:
- digits in r2c2 and r3c3 have a minimal difference of 5
- digits in r3c3 and r4c4 have a minimal difference of 5
- digits in r4c4 and r5c5 have a minimal difference of 5

### Standard components

SudokuMaker supports the following *standard components* out of the box:
${standardComponents
  .map(
    (component) =>
      `- \`${component.name}${component.definition}\`\n  ${component.description.split("\n").join("\n  ")}`,
  )
  .join("\n")}

### Initialization code, input groups and global constraints

Initialization code would add instances of the components to the puzzle using the \`addConstraintComponent\` method,
e.g. the killer cage implementation could look like the following:
\`\`\`
for (const { cells, value } of input.groups) {
  const name = 'killer cage in ' + helpers.naming.getCellsDescription(cells);
  puzzle.addConstraintComponent(new DifferentDigitsComponent(name, cells));
  puzzle.addConstraintComponent(new SumComponent(name, Number(value), cells));
}
\`\`\`

The example above uses *input groups* to define where to apply the custom constraint and with which parameters.
Input groups are objects that specify where to apply the constraint - the user defines them in the UI,
and you edit them as the element's clues with \`${addCluesToolName}\`, \`${updateCluesToolName}\` and \`${removeCluesToolName}\`
(topic \`${elementTopicPrefix}${CustomElement.typeName}\` gives their exact shape).
Each input group consists of an array of \`cells\` in the grid and optional string \`value\` that describes the constraint's parameters in a user-defined way.
The initialization code should go over all input groups (they are available as \`input.groups\` global variable),
interpret them according to the pre-defined convention, and add components to the grid accordingly.

The convention of how the input groups define where to apply constraint could be different depending on the constraint.
It could be as simple as "each input group corresponds to a constraint with the specified cells and clue value",
like in the killer cage example above - input group's cells are the single cage's cells, input group's value is the sum of the cage.
But that's not the only possible convention.
For instance, if the constraint should be applied to a straight line that starts from a certain cell and goes until the grid's border,
then the input group could define only the first 2 cells of the line, and the initialization code will calculate the rest of the cells according to this direction.
Or, if the constraint accepts multiple parameters (e.g. multiple digit groups),
then the \`value\` will contain all these parameters in a pre-defined format (e.g. comma-separated list),
and the initialization code will parse this format into individual values.

**Note:** SudokuMaker will execute the initialization code after every user interaction in the UI.
This includes running the code when the user is in the middle of defining the input groups, for instance:
- When the user created a new input group, but didn't add any cell yet and didn't type the value yet.
- When the user started adding the cells to the input group, but didn't finish yet.
- When the user started to type the value, but didn't finish yet.

Thus, it's considered a good practice to validate the input groups in the initialization code,
and just skip the group completely if the input group doesn't have the necessary info yet.
For instance, the killer cage example above could be improved as following:
\`\`\`
for (const { cells, value } of input.groups) {
  if (cells.length === 0) {
    // skip the constraint if the cells are not defined yet
    continue;
  }
  const name = 'killer cage in ' + helpers.naming.getCellsDescription(cells);
  puzzle.addConstraintComponent(new DifferentDigitsComponent(name, cells));
  if (!value) {
    // skip the sum component if the cage's sum is not defined, otherwise we'll get \`NaN\`
    continue;
  }
  puzzle.addConstraintComponent(new SumComponent(name, Number(value), cells));
}
\`\`\`

However, using input groups is not a must - the constraint could just hardcode where and how to define the components in the initialization code.
Constraints that have no input groups are called *global constraints*.
The common use-case for that is when the constraint is applied to all cells of the grid according to certain pattern,
e.g. to every row or column, to every diagonal, to every pair of orthogonally adjacent cells,
to every pair of cells chess knight's move apart, etc.
In this case, the initialization code would use loops and geometry helpers to go over all relevant cells.
For instance, the implementation of anti-knight constraint ("digits separate by chess knight's move do not repeat") could look like the following:
\`\`\`
for (const cells of helpers.geometry.getAllKnightMovePairs()) {
  puzzle.addConstraintComponent(new DifferentDigitsComponent(
    'anti-knight at ' + helpers.naming.getCellsDescription(cells),
    cells
  ));
}
\`\`\`

Obviously, constraints could also combine globally-defined component rules with input groups.
For instance, the implementation of the classic sudoku rules ("digits don't repeat in a row, column or box")
could use input groups to define the sudoku boxes and use helpers to go over rows and columns:
\`\`\`
for (const [index, cells] of Array.from(helpers.geometry.getAllRows()).entries()) {
  puzzle.addConstraintComponent(new HouseComponent(\`row \${index + 1}\`, cells));
}
for (const [index, cells] of Array.from(helpers.geometry.getAllColumns()).entries()) {
  puzzle.addConstraintComponent(new HouseComponent(\`column \${index + 1}\`, cells));
}
for (const [index, { cells }] of input.groups.entries()) {
  if (cells.length === puzzle.spec.digitCount) {
    puzzle.addConstraintComponent(new HouseComponent(\`box \${index + 1}\`, cells));
  }
}
\`\`\`

When you (the LLM) create a new custom constraint, you should use your best judgement
of how to define the input groups in the most convenient way,
and communicate this convention to the user who will use the constraint.

## Custom constraint's visuals

Custom constraints control only the logic of the puzzle, they don't have any visuals on the grid.
If the user wants to add visual indications for the user-defined constraint,
they have to achieve it by manually creating corresponding graphics with cosmetic elements
(topic \`${cosmeticsTopicName}\` covers creating and positioning those).

You (the LLM) should be proactive to suggest creating a visual indication for a custom constraint.
You should be proactive to notice when the constraint's input groups and the relevant visual indications are out sync.
Use your best judgement to understand which part (the input groups or the visual clues) are up-to-date, and sync the other parts.
If you're not confident enough about which part is up-to-date and which is outdated, just ask the user!
**ALWAYS** notify the user that you're synchronizing the input groups with the corresponding visual clues,
e.g. "I see that you added 3 new input groups to constraint XXX, I will draw the corresponding lines in the grid"
or "I see that you moved the circle for constraint XXX from r2c5 to r3c6, I will update the input groups respectively".

Name such an element after the constraint it mirrors, e.g. "Product cages - visuals",
so that the pairing is obvious when either side is edited later.

## Custom components

If the constraint cannot be achieved by using standard components only,
one could write a custom component that uses JavaScript to perform user-defined logic.

Fetch the \`${customComponentsTopicName}\` topic to learn more.

**Important: think twice before creating a custom component! Are you sure that standard components are not enough for your goal?**

## Internal data structures, types, classes and helpers available in custom constraints

**Data structures and format that SudokuMaker uses in custom constraints
are different from the data structures and formats used by the MCP server tools.**

The key differences are described below.

### Cell IDs and the coordinate system

SudokuMaker uses unique numeric IDs to reference cells. It uses it everywhere:
- In the input groups - \`input.groups[N].cells\` is an array of cell IDs.
- In the arguments of standard components - the \`CellId\` type in the documentation above
  refers to numeric cell IDs in this format.
- In helper function results, e.g. \`helpers.geometry.getAllRows()\` returns \`Generator<CellId[]>\`.
- In many other places.

You don't need to know what exactly is this format, just use tools that already produce and accept these IDs.

However, if absolutely necessary, you can create a cell ID from coordinates by calling the \`getIdFromCoords\` helper:
\`helpers.cellIds.getIdFromCoords(coords: { x: number, y: number }): CellId\`.
Note that it uses **zero-based coordinates system**: x = 0 is the leftmost column of the grid, y = 0 is the topmost row.
So \`helpers.cellIds.getIdFromCoords({ x: 0, y: 0 })\` will return the ID of r1c1,
\`helpers.cellIds.getIdFromCoords({ x: 4, y: 7 })\` will return the ID of r8c5.
There is also a reverse function for getting coordinates (also zero-based) by cell ID -
\`helpers.cellIds.getCoordsFromId(cell: CellId): { x: number, y: number }\`.

There are helpers for getting human-readable descriptions of cells by IDs:
- \`helpers.naming.getCellName\` - get description of one cell.
- \`helpers.naming.getCellsDescription\` - get description of cells array.

### \`DigitSet\`

\`DigitSet\` is a class that holds a set of digits that allows performing operations on them.
SudokuMaker uses \`DigitSet\` to operate with cell candidates,
and also accepts it in some component arguments, like \`PredefinedCandidatesComponent\`.

The easiest way to create a \`DigitSet\` object is from an array of digits, e.g. \`DigitSet.from([1, 3, 6])\`.

Fetch the \`${digitSetTopicName}\` topic if you need to learn more
(you likely don't need it unless you work on a custom component).
    `,
};
