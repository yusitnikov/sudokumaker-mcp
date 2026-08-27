import type { ObjectDescriptor } from "../ObjectDescriptor";
import { stringDescriptor } from "./stringDescriptor";
import { getScalarDescriptor } from "./scalarDescriptor";
import { getArrayDescriptor } from "./arrayDescriptor";
import { getPlainObjectDescriptor } from "./plainObjectDescriptor";

/** Picks the right generic descriptor for a value's runtime shape. */
const descriptorFor = (value: unknown): ObjectDescriptor<any, any> => {
  if (typeof value === "string") {
    return stringDescriptor;
  }
  if (Array.isArray(value)) {
    return arrayDescriptor;
  }
  if (value !== null && typeof value === "object") {
    return plainObjectDescriptor;
  }
  return scalarDescriptor;
};

/**
 * Generic fallback descriptor for a value of unknown shape: dispatches to `string`/`scalar`/
 * `array`/`plainObject` by runtime type.
 */
export const getUnknownDescriptor = <T, RootT>(): ObjectDescriptor<
  T,
  RootT
> => ({
  child(node, segment) {
    return descriptorFor(node.value).child(node, segment);
  },
  format(node, ...args) {
    return descriptorFor(node.value).format(node, ...args);
  },
  diff(from, to) {
    const fromDescriptor = descriptorFor(from.value);
    const toDescriptor = descriptorFor(to.value);
    // A shape's own diff (e.g. arrayDescriptor.diff) assumes both sides are that shape - a field
    // that changed shape entirely (string -> object) isn't a case any single shape's diff can
    // handle, so it prints as a plain replacement instead of force-feeding a mismatched value in.
    if (fromDescriptor !== toDescriptor) {
      return `${JSON.stringify(from.value)} → ${JSON.stringify(to.value)}`;
    }
    return toDescriptor.diff(from, to);
  },
});

/*
 * Instantiate specific descriptor objects within the file to avoid circular imports.
 * `getUnknownDescriptor()::diff()` needs them to be constant reference.
 */
const arrayDescriptor = getArrayDescriptor({
  itemDescriptor: getUnknownDescriptor(),
});
const plainObjectDescriptor = getPlainObjectDescriptor();
const scalarDescriptor = getScalarDescriptor<unknown, any>();
