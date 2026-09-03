import { z } from "zod";

const ExtractZodObject = <OutputT, InputT, T extends z.ZodType<OutputT, InputT>, IoT extends "in" | "out">(
  schema: T,
  io: IoT,
): z.ZodObject<{
  [K in keyof (IoT extends "in" ? InputT : OutputT)]: z.ZodType<(IoT extends "in" ? InputT : OutputT)[K]>;
}> => {
  if (schema instanceof z.ZodObject) {
    return schema as any;
  }

  if (schema instanceof z.ZodCodec) {
    return ExtractZodObject(schema.def[io] as any, io);
  }

  if (schema instanceof z.ZodIntersection) {
    return z.object({
      ...ExtractZodObject(schema.def.left as any, io).def.shape,
      ...ExtractZodObject(schema.def.right as any, io).def.shape,
    }) as any;
  }

  console.debug("Object not supported:", schema);
  throw new Error("Object not supported!");
};

const ExtractZodLiteral = <IoT extends "in" | "out">(schema: z.ZodType, io: IoT): any => {
  if (schema instanceof z.ZodCodec) {
    return ExtractZodLiteral(schema.def[io] as any, io);
  }

  if (schema instanceof z.ZodLiteral) {
    return schema.value;
  }

  console.debug("Literal not supported:", schema);
  throw new Error("Literal not supported!");
};

export const SmartDiscriminatedUnion = <T extends z.ZodType>(discriminator: string, options: T[]): z.ZodUnion<T[]> => {
  const optionsEx = options.map((option) => {
    const inSchema = ExtractZodObject(option, "in");
    const outSchema = ExtractZodObject(option, "out");

    const inValue = ExtractZodLiteral((inSchema.shape as any)[discriminator], "in");
    const outValue = ExtractZodLiteral((outSchema.shape as any)[discriminator], "out");

    return {
      source: option,
      in: {
        schema: z.object({
          ...inSchema.shape,
          [discriminator]: z.literal(inValue),
        }),
        value: inValue,
      },
      out: {
        schema: z.object({
          ...outSchema.shape,
          [discriminator]: z.literal(outValue),
        }),
        value: outValue,
      },
    };
  });

  const findOption = (value: any, io: "in" | "out") =>
    optionsEx.find((option) => option[io].value === value[discriminator]);

  return z.codec(
    z.discriminatedUnion(discriminator, optionsEx.map(({ in: { schema } }) => schema) as any),
    z.discriminatedUnion(discriminator, optionsEx.map(({ out: { schema } }) => schema) as any),
    {
      encode: (value) => {
        const option = findOption(value, "out")!;

        value = option.out.schema.decode(value);
        value = option.source.encode(value);
        value = option.in.schema.decode(value);

        return value;
      },
      decode: (value) => {
        const option = findOption(value, "in")!;

        value = option.in.schema.encode(value);
        value = option.source.decode(value);
        value = option.out.schema.encode(value);

        return value;
      },
    },
  ) as any;
};
