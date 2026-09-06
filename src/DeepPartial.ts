import { z } from "zod";
import deepmerge from "deepmerge";

export type DeepPartial<T> = T extends any[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

// noinspection JSUnusedGlobalSymbols
export const mergeDeepUpdates = <T>(object: T, updates: DeepPartial<T>) =>
  deepmerge<T>(object, updates as any, {
    // Override previous arrays completely instead of merging
    arrayMerge: (_target, source) => source,
  });

const cache = new Map<z.core.$ZodType, z.ZodType>();
/** The result is only ever used to validate incoming update payloads, never to encode or decode. */
export const ZodDeepPartial = <OutputT, InputT>(
  schema: z.core.$ZodType<OutputT, InputT>,
): z.ZodType<DeepPartial<OutputT>, DeepPartial<InputT>> => {
  const cached = cache.get(schema);
  if (cached) {
    return cached as z.ZodType<DeepPartial<OutputT>, DeepPartial<InputT>>;
  }

  let result = ZodDeepPartialInner(schema);

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
};
const ZodDeepPartialInner = <OutputT, InputT>(
  schema: z.core.$ZodType<OutputT, InputT>,
): z.ZodType<DeepPartial<OutputT>, DeepPartial<InputT>> => {
  if (schema instanceof z.ZodCodec) {
    return ZodDeepPartial(schema.def.in) as any;
  }

  if (schema instanceof z.ZodObject) {
    return z.object(
      Object.fromEntries(
        Object.entries(schema.def.shape).map(([key, value]) => [
          key,
          ZodDeepPartial(value instanceof z.ZodOptional ? value.unwrap() : value).optional(),
        ]),
      ),
    ) as any;
  }

  if (schema instanceof z.ZodArray) {
    // Don't allow deep-partial for arrays - new arrays will fully override the previous value
    return schema as any;
  }

  if (schema instanceof z.ZodOptional) {
    return ZodDeepPartial(schema.unwrap()).optional() as any;
  }

  if (schema instanceof z.ZodIntersection) {
    return z.intersection(ZodDeepPartial(schema.def.left), ZodDeepPartial(schema.def.right)) as any;
  }

  if (schema instanceof z.ZodUnion) {
    return z.union(schema.def.options.map(ZodDeepPartial)) as any;
  }

  return schema as any;
};
