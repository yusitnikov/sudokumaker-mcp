import { ObjectNode } from "../ObjectNode";
import { unknownDescriptor } from "./unknownDescriptor";

export const leafNode = <RootT>(
  value: unknown,
  handle: string,
  root: RootT,
): ObjectNode<unknown, RootT> =>
  new ObjectNode(value, handle, root, unknownDescriptor);
