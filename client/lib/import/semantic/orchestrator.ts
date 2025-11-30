/**
 * Semantic Import Orchestrator
 * 
 * Coordinates the two-stage semantic import pipeline:
 * - Stage 1: Extract candidate facts from all chunks
 * - Stage 2: Perform semantic resolution to select final values
 * - Apply resolved facts to canonical ImportData structure
 */

import { logger } from '@/lib/logger';
import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImportSource, TextChunk } from '../chunking';
import { buildChunksForSection } from '../chunking';
import type { ImportData, ImportSection } from '@/components/import/types';
import {
  createEmptyImportData,
  createEmptyHotel,
  createEmptyFood,
  createEmptyFlight,
  createEmptyActivity,
  createEmptyContact,
  createEmptyDocument,
} from '@/components/import/types';
import type {
  ExtractedFact,
  ImportFact,
  FactResolution,
  ImportFactType,
  ImportSourceScope,
} from './types';
import { FACT_TYPE_TO_IMPORT_FIELD } from './types';
import { extractFactsFromChunk } from './fact-extraction';
import { resolveImportFacts, summarizeResolutions } from './resolution';
import {
  insertImportFacts,
  getImportFacts,
  selectImportFacts,
  updateImportJobStage,
} from './db';

type SupabaseClientLike = Pick<SupabaseClient<Database>, 'rpc'>;

// =============================================================================
// Types
// =============================================================================

export interface SemanticExtractionProgress {
  stage: 'extracting_facts' | 'resolving' | 'applying';
  current_source?: string;
  current_chunk?: number;
  total_chunks?: number;
  facts_extracted?: number;
  sources_completed?: number;
  total_sources?: number;
}

export type SemanticProgressCallback = (
  progress: SemanticExtractionProgress
) => Promise<void> | void;

export interface SemanticExtractionResult {
  /** The final ImportData with resolved values */
  data: ImportData;
  /** Total facts extracted in Stage 1 */
  facts_extracted: number;
  /** Total facts selected in Stage 2 */
  facts_selected: number;
  /** Resolution decisions */
  resolutions: FactResolution[];
  /** Summary of what was resolved vs unagreed */
  summary: string;
  /** Any warnings from extraction or resolution */
  warnings?: string[];
}

// =============================================================================
// Stage 1: Fact Extraction
// =============================================================================

/**
 * Extract facts from all sources
 */
async function runFactExtraction(
  supabase: SupabaseClientLike,
  jobId: string,
  sources: ImportSource[],
  onProgress?: SemanticProgressCallback
): Promise<{ facts: ExtractedFact[]; warnings: string[] }> {
  const allFacts: ExtractedFact[] = [];
  const allWarnings: string[] = [];
  let previousFacts: ExtractedFact[] = [];
  let globalMessageIndex = 0;

  // Update stage
  await updateImportJobStage(supabase, jobId, 'extracting_facts');

  for (let sourceIdx = 0; sourceIdx < sources.length; sourceIdx++) {
    const source = sources[sourceIdx];
    
    // Build chunks for this source (using full text, not section-specific)
    const chunks = buildAllChunks(source, 1000); // 1000 words per chunk
    
    logger.info('Extracting facts from source', {
      jobId,
      sourceId: source.id,
      fileName: source.fileName,
      chunks: chunks.length,
    });

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];

      if (onProgress) {
        await onProgress({
          stage: 'extracting_facts',
          current_source: source.fileName,
          current_chunk: chunkIdx + 1,
          total_chunks: chunks.length,
          facts_extracted: allFacts.length,
          sources_completed: sourceIdx,
          total_sources: sources.length,
        });
      }

      const result = await extractFactsFromChunk({
        job_id: jobId,
        source_id: source.id,
        source_file_name: source.fileName,
        chunk_index: chunkIdx,
        chunk_text: chunk.text,
        previous_facts: previousFacts.slice(-20),
        message_index: globalMessageIndex,
      });

      allFacts.push(...result.facts);
      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }

      // Update context for next chunk
      previousFacts = [...previousFacts, ...result.facts];
      globalMessageIndex++;
    }

    // Insert facts after each source (for progress visibility)
    const sourceFacts = allFacts.filter(f => f.source_id === source.id);
    if (sourceFacts.length > 0) {
      const insertResult = await insertImportFacts(supabase, jobId, sourceFacts);
      if (insertResult.error) {
        allWarnings.push(`Failed to insert facts for ${source.fileName}: ${insertResult.error}`);
      }
    }
  }

  // Mark extraction complete
  await updateImportJobStage(supabase, jobId, 'facts_complete', {
    factsExtractedAt: new Date(),
  });

  return { facts: allFacts, warnings: allWarnings };
}

/**
 * Build chunks from a source for fact extraction
 */
function buildAllChunks(source: ImportSource, maxWords: number): TextChunk[] {
  const text = source.rawText || '';
  if (!text.trim()) return [];

  const words = text.split(/\s+/).filter(Boolean);
  const chunks: TextChunk[] = [];
  
  for (let i = 0; i < words.length; i += maxWords) {
    const chunkWords = words.slice(i, i + maxWords);
    chunks.push({
      sourceId: source.id,
      chunkIndex: chunks.length,
      text: chunkWords.join(' '),
    });
  }

  return chunks;
}

// =============================================================================
// Stage 2: Semantic Resolution
// =============================================================================

/**
 * Resolve facts to determine final values
 */
async function runFactResolution(
  supabase: SupabaseClientLike,
  jobId: string,
  onProgress?: SemanticProgressCallback
): Promise<{ resolutions: FactResolution[]; selectedIds: string[]; warnings: string[] }> {
  // Update stage
  await updateImportJobStage(supabase, jobId, 'resolving');

  if (onProgress) {
    await onProgress({
      stage: 'resolving',
    });
  }

  // Get all facts from database
  const { facts, error } = await getImportFacts(supabase, jobId);
  
  if (error) {
    return {
      resolutions: [],
      selectedIds: [],
      warnings: [`Failed to get facts: ${error}`],
    };
  }

  if (facts.length === 0) {
    return {
      resolutions: [],
      selectedIds: [],
      warnings: ['No facts to resolve'],
    };
  }

  // Run resolution
  const result = await resolveImportFacts({
    job_id: jobId,
    facts,
  });

  // Save selections to database
  const selectResult = await selectImportFacts(supabase, jobId, result.resolutions);
  
  const warnings = [...(result.warnings || [])];
  if (selectResult.error) {
    warnings.push(`Failed to save selections: ${selectResult.error}`);
  }

  // Mark resolution complete
  await updateImportJobStage(supabase, jobId, 'resolved', {
    resolutionCompletedAt: new Date(),
  });

  return {
    resolutions: result.resolutions,
    selectedIds: result.selected_fact_ids,
    warnings,
  };
}

// Export for diagnostic/test usage
export { applyResolutionsToImportData };

// =============================================================================
// Apply Resolved Facts to ImportData
// =============================================================================

/**
 * Apply resolved facts to create the final ImportData structure.
 * 
 * HARD RULE: Only 'resolved' and 'informational' states write to canonical data.
 * States 'unagreed' and 'missing' are FIRST-CLASS OUTCOMES that intentionally
 * do NOT write to the import data. This is by design - we'd rather have missing
 * data than wrong data.
 */
function applyResolutionsToImportData(
  resolutions: FactResolution[],
  selectedFacts: ImportFact[]
): ImportData {
  const data = createEmptyImportData();
  
  // Build map of selected facts by ID
  const factsById = new Map(selectedFacts.map(f => [f.id, f]));

  for (const resolution of resolutions) {
    // =================================================================
    // HARD RULE: Only 'resolved' and 'informational' states write to data
    // 'unagreed' and 'missing' are VALID OUTCOMES that produce NO data
    // =================================================================
    if (resolution.state === 'unagreed' || resolution.state === 'missing') {
      logger.debug(
        `[Semantic] ${resolution.fact_type}: state='${resolution.state}' - NOT writing (expected)`
      );
      continue;
    }

    if (resolution.state !== 'resolved' && resolution.state !== 'informational') {
      logger.warn(
        `[Semantic] Unexpected resolution state '${resolution.state}' for ${resolution.fact_type} - skipping`
      );
      continue;
    }

    const fact =
      resolution.selected_fact_id && factsById.get(resolution.selected_fact_id)
        ? (factsById.get(resolution.selected_fact_id) as ImportFact)
        : null;

    // Accept resolutions with values even if selected_fact_id missing (already vetted in validation)
    if (!fact && !resolution.selected_fact_id) {
      applyFactToImportData(data, undefined, resolution);
      continue;
    }

    if (!fact) {
      logger.warn(
        `[Semantic] Selected fact ${resolution.selected_fact_id} not found in facts map - skipping`
      );
      continue;
    }

    if (fact.status === 'rejected' || fact.status === 'withdrawn' || fact.status === 'question') {
      logger.error(
        `[Semantic] HARD RULE VIOLATION: Attempting to apply fact ${fact.id} with ` +
        `status '${fact.status}' to canonical data. This should have been caught by validation.`
      );
      continue;
    }

    applyFactToImportData(data, fact, resolution);
  }

  normalizeGeneralLocation(data);
  return data;
}

function normalizeGeneralLocation(data: ImportData): void {
  const city = (data.general.city || '').toLowerCase();
  const venue = (data.general.venue || '').toLowerCase();
  const country = (data.general.country || '').toLowerCase();

  const mentionsDubai = city.includes('dubai') || venue.includes('dubai') || venue.includes('uae');
  if (mentionsDubai && !country.includes('uae')) {
    data.general.country = 'UAE';
  }

  if (!data.general.eventName) {
    const artist = data.general.artist || '';
    const primaryLocation = data.general.venue || data.general.city || '';
    if (artist && primaryLocation) {
      data.general.eventName = `${artist} @ ${primaryLocation}`;
    }
  }
}

/**
 * Apply a single fact to ImportData
 */
function applyFactToImportData(
  data: ImportData,
  fact: ImportFact | undefined,
  resolution: FactResolution
): void {
  const factType = fact?.fact_type ?? resolution.fact_type;
  const resolvedNumber = resolution.final_value_number ?? fact?.value_number;
  const resolvedDate = resolution.final_value_date ?? fact?.value_date;
  const resolvedText = resolution.final_value_text ?? fact?.value_text;

  let value: string | undefined;
  if (factType === 'event_date') {
    value =
      resolvedDate ||
      resolvedText ||
      (resolvedNumber !== undefined ? String(resolvedNumber) : undefined) ||
      fact?.value_date ||
      fact?.value_text ||
      (fact?.value_number !== undefined ? String(fact.value_number) : undefined);
  } else {
    value =
      resolvedText ||
      (resolvedNumber !== undefined ? String(resolvedNumber) : undefined) ||
      resolvedDate ||
      fact?.value_text ||
      (fact?.value_number !== undefined ? String(fact.value_number) : undefined) ||
      fact?.value_date;
  }

  // Handle datetime fields for flights (flight_departure_datetime, flight_arrival_datetime)
  // The LLM may put datetime values into value_datetime instead of value_text
  if (
    !value &&
    (factType === 'flight_departure_datetime' || factType === 'flight_arrival_datetime')
  ) {
    if (fact?.value_datetime) {
      value = fact.value_datetime;
    }
  }

  if (!value) return;

  const factDomain = resolution.fact_domain ?? fact?.fact_domain ?? null;
  const factSourceScope = (fact?.source_scope as ImportSourceScope | undefined) ?? 'unknown';

  const fields = FACT_TYPE_TO_IMPORT_FIELD[factType] || [];
  
  for (const field of fields) {
    applyValueToField(data, field, value, factType, factDomain, factSourceScope);
  }
}

/**
 * Apply a value to a specific field path
 */
function applyValueToField(
  data: ImportData,
  fieldPath: string,
  value: string,
  factType: ImportFactType,
  factDomain: string | null,
  sourceScope: ImportSourceScope
): void {
  // Legacy flight_departure/arrival: only apply if parsing as date/time
  if ((factType === 'flight_departure' || factType === 'flight_arrival') &&
      (fieldPath.endsWith('Airport'))) {
    return; // never map legacy date-ish strings into airport fields
  }

  // Handle array fields (e.g., "hotels[].name")
  if (fieldPath.includes('[]')) {
    const [arrayKey, property] = fieldPath.split('[].');
    const array = (data as any)[arrayKey] as any[];

    // Normalize domain per section
    const normalizedDomain = normalizeDomain(arrayKey, factDomain);
    const targetIndex = resolveArrayIndex(arrayKey, normalizedDomain, factType, value, array);

    // Find or create item by domain/index
    let item = array.find((i: any, idx: number) => i._domain === normalizedDomain || idx === targetIndex);
    if (!item) {
      item = createEmptyArrayItem(arrayKey);
      if (normalizedDomain) {
        (item as any)._domain = normalizedDomain;
      }
      if (targetIndex !== undefined && targetIndex >= 0) {
        array[targetIndex] = item;
      } else {
        array.push(item);
      }
    }
    
    if (property) {
      // Hotel scoping: prefer higher source_scope; skip rider_example if better data exists
      if (arrayKey === 'hotels' && shouldSkipHotelField(item, sourceScope)) {
        return;
      }

      if (!item[property]) {
        item[property] = value;
      } else if (shouldOverrideExisting(arrayKey, sourceScope, item._source_scope as ImportSourceScope | undefined)) {
        item[property] = value;
      }
      // Track source_scope for later comparisons
      if (arrayKey === 'hotels' || arrayKey === 'flights' || arrayKey === 'contacts') {
        item._source_scope = sourceScope;
      }
    }
    return;
  }

  // Handle nested fields (e.g., "deal.fee")
  const parts = fieldPath.split('.');
  let target: any = data;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!target[part]) {
      target[part] = {};
    }
    target = target[part];
  }

  const lastPart = parts[parts.length - 1];
  
  // Only set if not already set (first value wins for resolved facts)
  if (!target[lastPart]) {
    target[lastPart] = value;
  }
}

/**
 * Create a properly initialized empty item for array fields.
 * This ensures all required fields have empty strings instead of undefined.
 */
function createEmptyArrayItem(arrayKey: string): object {
  switch (arrayKey) {
    case 'hotels':
      return createEmptyHotel();
    case 'food':
      return createEmptyFood();
    case 'flights':
      return createEmptyFlight();
    case 'activities':
      return createEmptyActivity();
    case 'contacts':
      return createEmptyContact();
    case 'documents':
      return createEmptyDocument();
    default:
      // Fallback for unknown array types
      return { id: crypto.randomUUID() };
  }
}

// =============================================================================
// Domain helpers
// =============================================================================

function normalizeDomain(arrayKey: string, factDomain: string | null): string | null {
  if (factDomain) return factDomain;
  if (arrayKey === 'flights') return 'flight_leg_1';
  if (arrayKey === 'hotels') return 'hotel_main';
  if (arrayKey === 'contacts') return 'contact_main';
  return null;
}

function domainToIndex(arrayKey: string, domain: string | null): number {
  if (!domain) return 0;
  if (arrayKey === 'flights' && domain.startsWith('flight_leg_')) {
    const leg = Number(domain.replace('flight_leg_', ''));
    return Number.isFinite(leg) && leg > 0 ? leg - 1 : 0;
  }
  if (arrayKey === 'hotels' && domain.startsWith('hotel_alt')) {
    const alt = Number(domain.replace('hotel_alt', ''));
    return Number.isFinite(alt) && alt >= 1 ? alt : 0;
  }
  if (arrayKey === 'hotels' && domain === 'hotel_main') return 0;
  if (arrayKey === 'contacts' && domain.startsWith('contact_')) {
    const map: Record<string, number> = {
      contact_promoter: 0,
      contact_main: 0,
      contact_agent: 1,
      contact_tour_manager: 2,
      contact_manager: 2,
    };
    if (domain in map) return map[domain];
    const suffix = Number(domain.replace('contact_', ''));
    return Number.isFinite(suffix) && suffix >= 1 ? suffix - 1 : 0;
  }
  return 0;
}

function resolveArrayIndex(
  arrayKey: string,
  domain: string | null,
  factType: ImportFactType,
  value: string,
  array: any[]
): number {
  if (arrayKey === 'flights') {
    if (domain) {
      const existing = array.findIndex((i: any) => i._domain === domain);
      if (existing >= 0) return existing;
      if (domain.startsWith('flight_leg_')) return domainToIndex(arrayKey, domain);
      return array.length;
    }
    // No domain: if this is a flight number, try to place by unique number
    if (factType === 'flight_number' && value) {
      const existingIdx = array.findIndex((f: any) => (f.flightNumber || '').toLowerCase() === value.toLowerCase());
      if (existingIdx >= 0) return existingIdx;
      return array.length; // new flight leg
    }
    // For other flight fields without domain, attach to the most recent leg
    if (array.length > 0) return array.length - 1;
    return 0;
  }
  if (arrayKey === 'hotels' || arrayKey === 'contacts') {
    if (domain) return domainToIndex(arrayKey, domain);
  }
  return 0;
}

function scopePriority(scope: ImportSourceScope): number {
  const order: Record<ImportSourceScope, number> = {
    contract_main: 100,
    itinerary: 90,
    confirmation: 85,
    general_info: 50,
    rider_example: 20,
    unknown: 10,
  };
  return order[scope] ?? 10;
}

function shouldSkipHotelField(item: any, incomingScope: ImportSourceScope): boolean {
  const existingScope = item?._source_scope as ImportSourceScope | undefined;
  if (!existingScope) return false;
  // If existing scope is higher/equal, skip; rider_example can be overwritten by better scopes
  if (scopePriority(existingScope) >= scopePriority(incomingScope)) {
    return true;
  }
  return false;
}

function shouldOverrideExisting(arrayKey: string, incomingScope: ImportSourceScope, existingScope?: ImportSourceScope): boolean {
  // Only allow override within same domain collections when incoming scope is higher
  if (arrayKey === 'hotels' || arrayKey === 'flights' || arrayKey === 'contacts') {
    if (!existingScope) return true;
    return scopePriority(incomingScope) > scopePriority(existingScope);
  }
  return false;
}

// =============================================================================
// Main Orchestrator
// =============================================================================

/**
 * Run the full semantic import extraction pipeline.
 * 
 * Stage 1: Extract candidate facts from all chunks
 * Stage 2: Perform semantic resolution
 * Stage 3: Apply resolved facts to ImportData
 */
export async function runSemanticImportExtraction(
  supabase: SupabaseClientLike,
  jobId: string,
  sources: ImportSource[],
  onProgress?: SemanticProgressCallback
): Promise<SemanticExtractionResult> {
  logger.info('Semantic import extraction starting', {
    jobId,
    sources: sources.map(s => ({
      id: s.id,
      fileName: s.fileName,
      textLength: s.rawText?.length || 0,
    })),
  });

  const allWarnings: string[] = [];

  // Stage 1: Extract facts
  const extractionResult = await runFactExtraction(
    supabase,
    jobId,
    sources,
    onProgress
  );
  allWarnings.push(...extractionResult.warnings);

  logger.info('Stage 1 complete: Facts extracted', {
    jobId,
    factsExtracted: extractionResult.facts.length,
  });

  // Stage 2: Resolve facts
  const resolutionResult = await runFactResolution(
    supabase,
    jobId,
    onProgress
  );
  allWarnings.push(...resolutionResult.warnings);

  logger.info('Stage 2 complete: Facts resolved', {
    jobId,
    resolutions: resolutionResult.resolutions.length,
    selected: resolutionResult.selectedIds.length,
  });

  // Stage 3: Apply to ImportData
  if (onProgress) {
    await onProgress({ stage: 'applying' });
  }

  await updateImportJobStage(supabase, jobId, 'applying');

  // Get selected facts from database
  const { facts: allFacts } = await getImportFacts(supabase, jobId);
  const selectedFacts = allFacts.filter(f => f.is_selected);

  const data = applyResolutionsToImportData(
    resolutionResult.resolutions,
    selectedFacts
  );

  // Generate summary
  const summary = summarizeResolutions(resolutionResult.resolutions);

  await updateImportJobStage(supabase, jobId, 'completed');

  logger.info('Semantic import extraction complete', {
    jobId,
    factsExtracted: extractionResult.facts.length,
    factsSelected: resolutionResult.selectedIds.length,
  });

  return {
    data,
    facts_extracted: extractionResult.facts.length,
    facts_selected: resolutionResult.selectedIds.length,
    resolutions: resolutionResult.resolutions,
    summary,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
  };
}
