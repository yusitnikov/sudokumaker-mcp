import { z } from "zod";

/**
 * Every field optional at every nesting level; arrays are kept whole.
 *
 * With `AllowUnsetT`, an optional field may also carry `null`, meaning "remove this field" -
 * matching what `ZodDeepPartial` accepts under the same flag.
 */
export type DeepPartial<T, AllowUnsetT extends boolean = false> = T extends any[]
  ? T
  : T extends object
    ? {
        [K in keyof T]?:
          | DeepPartial<T[K], AllowUnsetT>
          | (AllowUnsetT extends true ? (undefined extends T[K] ? null : never) : never);
      }
    : T;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Applies a partial update to a value, recursing into plain objects and replacing everything else.
 *
 * An update of `null` removes the key it stands for; arrays replace the previous array whole
 * rather than merging item by item.
 */
export const mergeDeepUpdates = <T>(object: T, updates: DeepPartial<T, boolean>): T => {
  if (!isPlainObject(object) || !isPlainObject(updates)) {
    return updates as T;
  }

  const result: Record<string, unknown> = { ...object };

  for (const [key, update] of Object.entries(updates)) {
    if (update === null) {
      delete result[key];
    } else if (update !== undefined) {
      result[key] = mergeDeepUpdates(result[key], update as DeepPartial<unknown, boolean>);
    }
  }

  return result as T;
};

const caches = {
  false: new Map<z.core.$ZodType, z.ZodType>(),
  true: new Map<z.core.$ZodType, z.ZodType>(),
};
/**
 * Derives the partial-update variant of a schema: every field optional, arrays kept whole.
 *
 * `allowUnset` additionally lets an optional field carry `null`, meaning "remove this field" -
 * for updates of an existing value. It stays off when there is no previous value to remove from,
 * so that a payload building a value from scratch can't ask to unset anything.
 *
 * The result is only ever used to validate incoming update payloads, never to encode or decode.
 */
export function ZodDeepPartial<OutputT, InputT>(
  schema: z.core.$ZodType<OutputT, InputT>,
): z.ZodType<DeepPartial<OutputT>, DeepPartial<InputT>>;
export function ZodDeepPartial<OutputT, InputT, AllowUnsetT extends boolean>(
  schema: z.core.$ZodType<OutputT, InputT>,
  allowUnset: AllowUnsetT,
): z.ZodType<DeepPartial<OutputT, AllowUnsetT>, DeepPartial<InputT, AllowUnsetT>>;
export function ZodDeepPartial<OutputT, InputT, AllowUnsetT extends boolean>(
  schema: z.core.$ZodType<OutputT, InputT>,
  allowUnset: AllowUnsetT = false as AllowUnsetT,
): z.ZodType<DeepPartial<OutputT, AllowUnsetT>, DeepPartial<InputT, AllowUnsetT>> {
  const cache = caches[allowUnset ? "true" : "false"];
  const cached = cache.get(schema);
  if (cached) {
    return cached as z.ZodType<DeepPartial<OutputT, AllowUnsetT>, DeepPartial<InputT, AllowUnsetT>>;
  }

  let result = ZodDeepPartialInner(schema, allowUnset);

  if (result !== schema && schema instanceof z.ZodType) {
    const meta = schema.meta();
    if (typeof meta?.id === "string") {
      result = result.meta({
        ...meta,
        id: `${meta.id}DeepPartial`,
      });
    }
  }

  cache.set(schema, result);

  return result;
}

const ZodDeepPartialInner = <OutputT, InputT, AllowUnsetT extends boolean>(
  schema: z.core.$ZodType<OutputT, InputT>,
  allowUnset: AllowUnsetT,
): z.ZodType<DeepPartial<OutputT, AllowUnsetT>, DeepPartial<InputT, AllowUnsetT>> => {
  if (schema instanceof z.ZodCodec) {
    return ZodDeepPartial(schema.def.in, allowUnset) as any;
  }

  if (schema instanceof z.ZodObject) {
    return z.object(
      Object.fromEntries(
        Object.entries(schema.def.shape).map(([key, value]) => {
          // Only a field that may legitimately be absent can be asked to become absent again,
          // so `null` is offered for those and rejected for the rest.
          const isOptional = value instanceof z.ZodOptional;
          const partial = ZodDeepPartial(isOptional ? value.unwrap() : value, allowUnset);
          return [key, (isOptional && allowUnset ? partial.nullable() : partial).optional()];
        }),
      ),
    ) as any;
  }

  if (schema instanceof z.ZodArray) {
    // Don't allow deep-partial for arrays - new arrays will fully override the previous value
    return schema as any;
  }

  if (schema instanceof z.ZodOptional) {
    // No `null` here, unlike an optional field inside an object shape: an optional reached on its own
    // is a whole payload the caller may omit, and there is no field for `null` to remove.
    return ZodDeepPartial(schema.unwrap(), allowUnset).optional() as any;
  }

  if (schema instanceof z.ZodIntersection) {
    return z.intersection(
      ZodDeepPartial(schema.def.left, allowUnset),
      ZodDeepPartial(schema.def.right, allowUnset),
    ) as any;
  }

  if (schema instanceof z.ZodUnion) {
    return z.union(schema.def.options.map((option: z.core.$ZodType) => ZodDeepPartial(option, allowUnset))) as any;
  }

  return schema as any;
};
