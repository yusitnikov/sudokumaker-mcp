import { z } from "zod";
import {
  type FrontendRunResult,
  type FrontendToolOptions,
  SimpleFrontendToolImplementation,
} from "./SimpleFrontendToolImplementation";

/**
 * A tool whose body is supplied as a callback rather than by subclassing -
 * what a tool that needs nothing beyond the base helpers uses.
 */
export class FrontendCallbackToolImplementation<
  SchemaT extends z.ZodSchema,
> extends SimpleFrontendToolImplementation<SchemaT> {
  constructor(
    options: FrontendToolOptions<SchemaT>,
    protected readonly run: (
      this: FrontendCallbackToolImplementation<SchemaT>,
      params: z.input<SchemaT>,
    ) => FrontendRunResult | Promise<FrontendRunResult>,
  ) {
    super(options);
  }
}
