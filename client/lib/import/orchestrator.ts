import {
  ImportData,
  ImportSection,
  createEmptyImportData,
  ImportedGeneral,
  ImportedDeal,
  ImportedTechnical,
} from "@/components/import/types";
import { ImportSource, buildChunksForSection } from "./chunking";
import { ConfidenceEntry, extractSectionFromChunk, getConfidenceScore } from "./ai";
import { logger } from "@/lib/logger";

export interface SectionExtractionResult {
  section: ImportSection;
  partialData: Partial<ImportData>;
  confidenceByField: Record<string, ConfidenceEntry>;
}

export interface FullExtractionResult {
  data: ImportData;
  confidenceByField: Record<string, ConfidenceEntry>;
}

export type ProgressCallback = (progress: {
  current_section: string;
  current_source?: string;
  current_chunk?: number;
  total_chunks?: number;
  sections_completed: number;
  total_sections: number;
}) => Promise<void> | void;

const SECTION_ORDER: ImportSection[] = [
  "general",
  "deal",
  "hotels",
  "flights",
  "food",
  "activities",
  "contacts",
  "technical",
  "documents",
];

/**
 * Categorize a document based on filename and MIME type.
 */
function categorizeDocumentType(fileName: string, mimeType?: string): "contract" | "rider" | "visa" | "boarding_pass" | "other" {
  const lower = fileName.toLowerCase();

  // Contract/agreement patterns
  if (lower.includes("contract") || lower.includes("agreement")) return "contract";
  
  // Rider patterns (tech, hospitality, etc.)
  if (lower.includes("rider")) return "rider";
  if (lower.includes("tech") && (lower.includes("spec") || lower.includes("requirement"))) return "rider";
  
  // Visa/travel documents
  if (lower.includes("visa") || lower.includes("passport")) return "visa";
  
  // Boarding pass / flight tickets
  if (lower.includes("boarding") || (lower.includes("flight") && lower.includes("ticket"))) return "boarding_pass";
  
  return "other";
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function mergeDefinedFieldsPreferExisting<T extends object>(
  base: T,
  incoming?: Partial<T>,
  allowOverride = false
): T {
  if (!incoming) return base;

  const next: any = { ...(base as any) };
  Object.entries(incoming).forEach(([key, value]) => {
    const current = (next as any)[key];
    if (!hasMeaningfulValue(current) && hasMeaningfulValue(value)) {
      (next as any)[key] = value as any;
    } else if (allowOverride && hasMeaningfulValue(value)) {
      (next as any)[key] = value as any;
    }
  });
  return next;
}

function mergeSectionPartialData(
  section: ImportSection,
  existing: Partial<ImportData>,
  incoming: Partial<ImportData>
): Partial<ImportData> {
  const next = { ...existing };

  switch (section) {
    case "general":
      next.general = mergeDefinedFieldsPreferExisting<Partial<ImportedGeneral>>(
        (existing.general as Partial<ImportedGeneral>) || {},
        incoming.general as Partial<ImportedGeneral>
      ) as ImportedGeneral;
      break;
    case "deal":
      next.deal = mergeDefinedFieldsPreferExisting<Partial<ImportedDeal>>(
        (existing.deal as Partial<ImportedDeal>) || {},
        incoming.deal as Partial<ImportedDeal>
      ) as ImportedDeal;
      break;
    case "technical":
      next.technical = mergeDefinedFieldsPreferExisting<Partial<ImportedTechnical>>(
        (existing.technical as Partial<ImportedTechnical>) || {},
        incoming.technical as Partial<ImportedTechnical>
      ) as ImportedTechnical;
      break;
    case "hotels":
      next.hotels = [...(existing.hotels || []), ...(incoming.hotels || [])];
      break;
    case "food":
      next.food = [...(existing.food || []), ...(incoming.food || [])];
      break;
    case "flights":
      next.flights = [...(existing.flights || []), ...(incoming.flights || [])];
      break;
    case "activities":
      next.activities = [
        ...(existing.activities || []),
        ...(incoming.activities || []),
      ];
      break;
    case "contacts":
      next.contacts = [...(existing.contacts || []), ...(incoming.contacts || [])];
      break;
    case "documents":
      next.documents = [
        ...(existing.documents || []),
        ...(incoming.documents || []),
      ];
      break;
  }

  return next;
}

function mergeSectionIntoResult(
  section: ImportSection,
  result: ImportData,
  partial: Partial<ImportData>
): ImportData {
  switch (section) {
    case "general":
      result.general = mergeDefinedFieldsPreferExisting(result.general, partial.general);
      break;
    case "deal":
      result.deal = mergeDefinedFieldsPreferExisting(result.deal, partial.deal);
      break;
    case "technical":
      result.technical = mergeDefinedFieldsPreferExisting(result.technical, partial.technical);
      break;
    case "hotels":
      if (partial.hotels?.length) {
        result.hotels = [...result.hotels, ...partial.hotels];
      }
      break;
    case "food":
      if (partial.food?.length) {
        result.food = [...result.food, ...partial.food];
      }
      break;
    case "flights":
      if (partial.flights?.length) {
        result.flights = [...result.flights, ...partial.flights];
      }
      break;
    case "activities":
      if (partial.activities?.length) {
        result.activities = [...result.activities, ...partial.activities];
      }
      break;
    case "contacts":
      if (partial.contacts?.length) {
        result.contacts = [...result.contacts, ...partial.contacts];
      }
      break;
    case "documents":
      if (partial.documents?.length) {
        result.documents = [...result.documents, ...partial.documents];
      }
      break;
  }

  return result;
}

/**
 * Run extraction for a single section across all sources and their chunks.
 * Processes sources/chunks in stable order, merging partial data and confidence.
 */
export async function runSectionExtraction(
  section: ImportSection,
  sources: ImportSource[],
  onProgress?: ProgressCallback,
  sectionsCompleted = 0,
  totalSections = 9
): Promise<SectionExtractionResult> {
  const chunks = buildChunksForSection(section, sources, 800);
  let partialData: Partial<ImportData> = {};
  const confidenceByField: Record<string, number> = {};
  const idToName: Record<string, string> = Object.fromEntries(
    sources.map((s) => [s.id, s.fileName])
  );

  logger.info("Section extraction started", {
    section,
    sources: sources.length,
    chunks: chunks.length,
  });

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const fileName = idToName[chunk.sourceId] || "";
    
    logger.info("Extracting chunk", {
      section,
      sourceId: chunk.sourceId,
      fileName,
      chunkIndex: chunk.chunkIndex,
      totalChunks: chunks.length,
    });

    // Report progress for this chunk
    if (onProgress) {
      await onProgress({
        current_section: section,
        current_source: fileName,
        current_chunk: i + 1,
        total_chunks: chunks.length,
        sections_completed: sectionsCompleted,
        total_sections: totalSections,
      });
    }

    const chunkResult = await extractSectionFromChunk({
      section,
      sourceId: chunk.sourceId,
      chunkIndex: chunk.chunkIndex,
      chunkText: chunk.text,
      existingPartial: partialData,
    });
    partialData = mergeSectionPartialData(section, partialData, chunkResult.partialData);
    mergeConfidence(confidenceByField, chunkResult.confidenceByField);
  }

  // Summarize items extracted for this section
  const summaryCounts: Record<string, number> = {};
  switch (section) {
    case "general":
      summaryCounts.fields = Object.values(partialData.general || {}).filter(hasMeaningfulValue).length;
      break;
    case "deal":
      summaryCounts.fields = Object.values(partialData.deal || {}).filter(hasMeaningfulValue).length;
      break;
    case "technical":
      summaryCounts.fields = Object.values(partialData.technical || {}).filter(hasMeaningfulValue).length;
      break;
    case "hotels":
      summaryCounts.items = (partialData.hotels || []).length;
      break;
    case "food":
      summaryCounts.items = (partialData.food || []).length;
      break;
    case "flights":
      summaryCounts.items = (partialData.flights || []).length;
      break;
    case "activities":
      summaryCounts.items = (partialData.activities || []).length;
      break;
    case "contacts":
      summaryCounts.items = (partialData.contacts || []).length;
      break;
    case "documents":
      summaryCounts.items = (partialData.documents || []).length;
      break;
  }

  logger.info("Section extraction finished", { section, ...summaryCounts });

  return {
    section,
    partialData,
    confidenceByField,
  };
}

/**
 * Run full import extraction across all sections in a fixed order.
 * Returns merged ImportData plus a confidence map keyed by field paths.
 * Optionally calls onProgress for each section to enable UI updates.
 */
export async function runFullImportExtraction(
  sources: ImportSource[],
  onProgress?: ProgressCallback
): Promise<FullExtractionResult> {
  const result = createEmptyImportData();
  let confidenceByField: Record<string, ConfidenceEntry> = {};
  logger.info("Full import extraction started", {
    sources: sources.map((s) => ({ id: s.id, fileName: s.fileName, mimeType: s.mimeType })),
  });

  for (let i = 0; i < SECTION_ORDER.length; i++) {
    const section = SECTION_ORDER[i];
    
    // Skip AI extraction for documents - just categorize uploaded files
    if (section === "documents") {
      logger.info("Documents section: categorizing uploaded files", { sources: sources.length });
      result.documents = sources.map((source) => ({
        fileName: source.fileName,
        fileSize: 0, // Will be populated when files are uploaded to storage
        category: categorizeDocumentType(source.fileName, source.mimeType),
        file: undefined,
      }));
      continue;
    }

    const sectionChunks = buildChunksForSection(section, sources, 800);
    logger.info("Starting section", { section, chunks: sectionChunks.length });

    // Report progress before starting section
    if (onProgress) {
      await onProgress({
        current_section: section,
        sections_completed: i,
        total_sections: SECTION_ORDER.length,
      });
    }

    const { partialData, confidenceByField: sectionConfidence } = await runSectionExtraction(
      section,
      sources,
      onProgress,
      i,
      SECTION_ORDER.length
    );
    mergeSectionIntoResult(section, result, partialData);
    mergeConfidence(confidenceByField, sectionConfidence);

    if (section === "hotels") {
      const deduped = dedupeSectionWithConfidence(
        result.hotels,
        "hotels",
        confidenceByField,
        (item) =>
          `${normalizeKey(item.name)}|${normalizeKey(item.city)}|${normalizeKey(item.checkInDate)}`
      );
      result.hotels = deduped.items;
      confidenceByField = deduped.confidenceMap;
    }

    if (section === "flights") {
      const deduped = dedupeSectionWithConfidence(
        result.flights,
        "flights",
        confidenceByField,
        (item) =>
          `${normalizeKey(item.flightNumber)}|${normalizeKey(item.departureTime)}|${normalizeKey(item.fromAirport)}`
      );
      result.flights = deduped.items;
      confidenceByField = deduped.confidenceMap;
    }

    if (section === "contacts") {
      const deduped = dedupeSectionWithConfidence(
        result.contacts,
        "contacts",
        confidenceByField,
        (item, idx) => {
          const email = normalizeKey(item.email);
          const phone = normalizeKey(item.phone);
          return email || phone || `contact-${idx}`;
        }
      );
      result.contacts = deduped.items;
      confidenceByField = deduped.confidenceMap;
    }
  }

  logger.info("Full import extraction completed", {
    totals: {
      hotels: result.hotels.length,
      flights: result.flights.length,
      food: result.food.length,
      activities: result.activities.length,
      contacts: result.contacts.length,
      documents: result.documents.length,
    },
  });

  return { data: result, confidenceByField };
}

function mergeConfidence(
  target: Record<string, ConfidenceEntry>,
  incoming?: Record<string, ConfidenceEntry>
): void {
  if (!incoming) return;
  Object.entries(incoming).forEach(([key, value]) => {
    const currentScore = getConfidenceScore(target[key]);
    const incomingScore = getConfidenceScore(value);
    if (incomingScore === undefined) return;
    if (currentScore === undefined || incomingScore >= currentScore) {
      target[key] = value;
    }
  });
}

function normalizeKey(value?: string): string {
  return (value || "").trim().toLowerCase();
}

function dedupeSectionWithConfidence<T>(
  items: T[],
  sectionKey: "hotels" | "flights" | "contacts",
  confidenceMap: Record<string, ConfidenceEntry>,
  keyFn: (item: T, index: number) => string
): { items: T[]; confidenceMap: Record<string, ConfidenceEntry> } {
  const seen = new Map<string, number>();
  const dedupedItems: T[] = [];
  const indexMapping: Record<number, number> = {};

  items.forEach((item, idx) => {
    const key = keyFn(item, idx) || `__idx_${idx}`;
    if (!seen.has(key)) {
      const newIndex = dedupedItems.length;
      seen.set(key, newIndex);
      dedupedItems.push(item);
      indexMapping[idx] = newIndex;
    }
  });

  const updatedConfidence: Record<string, ConfidenceEntry> = {};
  Object.entries(confidenceMap).forEach(([path, value]) => {
    const match = path.match(new RegExp(`^${sectionKey}\\[(\\d+)\\]\\.(.+)$`));
    if (match) {
      const oldIndex = Number(match[1]);
      const rest = match[2];
      const newIndex = indexMapping[oldIndex];
      if (newIndex !== undefined) {
        const newPath = `${sectionKey}[${newIndex}].${rest}`;
        const currentScore = getConfidenceScore(updatedConfidence[newPath]);
        const incomingScore = getConfidenceScore(value);
        if (incomingScore !== undefined && (currentScore === undefined || incomingScore >= currentScore)) {
          updatedConfidence[newPath] = value;
        }
      }
    } else {
      const currentScore = getConfidenceScore(updatedConfidence[path]);
      const incomingScore = getConfidenceScore(value);
      if (incomingScore !== undefined && (currentScore === undefined || incomingScore >= currentScore)) {
        updatedConfidence[path] = value;
      }
    }
  });

  return { items: dedupedItems, confidenceMap: updatedConfidence };
}
