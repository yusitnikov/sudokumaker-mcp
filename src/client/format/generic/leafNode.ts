import { ObjectNode } from "../ObjectNode";
import { getUnknownDescriptor } from "./unknownDescriptor";

export const leafNode = <T, RootT>(
  value: T,
  setValue: (value: T) => void,
  handle: string,
  root: RootT,
): ObjectNode<T, RootT> => new ObjectNode(value, setValue, handle, root, getUnknownDescriptor());
