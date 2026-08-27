import { ObjectNode } from "../ObjectNode";
import { getUnknownDescriptor } from "./unknownDescriptor";

export const leafNode = <T, RootT>(
  value: T,
  handle: string,
  root: RootT,
): ObjectNode<T, RootT> =>
  new ObjectNode(value, handle, root, getUnknownDescriptor());
