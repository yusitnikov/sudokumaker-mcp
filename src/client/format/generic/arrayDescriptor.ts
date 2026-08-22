import type { ObjectDescriptor } from "../ObjectDescriptor";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { alignArray, type AlignOp } from "../renderDiff";
import { indent } from "./indent";
import { truncate } from "./truncate";
import { markTextBlock } from "./markBlock";
import { SIZE_FLOOR } from "../SIZE_FLOOR";

interface ArrayDescriptorOptions<ItemT, RootT> {
  /** How one item is formatted/diffed. */
  itemDescriptor: ObjectDescriptor<ItemT, RootT>;
  /** Pairs items by this key regardless of position, instead of by deep equality (`elementList` pairs by `id`). */
  key?: (item: ItemT) => string;
  /** Noun for counts and windowing text ("3 items" / "3 elements"). Defaults to "items". */
  countLabel?: string;
  /** Truncate the output that exceeds the length below (in characters) */
  sizeLimit?: number;
}

/**
 * A generic array - enclosed in `[]`, windowed by the size floor. Parameterized by the item
 * descriptor so an array of a known shape (e.g. `symbols`, each a plain object) prints each item
 * properly instead of flattening it to one opaque JSON blob.
 */
export const getArrayDescriptor = <ItemT, RootT>({
  itemDescriptor,
  key,
  countLabel = "items",
  sizeLimit = SIZE_FLOOR,
}: ArrayDescriptorOptions<ItemT, RootT>): ObjectDescriptor<ItemT[], RootT> => ({
  child(node, segment) {
    const index = Number(segment);
    if (!Number.isInteger(index) || !(index in node.value)) {
      throw new NoSuchHandleError(node.handle, "zero-based array index");
    }
    return node._child(index, itemDescriptor);
  },

  format(node, opts) {
    const items = node.value.map((_, index) =>
      node._child(index, itemDescriptor).format(opts),
    );

    const itemsStr = items.join(", ");
    const shortFormat = `[ ${itemsStr} ]`;

    if (opts.collapse) {
      // Short form: the array's own inline text, truncated - with the item count appended once it
      // no longer fits, since a truncated item list on its own doesn't say how much was cut.
      const truncated = truncate(itemsStr, 50);

      return truncated === itemsStr
        ? shortFormat
        : `[ ${truncated} (${node.value.length} ${countLabel}${opts.skipHandle ? "" : `, handle "${node.handle}" for the rest`}) ]`;
    }

    if (!shortFormat.includes("\n") && shortFormat.length <= 200) {
      return shortFormat;
    }

    let count = items.length;

    const format = () => {
      const truncatedLines = items.slice(0, count);
      const remaining = items.length - count;
      if (remaining) {
        let suffix = `… ${remaining}${count ? " more" : ""} ${countLabel}`;
        if (!opts.skipHandle) {
          suffix += `, handle "${node.handle}"${count ? " for the rest" : ""}`;
        }
        truncatedLines.push(suffix);
      }
      return `[\n${indent(truncatedLines.join("\n"))}\n]`;
    };
    const isTooBig = () => format().length > sizeLimit;

    if (opts.expanded?.has(node.handle)) {
      return format();
    }

    // Apply different strategies to prevent giant output...

    const collapseOpportunities = items
      .map((line, index) => {
        const collapsed = node
          ._child(index, itemDescriptor)
          .format({ ...opts, collapse: true });

        return {
          index,
          collapsed,
          diff: line.length - collapsed.length,
        };
      })
      .filter(({ diff }) => diff > 0)
      .sort((a, b) => b.diff - a.diff);

    // Collapse the items, the largest first
    for (const { index, collapsed } of collapseOpportunities) {
      if (!isTooBig()) {
        break;
      }

      items[index] = collapsed;
    }

    // Truncate the items in the end of the array
    if (!opts.expanded?.size) {
      while (count > 0 && isTooBig()) {
        count--;
      }
    }

    return format();
  },

  diff(from, to) {
    const ops = alignArray(from.value, to.value, key);

    return renderArrayDiff(ops, from.value.length, to.value.length, {
      formatAdded: (_, toIndex) =>
        to._child(toIndex, itemDescriptor).format({ collapse: false }),
      formatRemoved: (_, fromIndex) =>
        from
          ._child(fromIndex, itemDescriptor)
          .format({ collapse: false, skipHandle: true }),
      formatUnchanged: (_, toIndex) =>
        to._child(toIndex, itemDescriptor).format({ collapse: true }),
      diffItem: (_fromItem, fromIndex, _toItem, toIndex) =>
        from
          ._child(fromIndex, itemDescriptor)
          .diff(to._child(toIndex, itemDescriptor)),
      countLabel,
    });
  },
});

interface ArrayDiffItemOps<T> {
  /**
   * An added item's text, unindented and unmarked, full up to the size floor - its cutoff handle
   * is live, so oversized content the caller never saw (an element `undo` resurrects) is one
   * `path` call away. `toIndex` is the item's real position in the "to" (live) array.
   */
  formatAdded: (item: T, toIndex: number) => string;
  /**
   * A removed item's text, unindented and unmarked, full up to the size floor - its cutoff names
   * only a count, since the handle it would print no longer resolves; `undo`/`redo` is the way
   * back. `fromIndex` is the item's position in the "from" array - it has no "to" position, since
   * it no longer exists there.
   */
  formatRemoved: (item: T, fromIndex: number) => string;
  /**
   * An unchanged neighbor's text, unindented and unmarked, short - one line, placing the change
   * among its neighbors without printing them in full.
   */
  formatUnchanged: (item: T, toIndex: number) => string;
  /** One changed pair's text, unindented and unmarked - recursed into the object-diff rule and labeled. */
  diffItem: (
    fromItem: T,
    fromIndex: number,
    toItem: T,
    toIndex: number,
  ) => string;
  countLabel: string;
}

/**
 * Windows an aligned array down to the changed items plus their immediate unchanged neighbors,
 * folding every other unchanged run into one `... (N items, didn't change)` line - the array rule's windowing.
 */
const renderArrayDiff = <T>(
  ops: AlignOp<T>[],
  fromCount: number,
  toCount: number,
  itemOps: ArrayDiffItemOps<T>,
): string => {
  const changedIndexes = ops
    .map((op, i) => (op.type === "unchanged" || op.type === "moved" ? -1 : i))
    .filter((i) => i >= 0);

  const keepContext = new Set<number>();
  for (const i of changedIndexes) {
    if (i - 1 >= 0) keepContext.add(i - 1);
    if (i + 1 < ops.length) keepContext.add(i + 1);
  }

  const lines: string[] = [];
  let unchangedRun = 0;
  const flushRun = () => {
    if (unchangedRun > 0) {
      lines.push(
        `  ... (${unchangedRun} ${itemOps.countLabel}, didn't change)`,
      );
      unchangedRun = 0;
    }
  };

  ops.forEach((op, index) => {
    if (op.type === "unchanged" || op.type === "moved") {
      if (keepContext.has(index)) {
        flushRun();
        lines.push(
          markTextBlock(
            "  ",
            itemOps.formatUnchanged(op.value, op.toIndex),
            true,
          ),
        );
      } else {
        unchangedRun++;
      }
      return;
    }
    flushRun();
    if (op.type === "added") {
      lines.push(
        markTextBlock("+ ", itemOps.formatAdded(op.value, op.toIndex), true),
      );
    } else if (op.type === "removed") {
      lines.push(
        markTextBlock(
          "- ",
          itemOps.formatRemoved(op.value, op.fromIndex),
          true,
        ),
      );
    } else {
      lines.push(
        markTextBlock(
          "~ ",
          itemOps.diffItem(op.from, op.fromIndex, op.to, op.toIndex),
        ),
      );
    }
  });
  flushRun();

  return [
    `${toCount} ${itemOps.countLabel}${fromCount === toCount ? "" : ` (was ${fromCount})`} [`,
    ...lines,
    "]",
  ].join("\n");
};
