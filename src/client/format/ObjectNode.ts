import type { ObjectDescriptor } from "./ObjectDescriptor";
import type { FormatOpts } from "./FormatOpts";
import { childHandle } from "./childHandle";
import { unknownDescriptor } from "./generic/unknownDescriptor";

export class ObjectNode<T, RootT> {
  constructor(
    /** The encoded value at this node, typed as the descriptor's own value type. */
    public readonly value: T,
    /** Dot-path from the root that reached it: "allElements.3.config.style". */
    public readonly handle: string,
    /**
     * The whole tree this node lives in, for a descriptor that needs to reach outside its own
     * subtree (`cells` reads `root.allElements` for separators). Carried on the node itself so it
     * travels with every child automatically.
     */
    public readonly root: RootT,
    public readonly descriptor: ObjectDescriptor<T, RootT>,
  ) {}

  /** One named child, for `resolveHandle`'s fold. Throws `NoSuchHandleError` naming this node's handle and what it does accept. */
  child(segment: string): ObjectNode<any, RootT> {
    return this.descriptor.child(this, segment);
  }

  /** Builds the child node for a known key of `value`, defaulting to the generic `object` descriptor. */
  _child<KeyT extends keyof T>(
    key: KeyT,
    descriptor: ObjectDescriptor<T[KeyT], RootT> = unknownDescriptor,
  ) {
    return new ObjectNode(
      this.value[key],
      childHandle(this.handle, String(key)),
      this.root,
      descriptor,
    );
  }

  /** This node's whole text: its header and whatever of its children it prints. */
  format(opts: FormatOpts): string {
    return this.descriptor.format(this, {
      ...opts,
      collapse: opts.collapse && !opts.expanded?.has(this.handle),
    });
  }

  /**
   * This node against an older version of itself: prints its current state with the changes
   * marked in place, omitting children nothing touched. `this` is the "from" side; `to` is the
   * newer node.
   */
  diff(to: ObjectNode<T, RootT>): string {
    return this.descriptor.diff(this, to);
  }
}
