import { z } from "zod";
import { ElementType } from "./ElementType";
import type { ElementConfigByType } from "./types";
import { SudokuMakerElement } from "./SudokuMakerElement";
import { DifferenceElement, RatioElement, XVElement } from "./edgeElements";
import { NumberedRoomsElement, SandwichSumsElement, SkyscrapersElement, XSumsElement } from "./outerClueElements";
import {
  ColumnIndexerElement,
  EvenElement,
  FogLightsElement,
  MaximumElement,
  MinimumElement,
  OddElement,
  RowIndexerElement,
} from "./singleCellElements";
import { CosmeticCageElement, KillerCagesElement, LookAndSayCagesElement } from "./cageElements";
import {
  AntikingElement,
  AntiknightElement,
  DiagonalMinusElement,
  DiagonalPlusElement,
  DisjointGroupsElement,
  GivensElement,
  NonconsecutiveElement,
  RegionsElement,
  SudokuRulesElement,
} from "./singleClueElements";
import {
  BetweenLinesElement,
  DoubleArrowElement,
  EntropyLinesElement,
  LockoutLinesElement,
  PalindromeElement,
  RegionSumLineElement,
  RenbanElement,
  SequenceElement,
  ThermometerElement,
  WhisperElement,
} from "./lineElements";
import {
  ArrowElement,
  CloneElement,
  DifferentValuesElement,
  FogTriggersElement,
  GlobalEntropyElement,
  LittleKillersElement,
  QuadrupleElement,
} from "./miscElements";
import { CosmeticLineElement, CosmeticSymbolElement } from "./cosmeticElements";
import { CustomElement } from "./CustomElement";

export const AllElementsMap = {
  [ElementType.SudokuRules]: SudokuRulesElement,
  [ElementType.Givens]: GivensElement,
  [ElementType.Regions]: RegionsElement,
  [ElementType.DiagonalMinus]: DiagonalMinusElement,
  [ElementType.DiagonalPlus]: DiagonalPlusElement,
  [ElementType.Antiking]: AntikingElement,
  [ElementType.Antiknight]: AntiknightElement,
  [ElementType.DisjointGroups]: DisjointGroupsElement,
  [ElementType.Nonconsecutive]: NonconsecutiveElement,
  [ElementType.Even]: EvenElement,
  [ElementType.Odd]: OddElement,
  [ElementType.Maximum]: MaximumElement,
  [ElementType.Minimum]: MinimumElement,
  [ElementType.Difference]: DifferenceElement,
  [ElementType.Ratio]: RatioElement,
  [ElementType.XV]: XVElement,
  [ElementType.KillerCages]: KillerCagesElement,
  [ElementType.Clone]: CloneElement,
  [ElementType.Quadruple]: QuadrupleElement,
  [ElementType.LookAndSayCages]: LookAndSayCagesElement,
  [ElementType.DifferentValues]: DifferentValuesElement,
  [ElementType.Renban]: RenbanElement,
  [ElementType.Palindrome]: PalindromeElement,
  [ElementType.BetweenLines]: BetweenLinesElement,
  [ElementType.RegionSumLine]: RegionSumLineElement,
  [ElementType.Sequence]: SequenceElement,
  [ElementType.LockoutLines]: LockoutLinesElement,
  [ElementType.Arrow]: ArrowElement,
  [ElementType.DoubleArrow]: DoubleArrowElement,
  [ElementType.LittleKillers]: LittleKillersElement,
  [ElementType.SandwichSums]: SandwichSumsElement,
  [ElementType.XSums]: XSumsElement,
  [ElementType.Skyscrapers]: SkyscrapersElement,
  [ElementType.NumberedRooms]: NumberedRoomsElement,
  [ElementType.RowIndexer]: RowIndexerElement,
  [ElementType.ColumnIndexer]: ColumnIndexerElement,
  [ElementType.Custom]: CustomElement,
  [ElementType.CosmeticLine]: CosmeticLineElement,
  [ElementType.CosmeticCage]: CosmeticCageElement,
  [ElementType.CosmeticSymbol]: CosmeticSymbolElement,
  [ElementType.FogLights]: FogLightsElement,
  [ElementType.FogTriggers]: FogTriggersElement,
  [ElementType.GlobalEntropy]: GlobalEntropyElement,
  [ElementType.Thermometer]: ThermometerElement,
  [ElementType.Whisper]: WhisperElement,
  [ElementType.EntropyLines]: EntropyLinesElement,
};

export const AllElements = Object.values(AllElementsMap);

export const getElementByTypeName = (typeName: string) => AllElements.find((element) => element.typeName === typeName)!;

export const getElementByConfig = <TypeT extends ElementType>(config: ElementConfigByType<TypeT>) =>
  getElementByTypeName(config.type) as unknown as SudokuMakerElement<
    TypeT,
    z.ZodType<unknown, ElementConfigByType<TypeT>>,
    any,
    any,
    any
  >;
