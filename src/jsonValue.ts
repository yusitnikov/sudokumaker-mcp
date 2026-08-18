import { z } from "zod";

/**
 * Any valid JSON value - unlike `z.any()`/`z.unknown()`, which render as an empty `{}` node with no
 * `type` at all, every leaf here still carries a real JSON-Schema `type`. A typeless node is what
 * makes at least one real MCP client stringify the value before sending it instead of passing it
 * through as an object/array (confirmed live against `add_element`), so this is the fallback used
 * below instead of `z.any()`.
 */
export const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);
