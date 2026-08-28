import { describe, expect, test } from "vitest";
import { getArrayDescriptor } from "./arrayDescriptor";
import { ObjectNode } from "../ObjectNode";
import { getUnknownDescriptor } from "./unknownDescriptor";

interface Clue {
  id: number;
  value: number;
  note?: string;
}

const descriptor = getArrayDescriptor<Clue, Clue[]>({
  itemDescriptor: getUnknownDescriptor(),
  key: ({ id }) => String(id),
  countLabel: "clues",
});

const node = (value: Clue[]) =>
  new ObjectNode(value, () => undefined, "clues", value, descriptor);

const diff = (from: Clue[], to: Clue[]) =>
  descriptor.diff!(node(from), node(to));

const clue = (id: number, value: number): Clue => ({ id, value });

describe("array diff, items that changed position", () => {
  test("names the new position instead of reprinting an item that only moved", () => {
    expect(
      diff(
        [clue(1, 10), clue(2, 20), clue(3, 30)],
        [clue(1, 10), clue(3, 30), clue(2, 20)],
      ),
    ).toBe(
      [
        "3 clues [",
        "  { id: 1, value: 10 }",
        "- (moved to position 3) { id: 2, value: 20 }",
        "  { id: 3, value: 30 }",
        "+ (moved from position 2 with no changes) { id: 2, value: 20 }",
        "]",
      ].join("\n"),
    );
  });

  test("shows what changed on an item that moved and was edited", () => {
    expect(
      diff(
        [clue(1, 10), clue(2, 20), clue(3, 30)],
        [clue(1, 10), clue(3, 30), clue(2, 25)],
      ),
    ).toBe(
      [
        "3 clues [",
        "  { id: 1, value: 10 }",
        "- (moved to position 3) { id: 2, value: 20 }",
        "  { id: 3, value: 30 }",
        "+ (moved from position 2 + edited) {",
        "+   id: 2",
        "+ ~ value: 20 → 25",
        "+ }",
        "]",
      ].join("\n"),
    );
  });

  test("prints an item that genuinely appeared or disappeared in full", () => {
    expect(diff([clue(1, 10), clue(2, 20)], [clue(1, 10), clue(5, 50)])).toBe(
      [
        "2 clues [",
        "  { id: 1, value: 10 }",
        "- { id: 2, value: 20 }",
        "+ { id: 5, value: 50 }",
        "]",
      ].join("\n"),
    );
  });

  // The whole point of the move marks: the counterpart accounts for the content, so a big item
  // isn't printed in full twice. Each field keeps the short form it built for itself - the
  // collapsed note closes its own quote and names its length.
  test("cuts a big item short at both ends of a move", () => {
    const big: Clue = { id: 2, value: 20, note: "x".repeat(100) };
    const short = '{ id: 2, value: 20, note: "xxxxxxxxxxxxxxxxx…" }';

    expect(
      diff([clue(1, 10), big, clue(3, 30)], [clue(1, 10), clue(3, 30), big]),
    ).toBe(
      [
        "3 clues [",
        "  { id: 1, value: 10 }",
        `- (moved to position 3) ${short}`,
        "  { id: 3, value: 30 }",
        `+ (moved from position 2 with no changes) ${short}   <collapsed, full content at path "clues.2">`,
        "]",
      ].join("\n"),
    );
  });
});
