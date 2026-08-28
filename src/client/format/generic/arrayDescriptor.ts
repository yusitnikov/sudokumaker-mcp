import type { ObjectDescriptor } from "../ObjectDescriptor";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { alignArray, type AlignOp, type ArrayItem } from "../renderDiff";
import { indent } from "./indent";
import { markTextBlock } from "./markBlock";
import { SIZE_FLOOR } from "../sizeLimits";
import { formatHandleMarker } from "../formatHandleMarker";
import { stringifyValue } from "./stringifyValue";

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

  format(node, opts, isRoot) {
    const childNodes = node.value.map((_, index) =>
      node._child(index, itemDescriptor),
    );
    const items = childNodes.map((childNode) => childNode.format(opts));
    const shortFormat = `[ ${items.join(", ")} ]`;

    if (opts.collapse) {
      // If the oneliner is short enough, just return it
      if (shortFormat.length <= 80) {
        return shortFormat;
      }

      const summaries = childNodes.map((childNode) => childNode.getSummary());

      let count = node.value.length;
      const format = () => {
        const parts = summaries.slice(0, count);
        if (count !== node.value.length) {
          parts.push(`… (${node.value.length} ${countLabel})`);
        }
        return `[ ${parts.join(", ")} ]${formatHandleMarker(node, opts)}`;
      };

      // Truncate the items in the end of the array
      while (count > 0 && format().length > 80) {
        count--;
      }

      return format();
    }

    if (!shortFormat.includes("\n") && shortFormat.length <= 200) {
      return shortFormat;
    }

    let count = items.length;

    const format = () => {
      const truncatedLines = items.slice(0, count);
      const remaining = items.length - count;
      if (remaining) {
        truncatedLines.push(
          `… ${remaining}${count ? " more" : ""} ${countLabel}${formatHandleMarker(node, opts)}`,
        );
      }
      return `[\n${indent(truncatedLines.join("\n"))}\n]`;
    };
    const isTooBig = () => format().length > sizeLimit;

    if (isRoot) {
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
    while (count > 0 && isTooBig()) {
      count--;
    }

    return format();
  },

  getSummary(node) {
    return `[ ${node.value.length} ${countLabel} ]`;
  },

  diff(from, to) {
    const ops = alignArray(from.value, to.value, key);

    return renderArrayDiff(ops, from.value.length, to.value.length, {
      formatAdded: (toItem) =>
        to._child(toItem.index, itemDescriptor).format({ collapse: false }),
      formatRemoved: (fromItem, collapse = false) =>
        from
          ._child(fromItem.index, itemDescriptor)
          .format({ collapse, skipHandle: true }),
      formatUnchanged: (toItem) =>
        to._child(toItem.index, itemDescriptor).format({ collapse: true }),
      diffItem: (fromItem, toItem) =>
        from
          ._child(fromItem.index, itemDescriptor)
          .diff(to._child(toItem.index, itemDescriptor)),
      countLabel,
    });
  },
});

interface ArrayDiffItemOps<T> {
  /** An item of the new array, in full. */
  formatAdded: (item: ArrayItem<T>) => string;
  /** An item of the old array, in full, or on one line when `collapse` is set. */
  formatRemoved: (item: ArrayItem<T>, collapse?: boolean) => string;
  /** An item of the new array, on one line. */
  formatUnchanged: (item: ArrayItem<T>) => string;
  /** One item against its older self, as the object-diff rule renders it. */
  diffItem: (from: ArrayItem<T>, to: ArrayItem<T>) => string;
  countLabel: string;
}

/** An item's place in its list, counted from 1 the way the reader counts. */
const position = ({ index }: ArrayItem<unknown>) => index + 1;

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
    .map((op, i) => (op.type === "unchanged" ? -1 : i))
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
    if (op.type === "unchanged") {
      if (keepContext.has(index)) {
        flushRun();
        lines.push(markTextBlock("  ", itemOps.formatUnchanged(op.item), true));
      } else {
        unchangedRun++;
      }
      return;
    }
    flushRun();
    if (op.type === "added") {
      // A moved item was already in the list, so its content isn't news - what's new is where it
      // sits now, and whatever changed on the way. The removal half names this position back.
      const from = op.movedFrom;
      const edited =
        from && stringifyValue(from.value) !== stringifyValue(op.item.value);
      lines.push(
        markTextBlock(
          "+ ",
          from
            ? `(moved from position ${position(from)}${edited ? " + edited" : " with no changes"}) ${edited ? itemOps.diffItem(from, op.item) : itemOps.formatUnchanged(op.item)}`
            : itemOps.formatAdded(op.item),
          true,
        ),
      );
    } else if (op.type === "removed") {
      lines.push(
        markTextBlock(
          "- ",
          (op.movedTo ? `(moved to position ${position(op.movedTo)}) ` : "") +
            itemOps.formatRemoved(op.item, !!op.movedTo),
          true,
        ),
      );
    } else {
      lines.push(markTextBlock("~ ", itemOps.diffItem(op.from, op.to)));
    }
  });
  flushRun();

  return [
    `${toCount} ${itemOps.countLabel}${fromCount === toCount ? "" : ` (was ${fromCount})`} [`,
    ...lines,
    "]",
  ].join("\n");
};
