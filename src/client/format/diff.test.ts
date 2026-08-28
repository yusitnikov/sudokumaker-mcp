import { describe, expect, test } from "vitest";
import { getArrayDiff } from "./diff";

interface Item {
  id: number;
  value: number;
}

const key = ({ id }: Item) => String(id);

const item = (id: number, value = 1): Item => ({ id, value });

describe("getArrayDiff", () => {
  describe("empty and untouched lists", () => {
    test("reports two empty lists as no changes at all", () => {
      expect(getArrayDiff([], [], key)).toEqual([]);
    });

    test("reports every item as added when the list was empty", () => {
      expect(getArrayDiff([], [item(7), item(9)], key)).toEqual([
        { type: "added", item: { value: item(7), index: 0 } },
        { type: "added", item: { value: item(9), index: 1 } },
      ]);
    });

    test("reports every item as removed when the list was emptied", () => {
      expect(getArrayDiff([item(7), item(9)], [], key)).toEqual([
        { type: "removed", item: { value: item(7), index: 0 } },
        { type: "removed", item: { value: item(9), index: 1 } },
      ]);
    });

    test("reports an untouched list as unchanged throughout", () => {
      expect(getArrayDiff([item(7), item(9)], [item(7), item(9)], key)).toEqual(
        [
          {
            type: "unchanged",
            items: [
              { value: item(7), index: 0 },
              { value: item(9), index: 1 },
            ],
          },
        ],
      );
    });
  });

  describe("items identified by id", () => {
    test("marks both ends of an item that only changed position", () => {
      expect(
        getArrayDiff(
          [item(7), item(11), item(9)],
          [item(7), item(9), item(11)],
          key,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        {
          type: "removed",
          item: { value: item(11), index: 1 },
          movedTo: { value: item(11), index: 2 },
        },
        { type: "unchanged", items: [{ value: item(9), index: 1 }] },
        {
          type: "added",
          item: { value: item(11), index: 2 },
          movedFrom: { value: item(11), index: 1 },
        },
      ]);
    });

    test("marks a move even when the item travelled the whole list", () => {
      expect(
        getArrayDiff(
          [item(7), item(9), item(11)],
          [item(11), item(7), item(9)],
          key,
        ),
      ).toEqual([
        {
          type: "added",
          item: { value: item(11), index: 0 },
          movedFrom: { value: item(11), index: 2 },
        },
        {
          type: "unchanged",
          items: [
            { value: item(7), index: 1 },
            { value: item(9), index: 2 },
          ],
        },
        {
          type: "removed",
          item: { value: item(11), index: 2 },
          movedTo: { value: item(11), index: 0 },
        },
      ]);
    });

    test("shows the old and new content when an item moved and changed", () => {
      expect(
        getArrayDiff(
          [item(7), item(9), item(11), item(12, 5)],
          [item(12, 6), item(7), item(9), item(11)],
          key,
        ),
      ).toEqual([
        {
          type: "added",
          item: { value: item(12, 6), index: 0 },
          movedFrom: { value: item(12, 5), index: 3 },
        },
        {
          type: "unchanged",
          items: [
            { value: item(7), index: 1 },
            { value: item(9), index: 2 },
            { value: item(11), index: 3 },
          ],
        },
        {
          type: "removed",
          item: { value: item(12, 5), index: 3 },
          movedTo: { value: item(12, 6), index: 0 },
        },
      ]);
    });

    // Only the item the diff couldn't match in place splits into two halves to be marked; the
    // other one it matched by id where it now sits, so its own displacement goes unrecorded.
    test("marks the moved half of a swap where one of the two also changed", () => {
      expect(
        getArrayDiff(
          [item(7), item(9), item(11), item(12, 5)],
          [item(7), item(9), item(12, 6), item(11)],
          key,
        ),
      ).toEqual([
        {
          type: "unchanged",
          items: [
            { value: item(7), index: 0 },
            { value: item(9), index: 1 },
          ],
        },
        {
          type: "removed",
          item: { value: item(11), index: 2 },
          movedTo: { value: item(11), index: 3 },
        },
        {
          type: "edited",
          from: { value: item(12, 5), index: 3 },
          to: { value: item(12, 6), index: 2 },
        },
        {
          type: "added",
          item: { value: item(11), index: 3 },
          movedFrom: { value: item(11), index: 2 },
        },
      ]);
    });

    test("reports an item changed in place as an edit, with no move marks", () => {
      expect(
        getArrayDiff([item(7), item(9, 1)], [item(7), item(9, 2)], key),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        {
          type: "edited",
          from: { value: item(9, 1), index: 1 },
          to: { value: item(9, 2), index: 1 },
        },
      ]);
    });

    // Two items with different ids are different items however their positions line up: pairing them
    // would diff unrelated shapes against each other, which throws once their fields differ.
    test("reports one item deleted and a different one added as two unrelated changes", () => {
      expect(
        getArrayDiff([item(7), item(9)], [item(7), item(20)], key),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        { type: "removed", item: { value: item(9), index: 1 } },
        { type: "added", item: { value: item(20), index: 1 } },
      ]);
    });

    test("reports an item swapped out for a different one without marking a move", () => {
      expect(
        getArrayDiff(
          [item(4), item(5), item(10)],
          [item(4), item(5), item(11)],
          key,
        ),
      ).toEqual([
        {
          type: "unchanged",
          items: [
            { value: item(4), index: 0 },
            { value: item(5), index: 1 },
          ],
        },
        { type: "removed", item: { value: item(10), index: 2 } },
        { type: "added", item: { value: item(11), index: 2 } },
      ]);
    });

    test("tells a move apart from an unrelated addition in the same diff", () => {
      expect(
        getArrayDiff(
          [item(7), item(11), item(9)],
          [item(7), item(9), item(11), item(30)],
          key,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        {
          type: "removed",
          item: { value: item(11), index: 1 },
          movedTo: { value: item(11), index: 2 },
        },
        { type: "unchanged", items: [{ value: item(9), index: 1 }] },
        {
          type: "added",
          item: { value: item(11), index: 2 },
          movedFrom: { value: item(11), index: 1 },
        },
        { type: "added", item: { value: item(30), index: 3 } },
      ]);
    });

    // Either pair can be called the one that moved - the diff keeps the longest run it can and
    // marks whichever items fall outside it. What matters is that each marked item names its own
    // counterpart rather than the other move's.
    test("marks each of two moves in one diff with its own counterpart", () => {
      expect(
        getArrayDiff(
          [item(7), item(11), item(9), item(12)],
          [item(11), item(7), item(12), item(9)],
          key,
        ),
      ).toEqual([
        {
          type: "removed",
          item: { value: item(7), index: 0 },
          movedTo: { value: item(7), index: 1 },
        },
        { type: "unchanged", items: [{ value: item(11), index: 0 }] },
        {
          type: "removed",
          item: { value: item(9), index: 2 },
          movedTo: { value: item(9), index: 3 },
        },
        {
          type: "added",
          item: { value: item(7), index: 1 },
          movedFrom: { value: item(7), index: 0 },
        },
        { type: "unchanged", items: [{ value: item(12), index: 2 }] },
        {
          type: "added",
          item: { value: item(9), index: 3 },
          movedFrom: { value: item(9), index: 2 },
        },
      ]);
    });

    test("leaves a genuine removal unmarked while marking a move beside it", () => {
      expect(
        getArrayDiff(
          [item(7), item(11), item(9), item(8)],
          [item(7), item(9), item(11)],
          key,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        {
          type: "removed",
          item: { value: item(11), index: 1 },
          movedTo: { value: item(11), index: 2 },
        },
        { type: "unchanged", items: [{ value: item(9), index: 1 }] },
        { type: "removed", item: { value: item(8), index: 3 } },
        {
          type: "added",
          item: { value: item(11), index: 2 },
          movedFrom: { value: item(11), index: 1 },
        },
      ]);
    });

    test("reports several items replaced at once as separate removals and additions", () => {
      expect(
        getArrayDiff(
          [item(7), item(1), item(2), item(3)],
          [item(7), item(20), item(21)],
          key,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        { type: "removed", item: { value: item(1), index: 1 } },
        { type: "removed", item: { value: item(2), index: 2 } },
        { type: "removed", item: { value: item(3), index: 3 } },
        { type: "added", item: { value: item(20), index: 1 } },
        { type: "added", item: { value: item(21), index: 2 } },
      ]);
    });

    // With the same id gone from two places and back in one, there is no telling which departure the
    // arrival belongs to, so nothing is marked as moved rather than guessing wrong.
    test("marks no move when the same id was removed twice", () => {
      expect(
        getArrayDiff(
          [item(9, 1), item(9, 2), item(7)],
          [item(7), item(9, 3)],
          key,
        ),
      ).toEqual([
        { type: "removed", item: { value: item(9, 1), index: 0 } },
        { type: "removed", item: { value: item(9, 2), index: 1 } },
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        { type: "added", item: { value: item(9, 3), index: 1 } },
      ]);
    });

    // Two items can't share an id in `allElements`, so this only pins down that such data produces
    // something sane rather than anything degenerate.
    test("matches up items sharing an id in the order they appear", () => {
      expect(
        getArrayDiff(
          [item(7), item(9, 1), item(9, 2)],
          [item(9, 3), item(9, 4), item(7)],
          key,
        ),
      ).toEqual([
        {
          type: "removed",
          item: { value: item(7), index: 0 },
          movedTo: { value: item(7), index: 2 },
        },
        {
          type: "edited",
          from: { value: item(9, 1), index: 1 },
          to: { value: item(9, 3), index: 0 },
        },
        {
          type: "edited",
          from: { value: item(9, 2), index: 2 },
          to: { value: item(9, 4), index: 1 },
        },
        {
          type: "added",
          item: { value: item(7), index: 2 },
          movedFrom: { value: item(7), index: 0 },
        },
      ]);
    });
  });

  describe("items identified by their content", () => {
    test("reports a changed item as a change at that position", () => {
      expect(
        getArrayDiff([item(7), item(9, 1)], [item(7), item(9, 2)], undefined),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        {
          type: "edited",
          from: { value: item(9, 1), index: 1 },
          to: { value: item(9, 2), index: 1 },
        },
      ]);
    });

    test("reports an item inserted before a surviving one, and the last one dropped", () => {
      expect(
        getArrayDiff(
          [item(1), item(2), item(3)],
          [item(1), item(4), item(2)],
          undefined,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(1), index: 0 }] },
        { type: "added", item: { value: item(4), index: 1 } },
        { type: "unchanged", items: [{ value: item(2), index: 2 }] },
        { type: "removed", item: { value: item(3), index: 2 } },
      ]);
    });

    test("reports an item dropped from the middle, and another appended", () => {
      expect(
        getArrayDiff(
          [item(1), item(2), item(3)],
          [item(1), item(3), item(4)],
          undefined,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(1), index: 0 }] },
        { type: "removed", item: { value: item(2), index: 1 } },
        { type: "unchanged", items: [{ value: item(3), index: 1 }] },
        { type: "added", item: { value: item(4), index: 2 } },
      ]);
    });

    // The single `b` that left could be either of the two that arrived, so neither is called a move.
    test("marks no move when a moved item was also duplicated", () => {
      expect(
        getArrayDiff(
          [item(1), item(2), item(3)],
          [item(1), item(3), item(2), item(2)],
          undefined,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(1), index: 0 }] },
        { type: "removed", item: { value: item(2), index: 1 } },
        { type: "unchanged", items: [{ value: item(3), index: 1 }] },
        { type: "added", item: { value: item(2), index: 2 } },
        { type: "added", item: { value: item(2), index: 3 } },
      ]);
    });

    test("marks no move when one of two identical items was dropped", () => {
      expect(
        getArrayDiff(
          [item(1), item(2), item(2), item(3)],
          [item(1), item(3), item(2)],
          undefined,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(1), index: 0 }] },
        { type: "removed", item: { value: item(2), index: 1 } },
        { type: "removed", item: { value: item(2), index: 2 } },
        { type: "unchanged", items: [{ value: item(3), index: 1 }] },
        { type: "added", item: { value: item(2), index: 2 } },
      ]);
    });

    test("marks each of two moves in one diff with its own counterpart", () => {
      expect(
        getArrayDiff(
          [item(1), item(2), item(3), item(4)],
          [item(2), item(1), item(4), item(3)],
          undefined,
        ),
      ).toEqual([
        {
          type: "removed",
          item: { value: item(1), index: 0 },
          movedTo: { value: item(1), index: 1 },
        },
        { type: "unchanged", items: [{ value: item(2), index: 0 }] },
        {
          type: "removed",
          item: { value: item(3), index: 2 },
          movedTo: { value: item(3), index: 3 },
        },
        {
          type: "added",
          item: { value: item(1), index: 1 },
          movedFrom: { value: item(1), index: 0 },
        },
        { type: "unchanged", items: [{ value: item(4), index: 2 }] },
        {
          type: "added",
          item: { value: item(3), index: 3 },
          movedFrom: { value: item(3), index: 2 },
        },
      ]);
    });

    test("leaves a genuine removal unmarked while marking a move beside it", () => {
      expect(
        getArrayDiff(
          [item(1), item(2), item(3), item(4)],
          [item(1), item(3), item(2)],
          undefined,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(1), index: 0 }] },
        {
          type: "removed",
          item: { value: item(2), index: 1 },
          movedTo: { value: item(2), index: 2 },
        },
        { type: "unchanged", items: [{ value: item(3), index: 1 }] },
        { type: "removed", item: { value: item(4), index: 3 } },
        {
          type: "added",
          item: { value: item(2), index: 2 },
          movedFrom: { value: item(2), index: 1 },
        },
      ]);
    });

    test("tells a move apart from an unrelated addition in the same diff", () => {
      expect(
        getArrayDiff(
          [item(1), item(2), item(3)],
          [item(1), item(3), item(2), item(5)],
          undefined,
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(1), index: 0 }] },
        {
          type: "removed",
          item: { value: item(2), index: 1 },
          movedTo: { value: item(2), index: 2 },
        },
        { type: "unchanged", items: [{ value: item(3), index: 1 }] },
        {
          type: "added",
          item: { value: item(2), index: 2 },
          movedFrom: { value: item(2), index: 1 },
        },
        { type: "added", item: { value: item(5), index: 3 } },
      ]);
    });

    test("pairs a run of changed items one for one", () => {
      expect(
        getArrayDiff(
          [item(7), item(1, 1), item(2, 1), item(9)],
          [item(7), item(1, 2), item(2, 2), item(9)],
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        {
          type: "edited",
          from: { value: item(1, 1), index: 1 },
          to: { value: item(1, 2), index: 1 },
        },
        {
          type: "edited",
          from: { value: item(2, 1), index: 2 },
          to: { value: item(2, 2), index: 2 },
        },
        { type: "unchanged", items: [{ value: item(9), index: 3 }] },
      ]);
    });

    test("reports the extra items as removed when the list got shorter", () => {
      expect(
        getArrayDiff(
          [item(7), item(1, 1), item(2, 1), item(3, 1)],
          [item(7), item(1, 2)],
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        {
          type: "edited",
          from: { value: item(1, 1), index: 1 },
          to: { value: item(1, 2), index: 1 },
        },
        { type: "removed", item: { value: item(2, 1), index: 2 } },
        { type: "removed", item: { value: item(3, 1), index: 3 } },
      ]);
    });

    test("reports the extra items as added when the list got longer", () => {
      expect(
        getArrayDiff(
          [item(7), item(1, 1)],
          [item(7), item(1, 2), item(2, 1), item(3, 1)],
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        {
          type: "edited",
          from: { value: item(1, 1), index: 1 },
          to: { value: item(1, 2), index: 1 },
        },
        { type: "added", item: { value: item(2, 1), index: 2 } },
        { type: "added", item: { value: item(3, 1), index: 3 } },
      ]);
    });

    // Without an id, an item is identified by its own content, so an identical item leaving one
    // place and appearing in another is the same item as far as anything here can tell.
    test("marks both ends of a move, matching the two ends by content", () => {
      expect(
        getArrayDiff(
          [item(7), item(11), item(9)],
          [item(7), item(9), item(11)],
        ),
      ).toEqual([
        { type: "unchanged", items: [{ value: item(7), index: 0 }] },
        {
          type: "removed",
          item: { value: item(11), index: 1 },
          movedTo: { value: item(11), index: 2 },
        },
        { type: "unchanged", items: [{ value: item(9), index: 1 }] },
        {
          type: "added",
          item: { value: item(11), index: 2 },
          movedFrom: { value: item(11), index: 1 },
        },
      ]);
    });
  });

  describe("primitive values never edit", () => {
    // A primitive has no interior for "edited" to point at - old value vs. new value is exactly
    // what a removal and an addition already say. Line diffs are the direct motivation: two lines
    // of text must never render as one "edited" line, only as a removed line and an added line.
    test("reports two different strings at the same position as removed and added, not edited", () => {
      expect(getArrayDiff(["a", "b", "c"], ["a", "x", "c"])).toEqual([
        { type: "unchanged", items: [{ value: "a", index: 0 }] },
        { type: "removed", item: { value: "b", index: 1 } },
        { type: "added", item: { value: "x", index: 1 } },
        { type: "unchanged", items: [{ value: "c", index: 2 }] },
      ]);
    });

    // Numbers are primitives too - same rule, different type, to confirm this isn't string-specific.
    test("reports two different numbers at the same position as removed and added, not edited", () => {
      expect(getArrayDiff([1, 2, 3], [1, 20, 3])).toEqual([
        { type: "unchanged", items: [{ value: 1, index: 0 }] },
        { type: "removed", item: { value: 2, index: 1 } },
        { type: "added", item: { value: 20, index: 1 } },
        { type: "unchanged", items: [{ value: 3, index: 2 }] },
      ]);
    });

    // A block of several differing primitive lines groups as all removals then all additions -
    // there's no edit-eligible pairing anywhere to interleave with, unlike the object case.
    test("groups a replaced block of primitive lines as removals then additions, never interleaved", () => {
      expect(
        getArrayDiff(["x", "a", "b", "c", "y"], ["x", "p", "q", "r", "y"]),
      ).toEqual([
        { type: "unchanged", items: [{ value: "x", index: 0 }] },
        { type: "removed", item: { value: "a", index: 1 } },
        { type: "removed", item: { value: "b", index: 2 } },
        { type: "removed", item: { value: "c", index: 3 } },
        { type: "added", item: { value: "p", index: 1 } },
        { type: "added", item: { value: "q", index: 2 } },
        { type: "added", item: { value: "r", index: 3 } },
        { type: "unchanged", items: [{ value: "y", index: 4 }] },
      ]);
    });
  });
});
