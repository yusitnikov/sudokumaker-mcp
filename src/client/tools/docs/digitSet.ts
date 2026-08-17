import type { DocsTopic } from "./topics";
import { digitSetTopicName } from "./topicNames";

export const digitSetTopic: DocsTopic = {
  name: digitSetTopicName,
  description: "How to work with DigitSet class",
  // language=markdown
  content: () => `
\`DigitSet\` is a class that holds a set of digits that allows performing operations on them.
Sudoku Maker uses \`DigitSet\` to operate with cell candidates,
and also accepts it in some component arguments, like \`PredefinedCandidatesComponent\`.

**Constructing \`DigitSet\`**:
- From array of digits: \`DigitSet.from([1, 3, 6])\`.
- Empty set: \`new DigitSet()\`.
- Clone another set: \`new DigitSet(otherSet)\`.
- From cell candidates (from a custom component): \`puzzle.getCandidates(cellId)\`.

The interface of the class is a bit similar to the built-in JavaScript \`Set\` class,
but also has a lot of differences from it.

**Here's what you can do with a \`DigitSet\`**:
- Iterate over digits in it: \`for (const digit of set) ...\`.
  The digits will be ordered from small to large when iterating.
- Convert to array of digits, like any other iterable collection: \`Array.from(set)\` or \`[...set]\`.
  The digits will be ordered from small to large in the resulting array.
- Check if a set has a digit: \`set.has(5)\`.
- Get the items count in a set: \`set.size\`.
- Get the smallest digit in a set (or undefined if there are no digits): \`set.getSmallestDigit()\`.
- Get the largest digit in a set (or undefined if there are no digits): \`set.getLargestDigit()\`.
- Add a digit to a set (in place): \`set.add(3)\`.
- Remove a digit from a set (in place): \`set.delete(3)\`.
- Check if 2 sets equal to each other: \`set1.equals(set2)\`.
- Add all digits of \`set2\` to \`set1\` (in place): \`set1.union(set2)\`.
- Remove all digits of \`set2\` from \`set1\` (in place): \`set1.subtract(set2)\`.
- Intersect 2 sets - leave only those digits of \`set1\` that are also present in \`set2\` (in place in \`set1\`): \`set1.intersect(set2)\`.
- Check if one set is a subset of another (i.e. if all digits of one set are present in another set):
  \`set1.isSubsetOf(set2)\` or \`set2.isSupersetOf(set1)\`.
- Check if 2 sets have at least 1 common digit: \`set1.intersects(set2)\`.
    `,
};
