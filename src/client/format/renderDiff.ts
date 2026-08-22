export type AlignOp<T> =
  | { type: "unchanged"; value: T; fromIndex: number; toIndex: number }
  | { type: "moved"; value: T; fromIndex: number; toIndex: number }
  | { type: "added"; value: T; toIndex: number }
  | { type: "removed"; value: T; fromIndex: number }
  | { type: "edited"; from: T; to: T; fromIndex: number; toIndex: number };

/**
 * Aligns an old and a new array. Without a `key`, alignment is by deep-equality (LCS): identical
 * items pair wherever they sit, and only the leftovers inside a changed hunk fall back to
 * positional pairing (an edit). With a `key`, items pair by that key regardless of position (used
 * by `elementList`, so deleting one element doesn't shift-report every later one) - the leftovers
 * inside a changed hunk still fall back to positional pairing.
 */
export const alignArray = <T>(
  from: T[],
  to: T[],
  key?: (item: T) => string,
): AlignOp<T>[] => {
  const identity = (item: T) => key?.(item) ?? JSON.stringify(item);

  const fromKeys = from.map(identity);
  const toKeys = to.map(identity);

  // Standard LCS over the identity keys.
  const n = from.length;
  const m = to.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        fromKeys[i] === toKeys[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Walk the LCS table to emit a sequence of matched/unmatched runs, then turn unmatched runs
  // that fall on both sides into positional edits (paired remainder inside a changed hunk).
  type Step =
    | { type: "match"; fromIndex: number; toIndex: number }
    | { type: "fromOnly"; fromIndex: number }
    | { type: "toOnly"; toIndex: number };
  const steps: Step[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (fromKeys[i] === toKeys[j]) {
      steps.push({ type: "match", fromIndex: i, toIndex: j });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      steps.push({ type: "fromOnly", fromIndex: i });
      i++;
    } else {
      steps.push({ type: "toOnly", toIndex: j });
      j++;
    }
  }
  while (i < n) {
    steps.push({ type: "fromOnly", fromIndex: i });
    i++;
  }
  while (j < m) {
    steps.push({ type: "toOnly", toIndex: j });
    j++;
  }

  // Group consecutive fromOnly/toOnly runs and pair them positionally within the run (edits),
  // leaving any length difference as pure add/remove.
  const ops: AlignOp<T>[] = [];
  let pendingFrom: number[] = [];
  let pendingTo: number[] = [];
  const flushPending = () => {
    const pairCount = Math.min(pendingFrom.length, pendingTo.length);
    for (let k = 0; k < pairCount; k++) {
      const fromIndex = pendingFrom[k];
      const toIndex = pendingTo[k];
      if (key) {
        // Keyed alignment (elementList): a "moved" pairing here means this item's key wasn't
        // adjacent enough for the LCS to match it as unchanged content-wise, but it does still
        // exist on both sides - treat content-identical keyed items as moved, others as edited.
        ops.push(
          JSON.stringify(from[fromIndex]) === JSON.stringify(to[toIndex])
            ? { type: "moved", value: to[toIndex], fromIndex, toIndex }
            : {
                type: "edited",
                from: from[fromIndex],
                to: to[toIndex],
                fromIndex,
                toIndex,
              },
        );
      } else {
        ops.push({
          type: "edited",
          from: from[fromIndex],
          to: to[toIndex],
          fromIndex,
          toIndex,
        });
      }
    }
    for (let k = pairCount; k < pendingFrom.length; k++) {
      ops.push({
        type: "removed",
        value: from[pendingFrom[k]],
        fromIndex: pendingFrom[k],
      });
    }
    for (let k = pairCount; k < pendingTo.length; k++) {
      ops.push({
        type: "added",
        value: to[pendingTo[k]],
        toIndex: pendingTo[k],
      });
    }
    pendingFrom = [];
    pendingTo = [];
  };

  for (const step of steps) {
    if (step.type === "match") {
      flushPending();
      const fromItem = from[step.fromIndex];
      const toItem = to[step.toIndex];
      // With a `key`, a "match" only means the two items share a key - unlike the keyless case
      // (whose identity is the item's own deep-equal JSON, so a "match" already implies unchanged
      // content), a keyed match can still be the same element with an edited field, which must
      // still surface as a change rather than being reported as untouched.
      ops.push(
        !key || JSON.stringify(fromItem) === JSON.stringify(toItem)
          ? {
              type: "unchanged",
              value: toItem,
              fromIndex: step.fromIndex,
              toIndex: step.toIndex,
            }
          : {
              type: "edited",
              from: fromItem,
              to: toItem,
              fromIndex: step.fromIndex,
              toIndex: step.toIndex,
            },
      );
    } else if (step.type === "fromOnly") {
      pendingFrom.push(step.fromIndex);
    } else {
      pendingTo.push(step.toIndex);
    }
  }
  flushPending();

  return ops;
};
