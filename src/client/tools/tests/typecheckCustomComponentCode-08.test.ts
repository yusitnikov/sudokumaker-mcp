import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "../typecheckCustomComponentCode";
import { backendResources } from "../../../backendResourcesImpl";

const checker = new CustomComponentCodeTypescript(backendResources, {});

describe("getConstructorArgs", () => {
  test("returns only cell IDs when no hook is defined", () => {
    expect(checker.getConstructorArgs("")).toBe("name: string, cellIds: CellId[]");
  });

  test("returns only cell IDs on broken code", () => {
    expect(checker.getConstructorArgs("}&(^%*&(")).toBe("name: string, cellIds: CellId[]");
  });

  test("combines cell IDs with other args when only setParams is defined", () => {
    expect(checker.getConstructorArgs("function setParams(instance, cells, options = {}) {}")).toBe(
      "name: string, cellIds: CellId[], options: any",
    );
  });

  test("deduplicates argument names", () => {
    expect(checker.getConstructorArgs("function setParams(instance, cells, name, normal, cellIds) {}")).toBe(
      "name: string, cellIds: CellId[], __arg2: any, normal: any, __arg4: any",
    );
  });

  test("creates an argument name for deconstruction", () => {
    expect(checker.getConstructorArgs("function setParams(instance, cells, { opt1, opt2 } = {}) {}")).toBe(
      "name: string, cellIds: CellId[], __arg2: any",
    );
  });

  test("takes argument name from one of the hooks", () => {
    expect(
      checker.getConstructorArgs(`
        function getAffectedCells(onlyFirst, {}, firstHookWins) { return []; }
        function setParams(instance, {}, onlySecond, secondHookWins, onlyHere) {}
      `),
    ).toBe("name: string, onlyFirst: any, onlySecond: any, secondHookWins: any, onlyHere: any");
  });

  test("ignores declared type for cell IDs", () => {
    expect(
      checker.getConstructorArgs(`
        /**
         * @param {string[]} cells
         */
        function setParams(instance, cells) {}
      `),
    ).toBe("name: string, cellIds: CellId[]");
  });

  test("respects declared type on regular args", () => {
    expect(
      checker.getConstructorArgs(`
        /**
         * @param {string[]} cells
         * @param {boolean} flag
         */
        function getAffectedCells(cells, flag) { return []; }
      `),
    ).toBe("name: string, cells: string[], flag: boolean");
  });

  test("combines declared types of both hooks", () => {
    expect(
      checker.getConstructorArgs(`
        /**
         * @param {{ field1: string }} arg1
         * @param arg2
         * @param {number} arg3
         */
        function getAffectedCells(arg1, arg2, arg3) { return []; }

        /**
         * @param instance
         * @param {{
         *   field2: number
         * }} arg1
         * @param {string} arg2
         * @param {number} arg3
         * @param {boolean} arg4
         */
        function setParams(instance, arg1, arg2, arg3, arg4, arg5) {}
      `),
    ).toBe(
      "name: string, arg1: ({ field1: string }) & ({ field2: number }), arg2: string, arg3: number, arg4: boolean, arg5: any",
    );
  });
});
