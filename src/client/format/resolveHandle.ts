import type { ObjectNode } from "./ObjectNode";

/**
 * Folds `path`'s dot-separated segments through `descriptor.child`, starting at `node`. Does
 * nothing about failure: a segment that doesn't resolve throws `NoSuchHandleError` straight out of
 * the `child` that rejected it - the node that owns the vocabulary is the one that raises the
 * error, so there is no second member here for the error text.
 *
 * Takes no `root`: resolving a handle neither collapses nor draws separators, so nothing here needs
 * anything outside the node it is currently standing on.
 */
export const resolveHandle = <RootT>(
  node: ObjectNode<any, RootT>,
  path: string,
): ObjectNode<any, RootT> => {
  if (!path) {
    return node;
  }

  let current = node;
  for (const segment of path.split(".")) {
    current = current.child(segment);
  }
  return current;
};
