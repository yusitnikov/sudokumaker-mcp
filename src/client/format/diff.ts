import { stringifyValue } from "./generic/stringifyValue";

/** One array item, with everything the diff knows about it. */
interface ArrayItemInternal<T> {
  value: T;
  /**
   * What identifies the item: its key where the caller gives one, its contents otherwise.
   * Two items are the same item when these match.
   */
  id: string;
  contentsStr: string;
  /** The item's position in its own array. */
  index: number;
}
export type ArrayItem<T> = Pick<ArrayItemInternal<T>, "value" | "index">;
const toPublicItem = <T>({
  value,
  index,
}: ArrayItemInternal<T>): ArrayItem<T> => ({ value, index });

const getType = (value: unknown) => {
  return value === null
    ? "null"
    : Array.isArray(value)
      ? "array"
      : typeof value;
};

type DiffOperationByItemT<ItemT> =
  | {
      type: "unchanged";
      /** A consecutive run of items as they are now - grouped so a long untouched stretch is one op. */
      items: ItemT[];
    }
  | {
      type: "added";
      item: ItemT;
      /** Where this item came from, when it didn't appear but moved here. */
      movedFrom?: ItemT;
    }
  | {
      type: "removed";
      item: ItemT;
      /** Where this item went, when it didn't disappear but moved away. */
      movedTo?: ItemT;
    }
  | { type: "edited"; from: ItemT; to: ItemT };

type DiffOperationInternal<T> = DiffOperationByItemT<ArrayItemInternal<T>>;
export type DiffOperation<T> = DiffOperationByItemT<ArrayItem<T>>;
/**
 * Drops the diff's own bookkeeping, leaving each item as the caller's value and its position.
 * The fields are copied out rather than passed through, so the identity strings don't ride along
 * as extra properties on a structurally compatible object.
 */
const toPublicDiffOperation = <T>(
  op: DiffOperationInternal<T>,
): DiffOperation<T> => {
  switch (op.type) {
    case "edited":
      return {
        type: op.type,
        from: toPublicItem(op.from),
        to: toPublicItem(op.to),
      };
    case "added":
      return {
        type: op.type,
        item: toPublicItem(op.item),
        movedFrom: op.movedFrom && toPublicItem(op.movedFrom),
      };
    case "removed":
      return {
        type: op.type,
        item: toPublicItem(op.item),
        movedTo: op.movedTo && toPublicItem(op.movedTo),
      };
    case "unchanged":
      return { type: op.type, items: op.items.map(toPublicItem) };
  }
};

/**
 * Diffs an old array against a new one, item by item.
 *
 * An item is identified by `key` where one is given, and by its own content otherwise -
 * `allElements` keys elements by id, so deleting one doesn't report every later one as changed.
 * Position is not part of an item's identity, so one that only changed position is reported
 * as a move: a removal and an addition naming each other's index.
 */
export const getArrayDiff = <T>(
  fromArray: T[],
  toArray: T[],
  key?: (item: T) => string,
): DiffOperation<T>[] => {
  const [from, to] = [fromArray, toArray].map((array) =>
    array.map((value, index): ArrayItemInternal<T> => {
      const contentsStr = stringifyValue(value);
      return { value, id: key?.(value) ?? contentsStr, contentsStr, index };
    }),
  );

  const moved = findMovedIdentities(from, to);

  /**
   * Whether one item may be reported as the other having changed,
   * rather than as a removal and an addition.
   *
   * Keyed, that takes a shared key.
   * Unkeyed, it takes both items being absent from the other side,
   * since an item present on both has moved instead.
   *
   * "Edited" only makes sense when both sides are arrays or both are plain objects -
   * something with an interior for the edit to point at.
   * A primitive, or a value whose shape doesn't match the other side's,
   * is always a removal and an addition (this is why line diffs never edit).
   */
  const canEdit = (
    fromItem: ArrayItemInternal<T>,
    toItem: ArrayItemInternal<T>,
  ): boolean =>
    getType(fromItem.value) === getType(toItem.value) &&
    ["array", "object"].includes(getType(fromItem.value)) &&
    (key
      ? fromItem.id === toItem.id
      : !moved.has(fromItem.id) && !moved.has(toItem.id));

  const n = from.length;
  const m = to.length;

  // Levenshtein over the identities: the cheapest script of removals, additions and edits turning
  // one array into the other.
  const cost: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    cost[i][m] = n - i;
  }
  for (let j = m - 1; j >= 0; j--) {
    cost[n][j] = m - j;
  }
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (from[i].id === to[j].id) {
        cost[i][j] = cost[i + 1][j + 1];
        continue;
      }
      const withoutEdit = 1 + Math.min(cost[i + 1][j], cost[i][j + 1]);
      cost[i][j] = canEdit(from[i], to[j])
        ? Math.min(withoutEdit, 1 + cost[i + 1][j + 1])
        : withoutEdit;
    }
  }

  // Walk the table along the cheapest script, emitting one op per step.
  const ops: DiffOperationInternal<T>[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (from[i].id === to[j].id) {
      // The same item in both arrays - but a key identifies it without its content,
      // so that content may still have changed.
      if (from[i].contentsStr !== to[j].contentsStr) {
        ops.push({ type: "edited", from: from[i], to: to[j] });
      } else {
        // Multiple "unchanged" items are grouped together
        let lastOp = ops[ops.length - 1];
        if (lastOp?.type !== "unchanged") {
          lastOp = { type: "unchanged", items: [] };
          ops.push(lastOp);
        }
        lastOp.items.push(to[j]);
      }
      i++;
      j++;
    } else if (
      canEdit(from[i], to[j]) &&
      cost[i][j] === 1 + cost[i + 1][j + 1]
    ) {
      ops.push({ type: "edited", from: from[i], to: to[j] });
      i++;
      j++;
    } else if (cost[i][j] === 1 + cost[i + 1][j]) {
      ops.push({ type: "removed", item: from[i] });
      i++;
    } else {
      ops.push({ type: "added", item: to[j] });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "removed", item: from[i] });
    i++;
  }
  while (j < m) {
    ops.push({ type: "added", item: to[j] });
    j++;
  }

  return markMoves(ops, moved).map(toPublicDiffOperation);
};

/**
 * The identities present exactly once on each side, so the item can only have moved.
 * An identity occurring twice is left out: either half could pair with either counterpart.
 */
const findMovedIdentities = <T>(
  from: ArrayItemInternal<T>[],
  to: ArrayItemInternal<T>[],
): Set<string> => {
  const [fromCounts, toCounts] = [from, to].map((items) => {
    const counts = new Map<string, number>();
    for (const { id } of items) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  });

  const moved = new Set<string>();
  for (const [id, fromCount] of fromCounts) {
    if (fromCount === 1 && toCounts.get(id) === 1) {
      moved.add(id);
    }
  }

  return moved;
};

/** Gives each half of a move the other half's index. */
const markMoves = <T>(
  ops: DiffOperationInternal<T>[],
  moved: Set<string>,
): DiffOperationInternal<T>[] => {
  /** Each half's counterpart in the other array, by the identity they share. */
  const movedFromById = new Map<string, ArrayItemInternal<T>>();
  const movedToById = new Map<string, ArrayItemInternal<T>>();

  for (const op of ops) {
    if (op.type === "removed" && moved.has(op.item.id)) {
      movedFromById.set(op.item.id, op.item);
    } else if (op.type === "added" && moved.has(op.item.id)) {
      movedToById.set(op.item.id, op.item);
    }
  }

  return ops.map((op) => {
    if (op.type === "removed") {
      const movedTo = movedToById.get(op.item.id);
      return movedTo === undefined ? op : { ...op, movedTo };
    }
    if (op.type === "added") {
      const movedFrom = movedFromById.get(op.item.id);
      return movedFrom === undefined ? op : { ...op, movedFrom };
    }
    return op;
  });
};
