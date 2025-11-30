import { RawSourceInput } from "./jobs";

const WORD_LIMIT = 2500;  // Lower threshold so more jobs queue to worker
const SOURCE_LIMIT = 2;

export function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function shouldBackgroundImport(
  sources: RawSourceInput[],
  forceBackground?: boolean
): boolean {
  if (forceBackground) return true;
  // Queue if there are many sources
  if (sources.length > SOURCE_LIMIT) return true;
  // Queue if any source is a non-text file (e.g., PDFs, images)
  if (sources.some((s) => !!s.mimeType && !String(s.mimeType).startsWith("text/"))) return true;
  const totalWords = sources.reduce((sum, source) => sum + countWords(source.rawText), 0);
  if (totalWords > WORD_LIMIT) return true;
  return false;
}
