import type { ObjectNode } from "./ObjectNode";
import type { FormatOpts } from "./FormatOpts";

export interface ObjectDescriptor<T, RootT> {
  /**
   * One named child, for resolveHandle's fold. The only member with a caller
   * outside the node itself. Throws NoSuchHandleError naming this node's handle
   * and what it does accept - the node that knows the vocabulary writes the message.
   * `any` because a child's value type is that child's own business, not this node's.
   */
  child(node: ObjectNode<T, RootT>, segment: string): ObjectNode<any, RootT>;
  /** This node's whole text: its header and whatever of its children it prints. */
  format(node: ObjectNode<T, RootT>, opts: FormatOpts): string;
  /**
   * This node against an older version of itself: prints its current state with the
   * changes marked in place, omitting children nothing touched. A node that holds a
   * collection pairs its own items here - it knows what identifies them.
   */
  diff(from: ObjectNode<T, RootT>, to: ObjectNode<T, RootT>): string;
}
