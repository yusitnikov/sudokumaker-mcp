import { z } from "zod";
import type {
  CallToolResult,
  Tool as SdkTool,
} from "@modelcontextprotocol/sdk/types.js";

export interface Tool {
  definition: SdkTool;
  global?: boolean;
  timeout?: number;
}

/**
 * Data that only the Node side knows, passed inward to the page on every call.
 */
export interface ToolContext {
  tabId: number;
}

/**
 * Strips wrappers that don't change schema's advertised shape — `ZodOptional`, `ZodDefault`,
 * and `ZodCodec` (down to its input side, `.def.in`) — down to the node that carries the shape.
 * Read `.description` from the original, pre-strip node: registry metadata rides on the outermost wrapper.
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

  // `ZodCodec.def.in` is typed as the narrower `core.$ZodType` when narrowed without explicit
  // generics, even though every codec here is built via classic `z.codec(...)` and really is a
  // classic `ZodType` at runtime — this re-check just gets TypeScript to agree.
  if (!(current instanceof z.ZodType)) {
    throw new Error("Encountered a non-classic zod schema while unwrapping");
  }

  return current;
};

/** Whether a stripped schema node is a string/number/boolean/enum/literal. */
const isPrimitiveSchema = (node: z.ZodType): boolean =>
  node instanceof z.ZodLiteral ||
  node instanceof z.ZodEnum ||
  node instanceof z.ZodString ||
  node instanceof z.ZodNumber ||
  node instanceof z.ZodBoolean;

/**
 * The advertised replacement for one schema node, wrappers and all: strips down to shape first,
 * then is itself if that's a primitive, or an array of the same if it's an array of one —
 * otherwise `z.any()`, since only that's cheap enough to check in Node. `z.array(z.any())` beats
 * bare `z.any()` for an array of anything heavier, so a caller at least sees "this is a list".
 */
const toAdvertisedSchema = (schema: z.core.$ZodType): z.ZodType => {
  const node = stripNonShapeWrappers(schema);

  if (isPrimitiveSchema(node)) {
    return node;
  }

  if (node instanceof z.ZodArray) {
    return z.array(toAdvertisedSchema(node.element));
  }

  return z.any();
};

export class ToolImplementation<SchemaT extends z.ZodSchema> {
  constructor(
    private readonly tool: Omit<Tool, "definition"> & {
      definition: Omit<Tool["definition"], "inputSchema">;
    },
    private readonly inputSchema: SchemaT,
    private readonly _run: (
      params: z.input<SchemaT>,
      context: ToolContext,
    ) => CallToolResult | Promise<CallToolResult>,
  ) {}

  get name() {
    return this.tool.definition.name;
  }

  get definition(): Tool {
    return {
      ...this.tool,
      definition: {
        ...this.tool.definition,
        inputSchema: z.toJSONSchema(this.inputSchema, { io: "input" }),
      } as Tool["definition"],
    };
  }

  /**
   * Projects this tool's real input schema into a shallow zod object `registerTool` can advertise
   * directly — real top-level parameter names instead of one opaque `params` blob, cheap types
   * (primitives, enums, arrays of either) checked in Node, everything else `z.any()`. Works on the
   * zod schema graph itself rather than its `z.toJSONSchema` rendering, which collapses distinct zod
   * constructs (e.g. `ColorsSet` re-`.meta()`ing an already-`.meta()`'d `DigitSetSchema`) into `$ref`
   * chains that are hard to classify correctly from the outside.
   *
   * Every field needs a description, its own or the schema it wraps'.
   */
  get publicShape(): Record<string, z.ZodType> {
    if (!(this.inputSchema instanceof z.ZodObject)) {
      throw new Error("publicShape expects an object schema");
    }

    const shape: Record<string, z.ZodType> = {};

    for (const [key, rawField] of Object.entries(this.inputSchema.shape)) {
      const unwrapped = stripNonShapeWrappers(rawField);
      const description = rawField.description ?? unwrapped.description;
      if (!description) {
        throw new Error(
          `publicShape: field "${key}" has no description on its own schema or the schema it wraps`,
        );
      }

      let field = toAdvertisedSchema(unwrapped).describe(description);
      if (rawField instanceof z.ZodDefault) {
        field = field.default(rawField.def.defaultValue);
      } else if (rawField instanceof z.ZodOptional) {
        field = field.optional();
      }
      shape[key] = field;
    }

    return shape;
  }

  run(params: unknown, context: ToolContext) {
    const validatedParams = this.inputSchema.parse(params);

    return this._run(this.inputSchema.encode(validatedParams), context);
  }
}
