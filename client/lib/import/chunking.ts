import { ImportSection } from "@/components/import/types";

export interface TextChunk {
  sourceId: string;
  chunkIndex: number;
  text: string;
}

export interface ImportSource {
  id: string;
  fileName: string;
  mimeType?: string;
  rawText: string;
  pageCount?: number;
  isLowText?: boolean;
  wordCount?: number;
}

/**
 * Split text into deterministic word batches without external tokenizers.
 */
export function splitTextIntoWordBatches(text: string, maxWords: number, minWords = 0): string[] {
  if (maxWords <= 0) return [];

  const normalized = text?.trim();
  if (!normalized) return [];

  const words = normalized.split(/\s+/).filter(Boolean);
  const batches: string[] = [];

  for (let i = 0; i < words.length; i += maxWords) {
    const batchWords = words.slice(i, i + maxWords);
    batches.push(batchWords.join(" "));
  }

  if (batches.length > 1 && minWords > 0) {
    const last = batches[batches.length - 1];
    const prev = batches[batches.length - 2];
    const lastWords = last.split(/\s+/).filter(Boolean);
    const prevWords = prev.split(/\s+/).filter(Boolean);
    const lastCount = lastWords.length;
    const prevCount = prevWords.length;

    if (lastCount > 0 && lastCount < minWords) {
      const transferable = Math.min(
        minWords - lastCount,
        prevWords.length,
        Math.max(0, maxWords - lastCount)
      );

      if (transferable > 0) {
        const moved = prevWords.splice(prevWords.length - transferable, transferable);
        const updatedLast = [...moved, ...lastWords];
        batches[batches.length - 2] = prevWords.join(" ");
        batches[batches.length - 1] = updatedLast.join(" ");
      } else if (prevCount + lastCount <= maxWords) {
        batches[batches.length - 2] = [prev, last].filter(Boolean).join(" ").trim();
        batches.pop();
      }
    }
  }

  return batches;
}

/**
 * Build per-section chunks for the orchestrator.
 * Currently splits full raw text per source; future iterations can add heuristics per section.
 */
export function buildChunksForSection(
  section: ImportSection,
  sources: ImportSource[],
  maxWordsPerChunk: number,
  minWordsPerChunk = 300
): TextChunk[] {
  void section;
  const chunks: TextChunk[] = [];

  sources.forEach((source) => {
    const batches = splitTextIntoWordBatches(source.rawText, maxWordsPerChunk, minWordsPerChunk);
    batches.forEach((text, idx) => {
      chunks.push({
        sourceId: source.id,
        chunkIndex: idx,
        text,
      });
    });

    // Ensure empty documents still produce at least one chunk for tracing/debugging
    if (batches.length === 0) {
      chunks.push({
        sourceId: source.id,
        chunkIndex: 0,
        text: "",
      });
    }
  });

  return chunks;
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
