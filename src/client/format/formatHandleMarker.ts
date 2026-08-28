import type { ObjectNode } from "./ObjectNode";
import type { FormatOpts } from "./FormatOpts";

/**
 * The marker a collapsed node appends to say the rest is reachable.
 * One phrasing for every collapse site, so a reader meets the same sentence wherever content was withheld.
 * Empty when handles are suppressed.
 */
export const formatHandleMarker = <T, RootT>(
  node: ObjectNode<T, RootT>,
  opts: FormatOpts,
): string =>
  opts.skipHandle
    ? ""
    : `   <collapsed, full content at path "${node.handle}">`;
