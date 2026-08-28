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

  describe("replacing a block of items", () => {
    describe("keyed", () => {
      test("replaces a block of 3 with 1 item, as 3 removals then 1 addition", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(3), item(8)],
            [item(7), item(20), item(8)],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          { type: "removed", item: { value: item(1), index: 1 } },
          { type: "removed", item: { value: item(2), index: 2 } },
          { type: "removed", item: { value: item(3), index: 3 } },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "unchanged", items: [{ value: item(8), index: 2 }] },
        ]);
      });

      test("replaces 1 item with a block of 3, as 1 removal then 3 additions", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(8)],
            [item(7), item(20), item(21), item(22), item(8)],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          { type: "removed", item: { value: item(1), index: 1 } },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "added", item: { value: item(21), index: 2 } },
          { type: "added", item: { value: item(22), index: 3 } },
          { type: "unchanged", items: [{ value: item(8), index: 4 }] },
        ]);
      });

      test("replaces a block of 3 with a block of 3, as 3 removals then 3 additions", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(3), item(8)],
            [item(7), item(20), item(21), item(22), item(8)],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          { type: "removed", item: { value: item(1), index: 1 } },
          { type: "removed", item: { value: item(2), index: 2 } },
          { type: "removed", item: { value: item(3), index: 3 } },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "added", item: { value: item(21), index: 2 } },
          { type: "added", item: { value: item(22), index: 3 } },
          { type: "unchanged", items: [{ value: item(8), index: 4 }] },
        ]);
      });

      test("replaces a block of 4 with a block of 2, as 4 removals then 2 additions", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(3), item(4), item(8)],
            [item(7), item(20), item(21), item(8)],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          { type: "removed", item: { value: item(1), index: 1 } },
          { type: "removed", item: { value: item(2), index: 2 } },
          { type: "removed", item: { value: item(3), index: 3 } },
          { type: "removed", item: { value: item(4), index: 4 } },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "added", item: { value: item(21), index: 2 } },
          { type: "unchanged", items: [{ value: item(8), index: 3 }] },
        ]);
      });

      test("replaces a block of 2 with a block of 4, as 2 removals then 4 additions", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(8)],
            [item(7), item(20), item(21), item(22), item(23), item(8)],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          { type: "removed", item: { value: item(1), index: 1 } },
          { type: "removed", item: { value: item(2), index: 2 } },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "added", item: { value: item(21), index: 2 } },
          { type: "added", item: { value: item(22), index: 3 } },
          { type: "added", item: { value: item(23), index: 4 } },
          { type: "unchanged", items: [{ value: item(8), index: 5 }] },
        ]);
      });

      // The id shared at the same relative position within the replaced block pairs as an edit,
      // same as "pairs a run of changed items one for one" - the rest of the block still replaces
      // as separate removals and additions around it.
      test("edits an item in place inside an otherwise-replaced block", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2, 1), item(3), item(8)],
            [item(7), item(20), item(2, 2), item(21), item(8)],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          { type: "removed", item: { value: item(1), index: 1 } },
          { type: "added", item: { value: item(20), index: 1 } },
          {
            type: "edited",
            from: { value: item(2, 1), index: 2 },
            to: { value: item(2, 2), index: 2 },
          },
          { type: "removed", item: { value: item(3), index: 3 } },
          { type: "added", item: { value: item(21), index: 3 } },
          { type: "unchanged", items: [{ value: item(8), index: 4 }] },
        ]);
      });

      // "2" is still the last thing before "8" in both arrays - the block around it changed, but
      // "2" itself never moved - so it stays unchanged, same shape as an item sitting untouched
      // between two changes elsewhere in this file, even though its id also happens to be unique.
      test("keeps an item unchanged inside a replaced block when it hasn't actually moved", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(3), item(8)],
            [item(7), item(20), item(21), item(2), item(8)],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          { type: "removed", item: { value: item(1), index: 1 } },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "added", item: { value: item(21), index: 2 } },
          { type: "unchanged", items: [{ value: item(2), index: 3 }] },
          { type: "removed", item: { value: item(3), index: 3 } },
          { type: "unchanged", items: [{ value: item(8), index: 4 }] },
        ]);
      });

      // "9" and "10" stay next to each other in the same order on both sides, so they're plainly
      // unchanged; "2" jumps from before that pair to after it. "9, 10" staying together is what
      // makes "2" the one that moved, rather than either reading being equally valid.
      test("marks a move for an id that jumps past two unchanged items, inside a replaced block", () => {
        expect(
          getArrayDiff(
            [item(7), item(2), item(9), item(10), item(1), item(3), item(8)],
            [item(7), item(20), item(21), item(9), item(10), item(2), item(8)],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          {
            type: "removed",
            item: { value: item(2), index: 1 },
            movedTo: { value: item(2), index: 5 },
          },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "added", item: { value: item(21), index: 2 } },
          {
            type: "unchanged",
            items: [
              { value: item(9), index: 3 },
              { value: item(10), index: 4 },
            ],
          },
          { type: "removed", item: { value: item(1), index: 4 } },
          { type: "removed", item: { value: item(3), index: 5 } },
          {
            type: "added",
            item: { value: item(2), index: 5 },
            movedFrom: { value: item(2), index: 1 },
          },
          { type: "unchanged", items: [{ value: item(8), index: 6 }] },
        ]);
      });

      // "2" is still the last thing before "8" in both arrays - it never moved, so a shared id
      // with different content there is an edit in place, same as "edits an item in place inside
      // an otherwise-replaced block" above, not a move: the id, not the content, is what "the
      // same item" means for a keyed diff, but sameness alone isn't displacement.
      test("edits a shared id in place inside a replaced block, without marking a move", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2, 1), item(3), item(8)],
            [item(7), item(20), item(21), item(2, 2), item(8)],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          { type: "removed", item: { value: item(1), index: 1 } },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "added", item: { value: item(21), index: 2 } },
          {
            type: "edited",
            from: { value: item(2, 1), index: 2 },
            to: { value: item(2, 2), index: 3 },
          },
          { type: "removed", item: { value: item(3), index: 3 } },
          { type: "unchanged", items: [{ value: item(8), index: 4 }] },
        ]);
      });

      // Same shape as "marks a move for an id that jumps past two unchanged items" - "9, 10" stay
      // adjacent and in order, anchoring "2"'s displacement past them - except "2"'s content also
      // changed. A move still names its own counterpart even when that counterpart's content
      // differs, the same as the unkeyed version of this case earlier in the file.
      test("marks a move for a shared id inside a replaced block, carrying its changed content", () => {
        expect(
          getArrayDiff(
            [item(7), item(2, 1), item(9), item(10), item(1), item(3), item(8)],
            [
              item(7),
              item(20),
              item(21),
              item(9),
              item(10),
              item(2, 2),
              item(8),
            ],
            key,
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          {
            type: "removed",
            item: { value: item(2, 1), index: 1 },
            movedTo: { value: item(2, 2), index: 5 },
          },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "added", item: { value: item(21), index: 2 } },
          {
            type: "unchanged",
            items: [
              { value: item(9), index: 3 },
              { value: item(10), index: 4 },
            ],
          },
          { type: "removed", item: { value: item(1), index: 4 } },
          { type: "removed", item: { value: item(3), index: 5 } },
          {
            type: "added",
            item: { value: item(2, 2), index: 5 },
            movedFrom: { value: item(2, 1), index: 1 },
          },
          { type: "unchanged", items: [{ value: item(8), index: 6 }] },
        ]);
      });
    });

    describe("unkeyed", () => {
      // "1" and "2" and "3" are all plain objects with no shared identity and none "moved", so
      // each position pairs as an edit wherever the walk can still reach one - "1" edits into
      // "20", and the two items left over with nothing to pair against are plain removals.
      test("edits the first item of a replaced block, removing what's left over", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(3), item(8)],
            [item(7), item(20), item(8)],
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          {
            type: "edited",
            from: { value: item(1), index: 1 },
            to: { value: item(20), index: 1 },
          },
          { type: "removed", item: { value: item(2), index: 2 } },
          { type: "removed", item: { value: item(3), index: 3 } },
          { type: "unchanged", items: [{ value: item(8), index: 2 }] },
        ]);
      });

      // "1" pairs with "20" as an edit for the same reason as above; "21" and "22" have nothing
      // left in "from" to pair with, so they're plain additions.
      test("edits the single replaced item, adding what's left over", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(8)],
            [item(7), item(20), item(21), item(22), item(8)],
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          {
            type: "edited",
            from: { value: item(1), index: 1 },
            to: { value: item(20), index: 1 },
          },
          { type: "added", item: { value: item(21), index: 2 } },
          { type: "added", item: { value: item(22), index: 3 } },
          { type: "unchanged", items: [{ value: item(8), index: 4 }] },
        ]);
      });

      // Equal-length blocks tile position for position, so every item pairs as an edit - none are
      // left over to be a plain removal or addition.
      test("edits every position of a same-length replaced block, one for one", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(3), item(8)],
            [item(7), item(20), item(21), item(22), item(8)],
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          {
            type: "edited",
            from: { value: item(1), index: 1 },
            to: { value: item(20), index: 1 },
          },
          {
            type: "edited",
            from: { value: item(2), index: 2 },
            to: { value: item(21), index: 2 },
          },
          {
            type: "edited",
            from: { value: item(3), index: 3 },
            to: { value: item(22), index: 3 },
          },
          { type: "unchanged", items: [{ value: item(8), index: 4 }] },
        ]);
      });

      // The first 2 positions pair as edits ("1"->"20", "2"->"21"); "3" and "4" have nothing left
      // in "to" to pair with, so they're plain removals.
      test("edits as many positions as the shorter side allows, removing what's left over", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(3), item(4), item(8)],
            [item(7), item(20), item(21), item(8)],
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          {
            type: "edited",
            from: { value: item(1), index: 1 },
            to: { value: item(20), index: 1 },
          },
          {
            type: "edited",
            from: { value: item(2), index: 2 },
            to: { value: item(21), index: 2 },
          },
          { type: "removed", item: { value: item(3), index: 3 } },
          { type: "removed", item: { value: item(4), index: 4 } },
          { type: "unchanged", items: [{ value: item(8), index: 3 }] },
        ]);
      });

      // "1" and "2" pair with "20" and "21" as edits; "22" and "23" have nothing left in "from" to
      // pair with, so they're plain additions.
      test("edits as many positions as the shorter side allows, adding what's left over", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(8)],
            [item(7), item(20), item(21), item(22), item(23), item(8)],
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          {
            type: "edited",
            from: { value: item(1), index: 1 },
            to: { value: item(20), index: 1 },
          },
          {
            type: "edited",
            from: { value: item(2), index: 2 },
            to: { value: item(21), index: 2 },
          },
          { type: "added", item: { value: item(22), index: 3 } },
          { type: "added", item: { value: item(23), index: 4 } },
          { type: "unchanged", items: [{ value: item(8), index: 5 }] },
        ]);
      });

      // "1" pairs with "20" as an ordinary edit. "2" is present once on each side, so it's
      // move-eligible and can't pair with "21" as an edit - but it's still the last thing before
      // "8" in both arrays, so the walk reaches it as a direct match instead of ever needing to
      // mark a move; "21" and "3" are left as a plain addition and removal around it.
      test("keeps a move-eligible item unchanged when it's still last before the same trailing item", () => {
        expect(
          getArrayDiff(
            [item(7), item(1), item(2), item(3), item(8)],
            [item(7), item(20), item(21), item(2), item(8)],
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          {
            type: "edited",
            from: { value: item(1), index: 1 },
            to: { value: item(20), index: 1 },
          },
          { type: "added", item: { value: item(21), index: 2 } },
          { type: "unchanged", items: [{ value: item(2), index: 3 }] },
          { type: "removed", item: { value: item(3), index: 3 } },
          { type: "unchanged", items: [{ value: item(8), index: 4 }] },
        ]);
      });

      // "9" and "10" stay next to each other in the same order on both sides, so they're plainly
      // unchanged; "2" jumps from before that pair to after it. "9, 10" staying together is what
      // makes "2" the one that moved, rather than either reading being equally valid.
      test("marks a move for an item that jumps past two unchanged items, inside a replaced block", () => {
        expect(
          getArrayDiff(
            [item(7), item(2), item(9), item(10), item(1), item(3), item(8)],
            [item(7), item(20), item(21), item(9), item(10), item(2), item(8)],
          ),
        ).toEqual([
          { type: "unchanged", items: [{ value: item(7), index: 0 }] },
          {
            type: "removed",
            item: { value: item(2), index: 1 },
            movedTo: { value: item(2), index: 5 },
          },
          { type: "added", item: { value: item(20), index: 1 } },
          { type: "added", item: { value: item(21), index: 2 } },
          {
            type: "unchanged",
            items: [
              { value: item(9), index: 3 },
              { value: item(10), index: 4 },
            ],
          },
          { type: "removed", item: { value: item(1), index: 4 } },
          { type: "removed", item: { value: item(3), index: 5 } },
          {
            type: "added",
            item: { value: item(2), index: 5 },
            movedFrom: { value: item(2), index: 1 },
          },
          { type: "unchanged", items: [{ value: item(8), index: 6 }] },
        ]);
      });
    });
  });
});
