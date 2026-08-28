import type { ObjectDescriptor } from "../ObjectDescriptor";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { indent } from "./indent";
import { truncate } from "./truncate";
import type { ObjectNode } from "../ObjectNode";
import { markLinesBlock } from "./markBlock";
import { formatHandleMarker } from "../formatHandleMarker";

export type ObjectDescriptorsMap<T, RootT> = {
  [K in keyof T]?:
    | ObjectDescriptor<Exclude<T[K], undefined>, RootT>
    | ((
        node: ObjectNode<T, RootT>,
      ) => ObjectDescriptor<Exclude<T[K], undefined>, RootT>);
};

/** A plain object, printed and diffed key by key. */
export const getPlainObjectDescriptor = <
  T extends Record<string, unknown>,
  RootT,
>({
  childMap,
  allowOtherKeys = true,
  ignoredKeys,
}: {
  childMap?: ObjectDescriptorsMap<T, RootT>;
  allowOtherKeys?: boolean;
  ignoredKeys?: (keyof T)[] | ((value: T) => (keyof T)[]);
} = {}): ObjectDescriptor<T, RootT> => {
  const getKeys = (value: T) => {
    const ignoredKeysCalc =
      typeof ignoredKeys === "function" ? ignoredKeys(value) : ignoredKeys;

    return Object.keys(allowOtherKeys ? value : (childMap ?? value)).filter(
      (key) => !ignoredKeysCalc?.includes(key),
    );
  };

  return {
    child(node, segment) {
      const keys = getKeys(node.value);

      if (!keys.includes(segment)) {
        throw new NoSuchHandleError(
          node.handle,
          keys.join(", ") || "(no children)",
        );
      }

      const descriptor = childMap?.[segment];
      return node._child(
        segment,
        (typeof descriptor === "function" ? descriptor(node) : descriptor) as
          | ObjectDescriptor<T[typeof segment], RootT>
          | undefined,
      );
    },

    format(node, opts) {
      const parts = getKeys(node.value)
        .filter((key) => node.value[key] !== undefined)
        .map(
          (key) =>
            `${key}: ${node.child(key).format({ ...opts, skipHandle: opts.skipHandle || opts.collapse })}`,
        );
      const partsStr = parts.join(", ");

      if (opts.collapse) {
        // Short form: the object's own inline text, truncated - not a bare key count, since the
        // leading fields are usually enough to recognize what this is (`{ position: { x: 4.5, ... }`).
        const truncated = truncate(partsStr, 80);
        // Only a truncated object withheld anything; one that fit is whole and needs no pointer.
        return truncated === partsStr
          ? `{ ${partsStr} }`
          : `{ ${truncated} }${formatHandleMarker(node, opts)}`;
      }

      return partsStr.includes("\n") || partsStr.length > 200
        ? `{\n${indent(parts.join("\n"))}\n}`
        : `{ ${partsStr} }`;
    },

    diff(from, to) {
      const keys = [...new Set([...getKeys(from.value), ...getKeys(to.value)])];
      const lines = keys.flatMap((key) =>
        diffChild(key, from.child(key), to.child(key)),
      );
      return `{\n${lines.join("\n")}\n}`;
    },
  };
};

/** Diffs one child of a composite node. */
const diffChild = <T, RootT>(
  key: string,
  fromNode: ObjectNode<T, RootT>,
  toNode: ObjectNode<T, RootT>,
): string[] => {
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
