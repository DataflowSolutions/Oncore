import { buildChunksForSection, splitTextIntoWordBatches } from "./chunking";

const loremWords = (count: number) => Array.from({ length: count }, (_, i) => `word${i + 1}`).join(" ");

describe("splitTextIntoWordBatches", () => {
  it("splits into ~max word batches without exceeding max", () => {
    const text = loremWords(1700);
    const batches = splitTextIntoWordBatches(text, 800, 300);

    expect(batches.length).toBe(3);
    batches.forEach((batch) => {
      const words = batch.split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(800);
    });
  });

  it("rebalance/merges small tail chunk when under minWords", () => {
    const text = loremWords(900); // 800 + 100 -> rebalance to 600 + 300
    const batches = splitTextIntoWordBatches(text, 800, 300);

    expect(batches.length).toBe(2);
    const counts = batches.map((b) => b.split(/\s+/).filter(Boolean).length);
    expect(counts[0]).toBeLessThanOrEqual(800);
    expect(counts[1]).toBeGreaterThanOrEqual(300);
  });

  it("returns empty array for empty/short text", () => {
    expect(splitTextIntoWordBatches("", 800, 300)).toEqual([]);
    expect(splitTextIntoWordBatches("short text", 800, 300)).toEqual(["short text"]);
  });
});

describe("buildChunksForSection", () => {
  it("preserves source order and chunk indices", () => {
    const sources = [
      { id: "a", fileName: "a", rawText: loremWords(10) },
      { id: "b", fileName: "b", rawText: loremWords(5) },
    ];

    const chunks = buildChunksForSection("general", sources, 5, 2);

    expect(chunks.map((c) => `${c.sourceId}-${c.chunkIndex}`)).toEqual(["a-0", "a-1", "b-0"]);
    chunks.forEach((chunk) => {
      const words = chunk.text.split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(5);
    });
  });
});
