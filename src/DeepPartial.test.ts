import { assertType, describe, expect, test } from "vitest";
import { z } from "zod";
import { type DeepPartial, mergeDeepUpdates, ZodDeepPartial } from "./DeepPartial";

describe("DeepPartial", () => {
  interface Target {
    name: string;
    value?: number;
    style: { color: string; layer?: string };
  }

  test("admits null for an optional field only when unsetting is allowed", () => {
    assertType<DeepPartial<Target, true>>({ value: null });
    // @ts-expect-error - `null` means unset, which this variant doesn't allow
    assertType<DeepPartial<Target>>({ value: null });
  });

  test("admits null for a nested optional field only when unsetting is allowed", () => {
    assertType<DeepPartial<Target, true>>({ style: { layer: null } });
    // @ts-expect-error - `null` means unset, which this variant doesn't allow
    assertType<DeepPartial<Target>>({ style: { layer: null } });
  });

  test("never admits null for a required field", () => {
    // @ts-expect-error - `name` is required, so it can't be unset
    assertType<DeepPartial<Target, true>>({ name: null });
    // @ts-expect-error - `color` is required, so it can't be unset
    assertType<DeepPartial<Target, true>>({ style: { color: null } });
  });

  test("makes every field optional either way", () => {
    assertType<DeepPartial<Target>>({});
    assertType<DeepPartial<Target, true>>({});
    assertType<DeepPartial<Target>>({ style: { color: "red" } });
  });
});

describe("mergeDeepUpdates", () => {
  test("overrides the fields it names and keeps the rest", () => {
    expect(mergeDeepUpdates({ a: 1, b: 2 }, { b: 3 })).toStrictEqual({ a: 1, b: 3 });
  });

  test("merges nested objects instead of replacing them", () => {
    expect(mergeDeepUpdates({ style: { color: "red", width: 2 } }, { style: { color: "blue" } })).toStrictEqual({
      style: { color: "blue", width: 2 },
    });
  });

  test("replaces an array whole rather than merging item-by-item", () => {
    expect(mergeDeepUpdates({ cells: [1, 2, 3] }, { cells: [9] })).toStrictEqual({ cells: [9] });
  });

  test("removes a field whose update is null", () => {
    expect(mergeDeepUpdates<{ value?: number; name: string }>({ value: 5, name: "x" }, { value: null })).toStrictEqual({
      name: "x",
    });
  });

  test("removes a nested field whose update is null, keeping its siblings", () => {
    const merged = mergeDeepUpdates<{ style: { color?: string; width: number } }>(
      { style: { color: "red", width: 2 } },
      { style: { color: null } },
    );
    expect(merged).toStrictEqual({ style: { width: 2 } });
  });

  test("removing an absent field is a no-op", () => {
    expect(mergeDeepUpdates<{ value?: number; name: string }>({ name: "x" }, { value: null })).toStrictEqual({
      name: "x",
    });
  });

  test("leaves the original object untouched", () => {
    const original = { style: { color: "red" }, value: 5 };
    mergeDeepUpdates<{ style: { color?: string }; value?: number }>(original, { value: null, style: { color: null } });
    expect(original).toStrictEqual({ style: { color: "red" }, value: 5 });
  });
});

describe("ZodDeepPartial", () => {
  const schema = z.object({
    name: z.string(),
    value: z.number().optional(),
    style: z.object({
      color: z.string(),
      layer: z.string().optional(),
    }),
    cells: z.array(z.number()),
  });
  const partial = ZodDeepPartial(schema);
  const unsettable = ZodDeepPartial(schema, true);

  test("makes every field optional", () => {
    expect(partial.parse({})).toStrictEqual({});
    expect(unsettable.parse({})).toStrictEqual({});
  });

  test("still rejects a value of the wrong type", () => {
    expect(() => partial.parse({ value: "five" })).toThrow();
    expect(() => unsettable.parse({ value: "five" })).toThrow();
  });

  test("keeps arrays whole rather than making their items partial", () => {
    expect(() => partial.parse({ cells: [1, "two"] })).toThrow();
    expect(() => unsettable.parse({ cells: [1, "two"] })).toThrow();
  });

  describe("with allowUnset", () => {
    test("accepts null for an optional field", () => {
      expect(unsettable.parse({ value: null })).toStrictEqual({ value: null });
    });

    test("accepts null for a nested optional field", () => {
      expect(unsettable.parse({ style: { layer: null } })).toStrictEqual({ style: { layer: null } });
    });

    test("rejects null for a required field", () => {
      expect(() => unsettable.parse({ name: null })).toThrow();
    });

    test("rejects null for a required nested field", () => {
      expect(() => unsettable.parse({ style: { color: null } })).toThrow();
    });
  });

  describe("without allowUnset", () => {
    test("rejects null for an optional field", () => {
      expect(() => partial.parse({ value: null })).toThrow();
    });

    test("rejects null for a nested optional field", () => {
      expect(() => partial.parse({ style: { layer: null } })).toThrow();
    });

    test("rejects null for a required field", () => {
      expect(() => partial.parse({ name: null })).toThrow();
    });
  });

  test("caches the two variants separately", () => {
    expect(ZodDeepPartial(schema)).toBe(partial);
    expect(ZodDeepPartial(schema, true)).toBe(unsettable);
    expect(partial).not.toBe(unsettable);
  });
});