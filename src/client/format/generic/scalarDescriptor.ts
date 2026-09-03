import type { ObjectDescriptor } from "../ObjectDescriptor";
import { NoSuchHandleError } from "../NoSuchHandleError";
import { stringifyValue } from "./stringifyValue";

/** A non-string leaf - number, boolean, null, undefined. No children, no collapse. */
export const getScalarDescriptor = <T, RootT>(): ObjectDescriptor<T, RootT> => ({
  child(node) {
    throw new NoSuchHandleError(node.handle, "(no children - this is a leaf value)");
  },
  format(node) {
    return stringifyValue(node.value);
  },
  diff(from, to) {
    return `${stringifyValue(from.value)} → ${stringifyValue(to.value)}`;
  },
});
