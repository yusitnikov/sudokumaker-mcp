import { Spec } from "../SudokuMakerSchemas";
import { z } from "zod";
import { ElementType } from "./ElementType";
import type { ClueDescriptor } from "./ClueDescriptor";

type PublicConfigT<
  TypeT extends ElementType,
  ConfigSchemaT extends z.ZodType,
  ClueKeyT extends string | never,
  ClueConfigSchemaT extends z.ZodType | never,
> = z.input<ConfigSchemaT> & {
  type: (typeof ElementType)[TypeT];
} &
  // Multi-clue types add their clues array; types without a clue descriptor add nothing.
  // The tuple brackets keep the conditional non-distributive: a bare `ClueKeyT extends ...`
  // would evaluate per union member, and `never` (no members) would yield `never`,
  // annihilating the whole intersection.
  ([ClueKeyT] extends [never]
    ? {}
    : [ClueConfigSchemaT] extends [never]
      ? {}
      : { [K in ClueKeyT]: z.input<ClueConfigSchemaT>[] });
type InternalConfigT<
  TypeT extends ElementType,
  ConfigSchemaT extends z.ZodType,
  ClueKeyT extends string | never,
  ClueConfigSchemaT extends z.ZodType | never,
> = z.output<ConfigSchemaT> & { type: TypeT } &
  // Clues array as in `PublicConfigT`, on the decoded side.
  ([ClueKeyT] extends [never]
    ? {}
    : [ClueConfigSchemaT] extends [never]
      ? {}
      : { [K in ClueKeyT]: z.output<ClueConfigSchemaT>[] });

export class SudokuMakerElement<
  TypeT extends ElementType,
  ConfigSchemaT extends z.ZodType,
  ParamsSchemaT extends z.ZodObject,
  ClueKeyT extends string | never = never,
  ClueConfigSchemaT extends z.ZodType | never = never,
> {
  public readonly typeId: TypeT;
  public readonly typeName: (typeof ElementType)[TypeT];
  public readonly schema: z.ZodType<
    InternalConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
    PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>
  >;
  public readonly globalSchema?: ConfigSchemaT;
  public readonly clue?: ClueDescriptor<ClueKeyT, ClueConfigSchemaT>;
  public readonly main: SudokuMakerElementOption<
    PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
    ClueKeyT,
    ParamsSchemaT
  >;
  public readonly options: SecondarySudokuMakerElementOption<
    PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
    ClueKeyT
  >[];
  /** Extra sections appended to this type's generated `element:<TypeName>` docs topic. */
  public readonly extraDocs?: { header: string; contents: string }[];
  /** Given the target puzzle's spec, the reason adding this type is refused there - or undefined to allow it. */
  public readonly getRefuseAddReason?: SpecGetter<string | undefined>;

  constructor({
    type,
    schema,
    clue,
    main,
    options = [],
    getRefuseAddReason,
    extraDocs,
  }: {
    type: TypeT;
    schema?: ConfigSchemaT;
    clue?: ClueDescriptor<ClueKeyT, ClueConfigSchemaT>;
    main: SudokuMakerElementOption<
      PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
      ClueKeyT,
      ParamsSchemaT
    >;
    options?: SecondarySudokuMakerElementOption<
      PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
      ClueKeyT
    >[];
    extraDocs?: { header: string; contents: string }[];
    getRefuseAddReason?: SpecGetter<string | undefined>;
  }) {
    const cluesKey = clue?.key;
    const clueSchema = clue?.schema;

    this.typeId = type;
    this.typeName = ElementType[type];
    this.schema = z
      .intersection(
        schema ?? (z.object({}) as unknown as ConfigSchemaT),
        z.object({
          type: z.codec(z.literal(this.typeName), z.literal(type), {
            encode: () => this.typeName,
            decode: () => type,
          }),
          ...(cluesKey && clueSchema
            ? {
                [cluesKey]: z.array(clueSchema).describe("Array of element's clues"),
              }
            : {}),
        }),
      )
      .meta({
        description: `"${main.title}" element config. Element description: ${main.description}`,
      }) as any;
    this.globalSchema = schema;
    this.clue = clue;
    this.main = main;
    this.options = options;
    this.extraDocs = extraDocs;
    this.getRefuseAddReason = getRefuseAddReason;
  }

  getElementMetadata(
    config: PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
    spec: z.input<typeof Spec>,
  ) {
    let detectedOption: SudokuMakerElementOption<
      PublicConfigT<TypeT, ConfigSchemaT, ClueKeyT, ClueConfigSchemaT>,
      any
    > = this.main;

    for (const option of this.options) {
      if (option.detect(config, spec)) {
        detectedOption = option;
        break;
      }
    }

    return {
      title: detectedOption.getTitle?.(config, spec) ?? detectedOption.title,
      description: detectedOption.getDescription?.(spec) ?? detectedOption.description,
    };
  }
}

export interface SudokuMakerElementOption<
  ConfigT,
  ClueKeyT extends string | never,
  ParamsSchemaT extends z.ZodObject = z.ZodObject<{}>,
> {
  title: string;
  getTitle?: ConfigGetter<ConfigT, string>;
  description: string;
  getDescription?: SpecGetter<string>;
  paramsSchema?: ParamsSchemaT;
  defaultConfig?:
    | Omit<ConfigT, "type" | ClueKeyT>
    | SpecGetter<Omit<ConfigT, "type" | ClueKeyT>, [z.input<ParamsSchemaT>]>;
}

export interface SecondarySudokuMakerElementOption<
  ConfigT,
  ClueKeyT extends string | never,
  ParamsSchemaT extends z.ZodObject = z.ZodObject<{}>,
> extends SudokuMakerElementOption<ConfigT, ClueKeyT, ParamsSchemaT> {
  detect: ConfigGetter<ConfigT, boolean>;
}

export type SpecGetter<ResultT, ArgsT extends any[] = []> = (spec: z.input<typeof Spec>, ...args: ArgsT) => ResultT;

export type ConfigGetter<ConfigT, ResultT> = (config: ConfigT, spec: z.input<typeof Spec>) => ResultT;
