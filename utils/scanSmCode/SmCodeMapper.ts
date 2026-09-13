import { GenericSmCodeScanner } from "./SmCodeScanner";
import type {
  ConvertReferencable,
  ConvertValue,
  IndexArray,
  IndexClass,
  IndexFunction,
  IndexMagicProperty,
  IndexMap,
  IndexObject,
  IndexPropertiesMap,
  IndexReferencable,
  IndexReference,
  IndexScalar,
  IndexSet,
  IndexValue,
  ObjectsIndex,
} from "./types";

export abstract class SmCodeMapper<TargetIsValue extends boolean> extends GenericSmCodeScanner<false> {
  protected mapRecord<From, To>(record: Record<string, From>, mapper: (value: From) => To): Record<string, To> {
    return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, mapper(value)]));
  }

  protected mapReference<T extends IndexReferencable<false>>(
    value: IndexReference<false, T>,
  ): IndexReference<TargetIsValue, ConvertReferencable<false, TargetIsValue, T>> {
    return value;
  }

  protected mapReferencable<T extends IndexReferencable<false>>(
    value: T,
  ): ConvertReferencable<false, TargetIsValue, T> {
    type ResultT = ConvertReferencable<false, TargetIsValue, T>;

    switch (value.type) {
      case "object":
        return {
          ...value,
          ownProperties: this.mapOwnProperties(value.ownProperties),
          class: value.class && this.mapValue(value.class),
        } satisfies IndexObject<TargetIsValue> as ResultT;
      case "class":
        return {
          ...value,
          ownProperties: this.mapOwnProperties(value.ownProperties),
          static: this.mapOwnProperties(value.static),
          extends: value.extends && this.mapValue(value.extends),
        } satisfies IndexClass<TargetIsValue> as ResultT;
      case "numericEnum":
      case "internal":
        return value as ResultT;
    }
  }

  protected mapValue<T extends IndexValue<false>>(value: T): ConvertValue<false, TargetIsValue, T> {
    type ResultT = ConvertValue<false, TargetIsValue, T>;

    switch (value.type) {
      case "reference":
        return this.mapReference(value) as ResultT;
      case "array":
      case "set":
        return {
          ...value,
          item: value.item && this.mapValue(value.item),
        } satisfies IndexArray<TargetIsValue> | IndexSet<TargetIsValue> as ResultT;
      case "map":
        return {
          ...value,
          entry: value.entry && [this.mapValue(value.entry[0]), this.mapValue(value.entry[1])],
        } satisfies IndexMap<TargetIsValue> as ResultT;
    }

    return value satisfies IndexScalar | IndexFunction as ResultT;
  }

  protected mapValueOrMagic(
    value: IndexValue<false> | IndexMagicProperty<false>,
  ): IndexValue<TargetIsValue> | IndexMagicProperty<TargetIsValue> {
    if (value.type === "magic") {
      return {
        ...value,
        value: value.value && this.mapValue(value.value),
      };
    }

    return this.mapValue(value);
  }

  protected mapOwnProperties(
    value: IndexPropertiesMap<false> | undefined,
  ): IndexPropertiesMap<TargetIsValue> | undefined {
    return value && this.mapRecord(value, (item) => this.mapValueOrMagic(item));
  }

  protected mapIndexedReference(
    _id: string,
    object: IndexReferencable<false>,
  ): IndexReferencable<TargetIsValue> | undefined {
    return this.mapReferencable(object);
  }

  process() {
    const mappedObjectsIndex: ObjectsIndex<TargetIsValue> = {};
    for (const [id, object] of Object.entries(this.objectsIndex)) {
      const mappedObject = this.mapIndexedReference(id, object);
      if (mappedObject) {
        mappedObjectsIndex[id] = mappedObject;
      }
    }
    return mappedObjectsIndex;
  }
}
