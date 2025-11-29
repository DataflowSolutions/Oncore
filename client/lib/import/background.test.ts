import { describe, expect, it } from "vitest";
import { shouldBackgroundImport, countWords } from "./background";
import type { RawSourceInput } from "./jobs";

const makeSource = (words: number): RawSourceInput => ({
  id: "id",
  fileName: "file",
  rawText: Array.from({ length: words }, (_, i) => `w${i}`).join(" "),
});

describe("countWords", () => {
  it("counts whitespace separated words", () => {
    expect(countWords("one two  three")).toBe(3);
  });
});

describe("shouldBackgroundImport", () => {
  it("keeps sync for small payloads", () => {
    const sources = [makeSource(1000), makeSource(500)];
    expect(shouldBackgroundImport(sources, false)).toBe(false);
  });

  it("backgrounds when sources exceed limit", () => {
    const sources = [makeSource(10), makeSource(10), makeSource(10)];
    expect(shouldBackgroundImport(sources, false)).toBe(true);
  });

  it("backgrounds when words exceed limit", () => {
    const sources = [makeSource(21000)];
    expect(shouldBackgroundImport(sources, false)).toBe(true);
  });

  it("backgrounds when forced", () => {
    const sources = [makeSource(10)];
    expect(shouldBackgroundImport(sources, true)).toBe(true);
  });
});
