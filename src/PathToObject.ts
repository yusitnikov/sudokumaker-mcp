import { z } from "zod";
import type { DeepPartial } from "./DeepPartial";

/**
 * Nests `ValueT` into an object shaped like `PathT`,
 * e.g. `PathToObject<["a", "b", "c"], number>` is `{a: {b: {c: number}}}`.
 * An empty path yields `ValueT` itself.
 */
export type PathToObject<PathT extends readonly string[], ValueT> = PathT extends readonly [
  infer HeadT extends string,
  ...infer TailT extends readonly string[],
]
  ? { [K in HeadT]: PathToObject<TailT, ValueT> }
  : ValueT;

/**
 * Nests `schema` into objects shaped like `path`, e.g. `["a", "b"]` gives `{a: {b: <schema>}}`.
 * Every level is optional, so a value that doesn't have the nested objects yet still parses.
 */
export const pathToObjectSchema = <PathT extends readonly string[], SchemaT extends z.ZodType>(
  path: PathT,
  schema: SchemaT,
): z.ZodType<PathToObject<PathT, z.output<SchemaT>>, PathToObject<PathT, z.input<SchemaT>>> =>
  path.reduceRight<z.ZodType>((nested, key) => z.object({ [key]: nested }), schema) as z.ZodType<
    PathToObject<PathT, z.output<SchemaT>>,
    PathToObject<PathT, z.input<SchemaT>>
  >;

/** Creates an object that holds `value` at `path`, e.g. `["a", "b"]` and `1` give `{a: {b: 1}}`. */
export const createByPath = <PathT extends readonly string[], ValueT>(
  path: PathT,
  value: ValueT,
): PathToObject<PathT, ValueT> => {
  const result: any = {};
  setByPath(result, path, value);
  return result;
};

/** Reads the value at `path`. The value itself may be absent, but the objects leading to it may not. */
export const getByPath = <PathT extends readonly string[], ValueT>(
  object: PathToObject<PathT, ValueT>,
  path: PathT,
): ValueT => {
  let result: any = object;
  for (const key of path) {
    result = result[key];
  }
  return result;
};

/** Writes `value` at `path`, creating the intermediate objects that don't exist yet. Mutates `object`. */
export const setByPath = <PathT extends readonly string[], ValueT>(
  object: DeepPartial<PathToObject<PathT, ValueT>>,
  path: PathT,
  value: ValueT,
) => {
  let node: any = object;
  for (const [index, key] of path.entries()) {
    if (index === path.length - 1) {
      node[key] = value;
    } else {
      node[key] ??= {};
      node = node[key];
    }
  }
};
