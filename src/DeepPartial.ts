import { z } from "zod";

export type DeepPartial<T> = T extends (infer ItemT)[]
  ? DeepPartial<ItemT>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export const ZodDeepPartial = <OutputT, InputT>(
  schema: z.core.$ZodType<OutputT, InputT>,
): z.ZodType<DeepPartial<OutputT>, DeepPartial<InputT>> => {
  if (schema instanceof z.ZodCodec) {
    // codecs can't be partials - no transformation will fit
    return schema as any;
  }

  if (schema instanceof z.ZodObject) {
    return z.object(
      Object.fromEntries(
        Object.entries(schema.def.shape).map(([key, value]) => [
          key,
          ZodDeepPartial(
            value instanceof z.ZodOptional ? value.unwrap() : value,
          ).optional(),
        ]),
      ),
    ) as any;
  }

  if (schema instanceof z.ZodArray) {
    return z.array(ZodDeepPartial(schema.def.element)) as any;
  }

  if (schema instanceof z.ZodOptional) {
    return ZodDeepPartial(schema.unwrap()).optional() as any;
  }

  if (schema instanceof z.ZodIntersection) {
    return z.intersection(
      ZodDeepPartial(schema.def.left),
      ZodDeepPartial(schema.def.right),
    ) as any;
  }

  if (schema instanceof z.ZodUnion) {
    return z.union(schema.def.options.map(ZodDeepPartial)) as any;
  }

  return schema as any;
};
