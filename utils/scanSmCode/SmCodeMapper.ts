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
  IndexSet,
  IndexValue,
  ObjectsIndex,
} from "./types";

export interface SmCodeMapperParentInfo {
  parent: IndexObject<false> | IndexClass<false>;
  name: string;
}

export abstract class SmCodeMapper<TargetIsValue extends boolean> extends GenericSmCodeScanner<false> {
  protected mapRecord<From, To>(
    record: Record<string, From>,
    mapper: (value: From, key: string) => To,
  ): Record<string, To> {
    return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, mapper(value, key)]));
  }

  protected mapReference<T extends IndexReferencable<false>>(
    value: IndexReference<false, T>,
  ): IndexReference<TargetIsValue, ConvertReferencable<false, TargetIsValue, T>> {
    return value;
  }

  protected mapObject(value: IndexObject<false>): IndexObject<TargetIsValue> {
    return {
      ...value,
      ownProperties: this.mapOwnProperties(value.ownProperties, value),
      class: value.class && this.mapValue(value.class),
    };
  }

  protected mapClass(value: IndexClass<false>): IndexClass<TargetIsValue> {
    return {
      ...value,
      ownProperties: this.mapOwnProperties(value.ownProperties, value),
      static: this.mapOwnProperties(value.static, value),
      extends: value.extends && this.mapValue(value.extends),
    };
  }

  protected mapReferencable<T extends IndexReferencable<false>>(
    value: T,
  ): ConvertReferencable<false, TargetIsValue, T> {
    type ResultT = ConvertReferencable<false, TargetIsValue, T>;

    switch (value.type) {
      case "object":
        return this.mapObject(value) as ResultT;
      case "class":
        return this.mapClass(value) as ResultT;
      case "numericEnum":
      case "internal":
        return value as ResultT;
    }
  }

  protected mapFunction(value: IndexFunction, _parentInfo?: SmCodeMapperParentInfo): IndexFunction {
    return value;
  }

  protected mapValue<T extends IndexValue<false>>(
    value: T,
    parentInfo?: SmCodeMapperParentInfo,
  ): ConvertValue<false, TargetIsValue, T> {
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
      case "function":
        return this.mapFunction(value, parentInfo) as ResultT;
      case "scalar":
        return value as ResultT;
    }
  }

  protected mapValueOrMagic(
    value: IndexValue<false> | IndexMagicProperty<false>,
    parentInfo?: SmCodeMapperParentInfo,
  ): IndexValue<TargetIsValue> | IndexMagicProperty<TargetIsValue> {
    if (value.type === "magic") {
      return {
        ...value,
        value: value.value && this.mapValue(value.value, parentInfo),
      };
    }

    return this.mapValue(value, parentInfo);
  }

  protected mapOwnProperties(
    value: IndexPropertiesMap<false> | undefined,
    parent: IndexObject<false> | IndexClass<false>,
  ): IndexPropertiesMap<TargetIsValue> | undefined {
    return value && this.mapRecord(value, (item, name) => this.mapValueOrMagic(item, { parent, name }));
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
