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

  /**
   * This node's whole text: its header and whatever of its children it prints.
   * `isRoot` marks the node the caller asked for by `path`: it prints whole, ignoring the size
   * cuts, because a marker pointing back at that same path would tell the caller nothing. It is a
   * parameter of its own rather than a `FormatOpts` field so that formatting a child - which is
   * not what the caller asked for - can't inherit it by passing `opts` along.
   */
  format(
    node: ObjectNode<T, RootT>,
    opts: FormatOpts,
    isRoot?: boolean,
  ): string;

  /**
   * The shortest statement of what this node is, for when its collapsed text is still too long
   * to sit inside an already-collapsed parent - a count, a size, an identity. One line, no handle,
   * and short enough that a parent can print one per child without overflowing.
   *
   * Optional: a node whose collapsed form already fits the budget never needs one. `getSummary` on
   * the node is what decides that; a descriptor that leaves this out simply keeps its collapsed
   * text however long it is.
   */
  getSummary?(node: ObjectNode<T, RootT>): string | undefined;

  /**
   * This node against an older version of itself: prints its current state with the
   * changes marked in place, omitting children nothing touched. A node that holds a
   * collection pairs its own items here - it knows what identifies them.
   */
  diff(from: ObjectNode<T, RootT>, to: ObjectNode<T, RootT>): string;
}
