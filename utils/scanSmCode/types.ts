export interface IndexScalar {
  type: "scalar";
  value: unknown;
}

export interface IndexArray<IsValue extends boolean> {
  type: "array";
  item?: IndexValue<IsValue>;
}

export interface IndexSet<IsValue extends boolean> {
  type: "set";
  item?: IndexValue<IsValue>;
}

export interface IndexMap<IsValue extends boolean> {
  type: "map";
  entry?: [IndexValue<IsValue>, IndexValue<IsValue>];
}

export interface IndexMagicProperty<IsValue extends boolean> {
  type: "magic";
  get?: true;
  set?: true;
  value?: IndexValue<IsValue>;
}

export type IndexPropertiesMap<IsValue extends boolean> = Record<
  string,
  IndexValue<IsValue> | IndexMagicProperty<IsValue>
>;

export interface IndexBaseReference {
  reference: IndexReferenceById;
  references: string[];
}

export interface IndexObject<IsValue extends boolean> extends IndexBaseReference {
  type: "object";
  ownProperties?: IndexPropertiesMap<IsValue>;
  class?: IndexReference<IsValue, IndexClass<IsValue>> | IndexFunction;
}

export interface IndexClass<IsValue extends boolean> extends IndexBaseReference {
  type: "class";
  code?: string;
  ownProperties?: IndexPropertiesMap<IsValue>;
  extends?: IndexReference<IsValue, IndexClass<IsValue>> | IndexFunction;
  static?: IndexPropertiesMap<IsValue>;
}

/**
 * A function's parameter list, recovered by parsing its source.
 *
 * A parameter with a default makes every parameter after it optional too, so the counts describe
 * one list: `requiredArgs` come first, then `optionalArgs` more, then the rest parameter if there
 * is one.
 */
export interface IndexFunctionSignature {
  requiredArgs?: number;
  optionalArgs?: number;
  hasRestArg?: boolean;
  returnType?: string;
}

export interface IndexFunction extends IndexFunctionSignature {
  type: "function";
  code?: string;
  isGenerator?: boolean;
  isAsync?: boolean;
}

export interface IndexNumericEnum extends IndexBaseReference {
  type: "numericEnum";
  values: Record<string, number>;
}

export interface IndexInternal extends IndexBaseReference {
  type: "internal";
}

export type IndexReferencable<IsValue extends boolean> =
  | IndexObject<IsValue>
  | IndexClass<IsValue>
  | IndexNumericEnum
  | IndexInternal;

type IndexReferenceByValue<IsValue extends boolean, T extends IndexReferencable<IsValue>> = IsValue extends true
  ? T
  : never;

export interface IndexReferenceById {
  type: "reference";
  id: string;
}

export type IndexReference<IsValue extends boolean, T extends IndexReferencable<IsValue>> =
  | IndexReferenceByValue<IsValue, T>
  | IndexReferenceById;

export type IndexValue<IsValue extends boolean> =
  | IndexScalar
  | IndexArray<IsValue>
  | IndexSet<IsValue>
  | IndexMap<IsValue>
  | IndexFunction
  | IndexReference<IsValue, IndexReferencable<IsValue>>;

export type ConvertReferencable<From extends boolean, To extends boolean, T extends IndexReferencable<From>> = Extract<
  IndexValue<To>,
  { type: T["type"] }
>;

export type ConvertValue<
  From extends boolean,
  To extends boolean,
  T extends IndexValue<From>,
> = T["type"] extends "reference"
  ? T extends IndexReference<From, infer T2>
    ? IndexReference<To, ConvertReferencable<From, To, T2>>
    : Extract<IndexValue<To>, { type: T["type"] }>
  : Extract<IndexValue<To>, { type: T["type"] }>;

export type ObjectsIndex<IsValue extends boolean> = Record<string, IndexReferencable<IsValue>>;

export interface ArgumentDraftInfo {
  optional?: true;
  rest?: true;
}
export interface ArgumentProcessedInfo extends ArgumentDraftInfo {
  type: string;
}
export interface FunctionSignatureDraftInfo {
  processed: false;
  arguments: ArgumentDraftInfo[];
  returnType?: string;
}
export interface FunctionSignatureProcessedInfo {
  processed: true;
  arguments: ArgumentProcessedInfo[];
  returnType?: string;
}
export type FunctionSignatureInfo = FunctionSignatureDraftInfo | FunctionSignatureProcessedInfo;
