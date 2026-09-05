import { describe, expect, test } from "vitest";
import { getByPath, type PathToObject, setByPath } from "./PathToObject";
import { CustomElement } from "./elements/CustomElement";
import type { z } from "zod";

/** Compiles only when `ActualT` and `ExpectedT` are the same type, in both directions. */
const expectType = <ExpectedT, ActualT extends ExpectedT>(..._: ExpectedT extends ActualT ? [] : [never]) => {};

describe("PathToObject type", () => {
  test("nests the value one level per path segment", () => {
    expectType<{ a: { b: { c: number } } }, PathToObject<["a", "b", "c"], number>>();
  });

  test("yields a plain object for a single-segment path, which is what makes [key] the default", () => {
    expectType<{ clues: string[] }, PathToObject<["clues"], string[]>>();
  });

  test("yields the value itself for an empty path", () => {
    expectType<number, PathToObject<[], number>>();
  });

  test("nests through a readonly tuple, as produced by `as const`", () => {
    expectType<{ input: { groups: number } }, PathToObject<readonly ["input", "groups"], number>>();
  });
});

// A path written as a plain array literal has to infer as a tuple, not widen to `string[]` -
// widening would silently collapse `PathToObject` to its base case and drop the nesting from the
// internal config type, which nothing else would catch.
describe("a clue's internal path in the element registry", () => {
  test("nests the clues array in the internal config of the element that declares a path", () => {
    type CustomInternalConfig = z.output<typeof CustomElement.schema>;

    expectType<{ groups: { cells: number[]; value: string }[] }, CustomInternalConfig["input"]>();
  });

  test("keeps the clues array flat in the public config", () => {
    type CustomPublicConfig = z.input<typeof CustomElement.schema>;

    expectType<{ cells: string[]; value: string }[], CustomPublicConfig["inputGroups"]>();
  });
});

describe("getByPath", () => {
  test("reads a nested value", () => {
    expect(getByPath({ input: { groups: [1, 2] } }, ["input", "groups"])).toEqual([1, 2]);
  });

  test("reads a top-level value for a single-segment path", () => {
    expect(getByPath({ clues: [1] }, ["clues"])).toEqual([1]);
  });

  test("throws when an intermediate segment is missing", () => {
    expect(() => getByPath({}, ["input", "groups"])).toThrow();
  });

  test("returns undefined when only the last segment is missing", () => {
    expect(getByPath({ input: {} }, ["input", "groups"])).toBeUndefined();
  });
});

describe("setByPath", () => {
  test("writes a top-level value for a single-segment path", () => {
    const object: any = {};
    setByPath(object, ["clues"], [1]);
    expect(object).toEqual({ clues: [1] });
  });

  test("creates the intermediate objects that don't exist yet", () => {
    const object: any = {};
    setByPath(object, ["input", "groups"], [1, 2]);
    expect(object).toEqual({ input: { groups: [1, 2] } });
  });

  test("keeps the other keys of an existing intermediate object", () => {
    const object: any = { input: { other: "kept" } };
    setByPath(object, ["input", "groups"], [1]);
    expect(object).toEqual({ input: { other: "kept", groups: [1] } });
  });

  test("overwrites a value that is already there", () => {
    const object: any = { input: { groups: [1] } };
    setByPath(object, ["input", "groups"], [2]);
    expect(object).toEqual({ input: { groups: [2] } });
  });
});
