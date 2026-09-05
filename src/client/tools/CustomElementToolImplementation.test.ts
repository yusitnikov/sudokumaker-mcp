import { describe, expect, test } from "vitest";
import { countWholeWordOccurrences, replaceWholeWord } from "./CustomElementToolImplementation";

describe("countWholeWordOccurrences", () => {
  test("counts every standalone occurrence", () => {
    expect(countWholeWordOccurrences("new Sum(a); new Sum(b);", "Sum")).toBe(2);
  });

  test("ignores a name that is part of a longer identifier", () => {
    expect(countWholeWordOccurrences("new SumOfPairs(a); new PartialSum(b); mySum;", "Sum")).toBe(0);
  });

  test("counts a standalone occurrence next to longer identifiers containing it", () => {
    expect(countWholeWordOccurrences("new SumOfPairs(a); new Sum(b);", "Sum")).toBe(1);
  });

  test("is zero when the name doesn't occur", () => {
    expect(countWholeWordOccurrences("new Product(a);", "Sum")).toBe(0);
  });

  test("treats regular expression syntax in the name literally", () => {
    expect(countWholeWordOccurrences("new A.B(x);", "A.B")).toBe(1);
    expect(countWholeWordOccurrences("new AxB(x);", "A.B")).toBe(0);
  });
});

describe("replaceWholeWord", () => {
  test("replaces every standalone occurrence", () => {
    expect(replaceWholeWord("new Sum(a); new Sum(b);", "Sum", "Total")).toBe("new Total(a); new Total(b);");
  });

  test("leaves longer identifiers containing the name untouched", () => {
    expect(replaceWholeWord("new SumOfPairs(a); new Sum(b);", "Sum", "Total")).toBe("new SumOfPairs(a); new Total(b);");
  });

  test("returns the code unchanged when the name doesn't occur", () => {
    const code = "new Product(a);";
    expect(replaceWholeWord(code, "Sum", "Total")).toBe(code);
  });
});
