import type { ObjectDescriptor } from "../ObjectDescriptor";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { getArrayDiff, type DiffOperation, type ArrayItem } from "../diff";
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
  /** Are edit operations allowed for the items (defaults to true) */
  canEditItems?: boolean;
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
  canEditItems = true,
}: ArrayDescriptorOptions<ItemT, RootT>): ObjectDescriptor<ItemT[], RootT> => ({
  child(node, segment) {
    const position = Number(segment);
    const index = position - 1;
    if (!Number.isInteger(position) || !(index in node.value)) {
      throw new NoSuchHandleError(node.handle, "one-based array index");
    }
    return node._child(index, itemDescriptor, segment);
  },

  format(node, opts, isRoot) {
    const childNodes = node.value.map((_, index) => node._child(index, itemDescriptor, index + 1));
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
        truncatedLines.push(`… ${remaining}${count ? " more" : ""} ${countLabel}${formatHandleMarker(node, opts)}`);
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
        const collapsed = node._child(index, itemDescriptor, index + 1).format({ ...opts, collapse: true });

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
    const ops = getArrayDiff(from.value, to.value, key, canEditItems);

    return renderArrayDiff(ops, from.value.length, to.value.length, {
      formatAdded: (toItem) => to._child(toItem.index, itemDescriptor, toItem.index + 1).format({ collapse: false }),
      formatRemoved: (fromItem, collapse = false) =>
        from._child(fromItem.index, itemDescriptor, fromItem.index + 1).format({ collapse, skipHandle: true }),
      formatUnchanged: (toItem) => to._child(toItem.index, itemDescriptor, toItem.index + 1).format({ collapse: true }),
      diffItem: (fromItem, toItem) =>
        from
          ._child(fromItem.index, itemDescriptor, fromItem.index + 1)
          .diff(to._child(toItem.index, itemDescriptor, toItem.index + 1)),
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
 * Windows the diff's ops down to the changed items plus their immediate unchanged neighbors,
 * folding the rest of each unchanged run into one `... (N items, didn't change)` line - the array
 * rule's windowing. `getArrayDiff` already groups a run into one "unchanged" op, so at most its
 * first and last items ever serve as context, one on each side of the run.
 */
const renderArrayDiff = <T>(
  ops: DiffOperation<T>[],
  fromCount: number,
  toCount: number,
  itemOps: ArrayDiffItemOps<T>,
): string => {
  const lines: string[] = [];

  ops.forEach((op, index) => {
    switch (op.type) {
      case "unchanged": {
        // The run's first item is context for a preceding change, its last item for a following
        // one - a Set so a one-item run bordered by change on both sides still shows once.
        const n = op.items.length;
        const lastIndex = n - 1;
        const shown = new Set<number>();
        if (index > 0) {
          shown.add(0);
        }
        if (index < ops.length - 1) {
          shown.add(lastIndex);
        }

        if (shown.has(0)) {
          lines.push(markTextBlock("  ", itemOps.formatUnchanged(op.items[0]), true));
        }
        const foldedCount = n - shown.size;
        if (foldedCount > 0) {
          lines.push(`  ... (${foldedCount} ${itemOps.countLabel}, didn't change)`);
        }
        if (lastIndex !== 0 && shown.has(lastIndex)) {
          lines.push(markTextBlock("  ", itemOps.formatUnchanged(op.items[lastIndex]), true));
        }
        break;
      }
      case "added": {
        // A moved item was already in the list, so its content isn't news - what's new is where it
        // sits now, and whatever changed on the way. The removal half names this position back.
        const from = op.movedFrom;
        const edited = from && stringifyValue(from.value) !== stringifyValue(op.item.value);
        lines.push(
          markTextBlock(
            "+ ",
            from
              ? `(moved from position ${position(from)}${edited ? " + edited" : " with no changes"}) ${edited ? itemOps.diffItem(from, op.item) : itemOps.formatUnchanged(op.item)}`
              : itemOps.formatAdded(op.item),
            true,
          ),
        );
        break;
      }
      case "removed":
        lines.push(
          markTextBlock(
            "- ",
            (op.movedTo ? `(moved to position ${position(op.movedTo)}) ` : "") +
              itemOps.formatRemoved(op.item, !!op.movedTo),
            true,
          ),
        );
        break;
      case "edited":
      default:
        lines.push(markTextBlock("~ ", itemOps.diffItem(op.from, op.to)));
        break;
    }
  });

  return [
    `${toCount} ${itemOps.countLabel}${fromCount === toCount ? "" : ` (was ${fromCount})`} [`,
    ...lines,
    "]",
  ].join("\n");
};
