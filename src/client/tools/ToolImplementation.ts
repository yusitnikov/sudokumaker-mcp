import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface ToolOptions<SchemaT extends z.ZodSchema> {
  name: string;
  title?: string;
  description?: string;
  inputSchema: SchemaT;
}

/**
 * Registry of hand-written advertised-schema replacements, keyed by the real field schema. Used for
 * fields too large to advertise as-is (`add_element`'s 52-branch element union) or environment-
 * dependent (a codec reading `window.Api`). A private registry rather than `.meta()`, so the
 * replacement doesn't leak into `tool.definition`'s JSON Schema, which reflects the true shape.
 *
 * Value typed `unknown`, not `z.ZodType`: storing a `z.ZodType` as metadata blows up TS's
 * instantiation depth. `withAdvertisedSchema` enforces the real type at the boundary instead.
 */
const advertisedSchemaOverrides = z.registry<{ advertisedSchema: unknown }>();

/**
 * Registers `advertisedSchema` as the `publicShape` replacement for `realSchema`, and returns `realSchema` unchanged.
 */
export const withAdvertisedSchema = <T extends z.ZodType>(realSchema: T, advertisedSchema: z.ZodType): T => {
  advertisedSchemaOverrides.add(realSchema, { advertisedSchema });
  return realSchema;
};

/**
 * Unwraps `ZodOptional`/`ZodDefault`/`ZodCodec` (to its input side, `.def.in`) down to the shape-carrying node.
 */
const stripNonShapeWrappers = (schema: z.core.$ZodType): z.ZodType => {
  let current: z.core.$ZodType = schema;

  while (true) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodDefault) {
      current = current.unwrap();
    } else if (current instanceof z.ZodCodec) {
      current = current.def.in;
    } else {
      break;
    }
  }

  // `ZodCodec.def.in` types as `core.$ZodType`; every codec here is a classic `ZodType` at runtime.
  if (!(current instanceof z.ZodType)) {
    throw new Error("Encountered a non-classic zod schema while unwrapping");
  }

  return current;
};

export abstract class ToolImplementation<SchemaT extends z.ZodSchema> {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  protected readonly inputSchema: SchemaT;

  constructor({ name, title, description, inputSchema }: ToolOptions<SchemaT>) {
    this.name = name;
    this.title = title;
    this.description = description;
    this.inputSchema = inputSchema;
  }

  /**
   * Projects this tool's real input schema into a shallow zod object `registerTool` can advertise -
   * real top-level parameter names instead of one opaque `params` blob. Each field advertises its
   * real type unless overridden via `withAdvertisedSchema`, but is registered as `z.any().meta(...)`
   * carrying that type's JSON Schema: `registerTool` validates arguments in Node against whatever
   * schema it's given, and some fields are (or contain) codecs that read `window.Api`, which doesn't
   * exist in Node. Validation still only happens page-side, in `tool.run`; `z.any()` just advertises.
   */
  get publicShape(): Record<string, z.ZodType> {
    if (!(this.inputSchema instanceof z.ZodObject)) {
      throw new Error("publicShape expects an object schema");
    }

    const shape: Record<string, z.ZodType> = {};

    for (const [key, rawField] of Object.entries(this.inputSchema.shape)) {
      const unwrapped = stripNonShapeWrappers(rawField);

      // Cast is safe: `withAdvertisedSchema` is the only writer, and only accepts a `z.ZodType`.
      const override = advertisedSchemaOverrides.get(unwrapped)?.advertisedSchema as z.ZodType | undefined;

      const advertisedField = override ?? rawField;
      const isOptional = advertisedField instanceof z.ZodOptional || advertisedField instanceof z.ZodDefault;

      // `z.any()` still rejects a missing value in Zod v4, so optionality has to be reapplied here.
      let publicField: z.ZodType = z.any().meta(
        z.toJSONSchema(advertisedField, {
          io: "input",
        }) as z.core.JSONSchemaMeta,
      );
      if (isOptional) {
        publicField = publicField.optional();
      }

      shape[key] = publicField;
    }

    return shape;
  }

  validateParams(params: unknown) {
    return this.inputSchema.encode(this.inputSchema.parse(params));
  }

  protected formatErrorResponse(error: unknown): CallToolResult {
    return {
      content: [
        {
          type: "text",
          text: `${error instanceof Error ? error.message : String(error)}\n\nTechnical error: fix the call and retry; don't relay this to the user.`,
        },
      ],
      isError: true,
    };
  }
}
