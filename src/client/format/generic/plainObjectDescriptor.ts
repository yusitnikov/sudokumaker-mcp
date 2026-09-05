import type { ObjectDescriptor } from "../ObjectDescriptor";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { indent } from "./indent";
import type { ObjectNode } from "../ObjectNode";
import { markLinesBlock } from "./markBlock";
import { formatHandleMarker } from "../formatHandleMarker";
import { SUMMARY_BUDGET } from "../sizeLimits";

export type ObjectDescriptorsMap<T, RootT> = {
  [K in keyof T]?:
    | ObjectDescriptor<Exclude<T[K], undefined>, RootT>
    | ((node: ObjectNode<T, RootT>) => ObjectDescriptor<Exclude<T[K], undefined>, RootT>);
};

/** A plain object, printed and diffed key by key. */
export const getPlainObjectDescriptor = <T extends Record<string, any>, RootT>({
  childMap,
  allowOtherKeys = true,
  ignoredKeys,
}: {
  childMap?: ObjectDescriptorsMap<T, RootT>;
  allowOtherKeys?: boolean;
  ignoredKeys?: (keyof T)[] | ((value: T) => (keyof T)[]);
} = {}): ObjectDescriptor<T, RootT> => {
  const getKeys = (value: T) => {
    const ignoredKeysCalc = typeof ignoredKeys === "function" ? ignoredKeys(value) : ignoredKeys;

    return Object.keys(allowOtherKeys ? value : (childMap ?? value)).filter((key) => !ignoredKeysCalc?.includes(key));
  };

  const getChildNoCheck = (node: ObjectNode<T, RootT>, segment: string) => {
    const descriptor = childMap?.[segment];
    return node._child(
      segment,
      (typeof descriptor === "function" ? descriptor(node) : descriptor) as
        | ObjectDescriptor<T[typeof segment], RootT>
        | undefined,
    );
  };

  return {
    child(node, segment) {
      const keys = getKeys(node.value);

      if (!keys.includes(segment)) {
        throw new NoSuchHandleError(node.handle, keys.join(", ") || "(no children)");
      }

      return getChildNoCheck(node, segment);
    },

    format(node, opts) {
      const childNodes = getKeys(node.value)
        .filter((key) => node.value[key] !== undefined)
        .map((key) => ({ key, childNode: node.child(key) }));
      const parts = childNodes.map(({ key, childNode }) => `${key}: ${childNode.format(opts)}`);
      const shortFormat = `{ ${parts.join(", ")} }`;

      if (opts.collapse) {
        // If the oneliner is short enough, just return it
        if (shortFormat.length <= 80) {
          return shortFormat;
        }

        const summarized = childNodes.map(({ key, childNode }) => `${key}: ${childNode.getSummary()}`).join(", ");
        return `{ ${summarized} }${formatHandleMarker(node, opts)}`;
      }

      return shortFormat.includes("\n") || shortFormat.length > 200 ? `{\n${indent(parts.join("\n"))}\n}` : shortFormat;
    },

    getSummary(node) {
      const keys = getKeys(node.value).filter((key) => node.value[key] !== undefined);

      // Key names identify an object far better than a count does, so they're kept while they fit:
      // `{ x, y, radius }` says what this is, `{ 3 keys }` doesn't. The values are what overflowed.
      const keysStr = `{ ${keys.join(", ")} }`;
      return keysStr.length <= SUMMARY_BUDGET ? keysStr : `{ ${keys.length} ${keys.length === 1 ? "key" : "keys"} }`;
    },

    diff(from, to) {
      const keys = [...new Set([...getKeys(from.value), ...getKeys(to.value)])];
      const lines = keys.flatMap((key) => diffChild(key, getChildNoCheck(from, key), getChildNoCheck(to, key)));
      return `{\n${lines.join("\n")}\n}`;
    },
  };
};

/** Diffs one child of a composite node. */
const diffChild = <T, RootT>(key: string, fromNode: ObjectNode<T, RootT>, toNode: ObjectNode<T, RootT>): string[] => {
  if (fromNode.value === undefined && toNode.value === undefined) {
    return [];
  }

  if (fromNode.value !== undefined && toNode.value === undefined) {
    // Removed key: its handle no longer resolves under this object - undo/redo is the way back.
    const text = fromNode.format({ collapse: false, skipHandle: true });
    return markLinesBlock("- ", `${key}: ${text}`, true);
  }

  if (fromNode.value === undefined && toNode.value !== undefined) {
    const text = toNode.format({ collapse: false });
    return markLinesBlock("+ ", `${key}: ${text}`, true);
  }

  if (JSON.stringify(fromNode.value) !== JSON.stringify(toNode.value)) {
    const text = fromNode.diff(toNode);
    return markLinesBlock("~ ", `${key}: ${text}`);
  }

  const text = fromNode.format({ collapse: true, skipHandle: true });
  return markLinesBlock("  ", `${key}: ${text}`);
};
