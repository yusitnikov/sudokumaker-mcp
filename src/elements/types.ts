import { ElementType } from "./ElementType";
import type { ClueDescriptor } from "./ClueDescriptor";
import { z } from "zod";
import { ElementSchema } from "./schemas";
import { AllElements, AllElementsMap } from "./AllElements";

export type ElementPublic = z.input<typeof ElementSchema>;

export type ElementConfigByType<TypeT extends ElementType> = z.input<(typeof AllElementsMap)[TypeT]["schema"]>;

export type ElementByType<TypeT extends ElementType> = Omit<ElementPublic, "config"> & {
  config: ElementConfigByType<TypeT>;
};

type AnyElement = (typeof AllElements)[number];

type WithClue<T> = T extends { clue?: ClueDescriptor<infer K, infer _S> } ? ([K] extends [never] ? never : T) : never;

export type ElementWithClue = WithClue<AnyElement>;

export const isElementWithClue = (element: AnyElement): element is ElementWithClue => !!element.clue;
