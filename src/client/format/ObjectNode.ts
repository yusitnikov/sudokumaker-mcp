import type { ObjectDescriptor } from "./ObjectDescriptor";
import type { FormatOpts } from "./FormatOpts";
import { childHandle } from "./childHandle";
import { getUnknownDescriptor } from "./generic/unknownDescriptor";
import { SUMMARY_BUDGET } from "./sizeLimits";

export class ObjectNode<T, RootT> {
  constructor(
    /** The encoded value at this node, typed as the descriptor's own value type. */
    public readonly value: T,
    /** Writes a new value into the place this node came from. */
    public readonly setValue: (value: T) => void,
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

  /** One named child. Throws `NoSuchHandleError` naming this node's handle and what it does accept. */
  child(segment: string): ObjectNode<any, RootT> {
    return this.descriptor.child(this, segment);
  }

  /**
   * Folds `path`'s dot-separated segments through `child`, starting at this node.
   *
   * Does nothing about failure: a segment that doesn't resolve throws
   * `NoSuchHandleError` straight out of the `child` that rejected it -
   * the node that owns the vocabulary is the one that raises the error.
   */
  resolveHandle(path: string): ObjectNode<any, RootT> {
    if (!path) {
      return this;
    }

    let current: ObjectNode<any, RootT> = this;
    for (const segment of path.split(".")) {
      current = current.child(segment);
    }
    return current;
  }

  /**
   * Builds the child node for a known key of `value`, defaulting to the generic `object` descriptor.
   * `handleSegment` overrides the printed handle segment when it must differ from the storage key
   * (e.g. an array index is stored zero-based but printed one-based, the way the reader counts).
   */
  _child<KeyT extends keyof T>(
    key: KeyT,
    descriptor: ObjectDescriptor<T[KeyT], RootT> = getUnknownDescriptor(),
    handleSegment: KeyT | string = key,
  ) {
    return new ObjectNode(
      this.value[key],
      (value) => {
        this.value[key] = value;
      },
      childHandle(this.handle, String(handleSegment)),
      this.root,
      descriptor,
    );
  }

  /**
   * This node's whole text: its header and whatever of its children it prints.
   * Pass `isRoot` when this is the node the caller asked for by `path` - it then prints whole
   * rather than collapsing itself behind a handle the caller already used.
   */
  format(opts: FormatOpts, isRoot?: boolean): string {
    return this.descriptor.format(this, opts, isRoot);
  }

  /**
   * The shortest readable form of this node, for printing inside an already-collapsed parent.
   *
   * Prefers the real content: the collapsed text is returned as-is whenever it fits the budget,
   * so a small object keeps its fields and a short string keeps its characters. Only text that
   * overflows the budget falls back to the descriptor's own summary. A descriptor without one has
   * nothing shorter to offer, so its collapsed text stands.
   */
  getSummary(): string {
    const collapsed = this.format({ collapse: true, skipHandle: true });
    if (collapsed.length <= SUMMARY_BUDGET) {
      return collapsed;
    }
    return this.descriptor.getSummary?.(this) ?? collapsed;
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
