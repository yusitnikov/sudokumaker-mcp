import { DigitSetSchema } from "../SudokuMakerSchemas";
import type { SpecGetter } from "./SudokuMakerElement";

export const describeDigitGroups = (groups: number[][]) =>
  groups.length ? groups.map((digits) => digits.join("")).join("/") : "???";

const getDigitGroups: SpecGetter<number[][], [number, (digit: number) => number]> = (
  { minDigit, maxDigit },
  count,
  getGroup,
) => {
  const groups = Array(count)
    .fill(undefined)
    .map(() => [] as number[]);

  for (let digit = minDigit; digit <= maxDigit; digit++) {
    groups[getGroup(digit)].push(digit);
  }

  return groups;
};

export const getEntropicGroups: SpecGetter<number[][]> = (spec) => {
  const { minDigit, digitCount } = spec;

  const limit1 = minDigit + Math.round(digitCount / 3) - 1;
  const limit2 = minDigit + Math.round((digitCount * 2) / 3) - 1;

  return getDigitGroups(spec, 3, (digit) => (digit <= limit1 ? 0 : digit <= limit2 ? 1 : 2));
};

export const getModuloGroups: SpecGetter<number[][], [number]> = (spec, count) => {
  return getDigitGroups(spec, count, (digit) => digit % count);
};

export const areSameDigitGroups = (group1List: number[][], group2List: number[][]): boolean => {
  if (group1List.length !== group2List.length) {
    return false;
  }

  const group1 = group1List.map((digits) => DigitSetSchema.decode(digits)).sort();
  const group2 = group2List.map((digits) => DigitSetSchema.decode(digits)).sort();
  return group1.every((value, index) => value === group2[index]);
};
