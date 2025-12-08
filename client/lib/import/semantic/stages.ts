/**
 * Pipeline Stages
 * 
 * Core extraction and resolution pipeline stages.
 */

import { logger } from '@/lib/logger';
import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImportSource, TextChunk } from '../chunking';
import { buildChunksForSection } from '../chunking';
import type { ImportSection } from '@/components/import/types';
import type { ExtractedFact, ImportFact, FactResolution } from './types';
import { extractFactsFromChunk } from './fact-extraction';
import { resolveImportFacts } from './resolution';
import { postProcessAllFacts } from './post-process';
import {
  insertImportFacts,
  getImportFacts,
  selectImportFacts,
  updateImportJobStage,
} from './db';
import {
  isDiagnosticsEnabled,
  logChunk,
  dumpFacts,
  dumpPostProcessing,
  dumpResolutions,
} from './diagnostics';
import type { SemanticProgressCallback } from './types-public';

type SupabaseClientLike = Pick<SupabaseClient<Database>, 'rpc'>;

// =============================================================================
// Stage 1: Fact Extraction
// =============================================================================

export interface FactExtractionResult {
  facts: ExtractedFact[];
  sources: ImportSource[];
}

/**
 * Extract facts from all sources
 * 
 * @param options.maxWordsPerChunk - Optional override for max words per chunk (defaults to env SEMANTIC_IMPORT_MAX_WORDS or 800)
 * @param options.minWordsPerChunk - Optional override for min words per chunk (defaults to env SEMANTIC_IMPORT_MIN_WORDS or 300)
 */
export async function runFactExtraction(
  supabase: SupabaseClientLike,
  jobId: string,
  sources: ImportSource[],
  onProgress?: SemanticProgressCallback,
  options?: {
    maxWordsPerChunk?: number;
    minWordsPerChunk?: number;
  }
): Promise<FactExtractionResult> {
  logger.info('Stage 1: Fact extraction starting', { jobId, sources: sources.length });
  await updateImportJobStage(supabase, jobId, 'extracting_facts');

  const allFacts: ExtractedFact[] = [];
  
  // Load chunk size config from param, env, or defaults
  const maxWordsPerChunk =
    options?.maxWordsPerChunk ||
    (typeof process !== 'undefined' && process.env?.SEMANTIC_IMPORT_MAX_WORDS
      ? parseInt(process.env.SEMANTIC_IMPORT_MAX_WORDS, 10)
      : null) ||
    800;
  
  const minWordsPerChunk =
    options?.minWordsPerChunk ||
    (typeof process !== 'undefined' && process.env?.SEMANTIC_IMPORT_MIN_WORDS
      ? parseInt(process.env.SEMANTIC_IMPORT_MIN_WORDS, 10)
      : null) ||
    300;

  logger.info('Chunk size config', { jobId, maxWordsPerChunk, minWordsPerChunk });

  // Build unified chunks across all sources once
  const allChunks = buildAllChunksAcrossSources(sources, maxWordsPerChunk, minWordsPerChunk);
  logger.info('Built unified chunks', {
    jobId,
    totalChunks: allChunks.length,
  });

  // Define section order for extraction passes
  // NOTE: 'documents' section is skipped - document categorization happens at upload time
  const sections: ImportSection[] = [
    'general',
    'deal',
    'flights',
    'hotels',
    'food',
    'activities',
    'contacts',
    'technical',
    // 'documents' - skipped, handled by upload system
  ];

    // Per-section extraction pass: iterate sections, then iterate chunks per section
  for (let sectionIdx = 0; sectionIdx < sections.length; sectionIdx++) {
    const section = sections[sectionIdx];
    const sectionProgress = `${sectionIdx + 1}/${sections.length}`;
    const beforeCount = allFacts.length;
    
    logger.info(`🔍 [Section ${sectionProgress}] Analyzing ${section} facts...`, {
      jobId,
      section,
      totalChunks: allChunks.length,
      factsFoundSoFar: beforeCount,
    });

    if (onProgress) {
      await onProgress({
        stage: 'extracting_facts',
        current_source: `section: ${section} (${sectionProgress})`,
        current_chunk: 0,
        total_chunks: allChunks.length,
        facts_extracted: beforeCount,
      });
    }

    // Iterate all chunks for this section
    for (let chunkIdx = 0; chunkIdx < allChunks.length; chunkIdx++) {
      const chunk = allChunks[chunkIdx];
      const sourceId = chunk.sourceId;
      const sourceFile = sources.find(s => s.id === sourceId);
      const chunkProgress = `${chunkIdx + 1}/${allChunks.length}`;

      // Log each chunk being processed
      logger.info(`   📄 [${section}] Processing chunk ${chunkProgress} from ${sourceFile?.fileName || 'unknown'}`, {
        jobId,
        section,
        chunkIdx: chunkIdx + 1,
        totalChunks: allChunks.length,
        sourceFile: sourceFile?.fileName,
      });

      if (isDiagnosticsEnabled()) {
        logChunk(sourceId, sourceFile?.fileName || 'unknown', chunk.chunkIndex, chunk.text);
      }

      // Update progress for each chunk
      if (onProgress) {
        await onProgress({
          stage: 'extracting_facts',
          current_source: `section: ${section} (${sectionProgress})`,
          current_chunk: chunkIdx + 1,
          total_chunks: allChunks.length,
          facts_extracted: allFacts.length,
        });
      }

      // Call extraction with section hint
      const chunkFacts = await extractFactsFromChunk({
        job_id: jobId,
        source_id: sourceId,
        source_file_name: sourceFile?.fileName || 'unknown',
        chunk_index: chunk.chunkIndex,
        chunk_text: chunk.text,
        message_index: chunkIdx,
        current_section: section,
      });

      if (chunkFacts.facts.length > 0) {
        logger.info(`   ✨ Found ${chunkFacts.facts.length} ${section} fact(s) in chunk ${chunkProgress}`, {
          jobId,
          section,
          chunkIdx: chunkIdx + 1,
          factsFound: chunkFacts.facts.length,
        });
      }

      allFacts.push(...chunkFacts.facts);
    }

    // ==========================================================================
    // LOG 4: Section summary after Stage 1 (critical for debugging)
    // Shows exactly what facts survived extraction for this section
    // ==========================================================================
    const sectionFacts = allFacts.filter(f => f.section === section);
    const sectionFactsByType = sectionFacts.reduce((acc, f) => {
      acc[f.fact_type] = (acc[f.fact_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const otherCount = sectionFactsByType['other'] || 0;
    const newFacts = allFacts.length - beforeCount;
    
    logger.info(`✅ [Section ${sectionProgress}] ${section} complete: +${newFacts} facts`, {
      jobId,
      section,
      newFactsThisSection: newFacts,
      byType: sectionFactsByType,
      otherDropped: otherCount,
      totalFactsSoFar: allFacts.length,
    });

    // Warn if we got facts but they're all 'other' (strong signal of normalization issue)
    if (newFacts > 0 && Object.keys(sectionFactsByType).length === 1 && otherCount > 0) {
      logger.warn(`🚨 [STAGE 1] Section "${section}" produced ONLY 'other' facts!`, {
        jobId,
        section,
        otherCount,
        hint: 'LLM is outputting non-standard fact_type strings. Check raw output logs.',
      });
    }
  }

  logger.info('Stage 1 complete: Extracted facts (before post-processing)', {
    jobId,
    count: allFacts.length,
  });

  // ==========================================================================
  // CRITICAL DEBUG: Flight facts after Stage 1 extraction
  // This is the smoking gun - if count=0 here, extraction/normalization failed
  // ==========================================================================
  const flightFacts = allFacts.filter(f => f.fact_type.startsWith('flight_'));
  logger.info('✈️ [STAGE 1 DEBUG] Flight facts after extraction', {
    jobId,
    count: flightFacts.length,
    preview: flightFacts.slice(0, 10).map(f => ({
      type: f.fact_type,
      value: f.value_text || f.value_number || f.value_date,
      snippet: f.raw_snippet?.slice(0, 50),
      source: f.source_file_name,
    })),
  });

  if (flightFacts.length === 0) {
    // Check if we have 'other' facts that might be misclassified flights
    const suspiciousOthers = allFacts.filter(f => 
      f.fact_type === 'other' && 
      f.section === 'flights'
    );
    if (suspiciousOthers.length > 0) {
      logger.warn('🚨 [STAGE 1] No flight_* facts but found "other" facts in flights section!', {
        jobId,
        suspiciousCount: suspiciousOthers.length,
        samples: suspiciousOthers.slice(0, 5).map(f => ({
          value: f.value_text,
          snippet: f.raw_snippet?.slice(0, 80),
        })),
        hint: 'LLM is outputting wrong fact_type strings. Check FACT_TYPE_ALIASES.',
      });
    }
  }

  // Post-process
  const processedFacts = postProcessAllFacts(allFacts);
  logger.info('Facts post-processed', {
    jobId,
    before: allFacts.length,
    after: processedFacts.length,
  });

  if (isDiagnosticsEnabled()) {
    dumpFacts('post-extraction', jobId, processedFacts);
    dumpPostProcessing(jobId);
  }

  // Insert facts into database
  const importFacts = await insertImportFacts(supabase, jobId, processedFacts);
  logger.info('Facts inserted into database', {
    jobId,
    count: importFacts.count,
  });

  return {
    facts: processedFacts,
    sources,
  };
}

/**
 * Build all chunks across ALL sources (unified, unordered by section)
 * 
 * This is used by the per-section extraction pass strategy:
 * - Chunks are built once, purely for size control
 * - Same chunks are iterated multiple times (once per section)
 * - Section filtering happens in prompts, not in chunking
 */
export function buildAllChunksAcrossSources(
  sources: ImportSource[],
  maxWords: number,
  minWords: number = 800
): TextChunk[] {
  // Use buildChunksForSection with a dummy section; it ignores the section anyway
  // and just chunks all sources uniformly by word count
  return buildChunksForSection('general', sources, maxWords, minWords);
}

/**
 * Build all chunks for a source across all sections
 * NOTE: This is legacy; use buildAllChunksAcrossSources for the section-pass strategy
 */
function buildAllChunks(source: ImportSource, maxWords: number): TextChunk[] {
  // Return chunks uniformly without section filtering
  return buildChunksForSection('general', [source], maxWords);
}

// =============================================================================
// Stage 2: Fact Resolution
// =============================================================================

export interface FactResolutionResult {
  resolutions: FactResolution[];
  selected_fact_ids: string[];
}

/**
 * Resolve facts using semantic resolution
 */
export async function runFactResolution(
  supabase: SupabaseClientLike,
  jobId: string,
  onProgress?: SemanticProgressCallback
): Promise<FactResolutionResult> {
  logger.info('Stage 2: Fact resolution starting', { jobId });
  await updateImportJobStage(supabase, jobId, 'resolving');

  if (onProgress) {
    await onProgress({
      stage: 'resolving',
    });
  }

  // Fetch all facts
  const factsResult = await getImportFacts(supabase, jobId);
  const facts = factsResult.facts || [];
  logger.info('Fetched facts for resolution', { jobId, count: facts.length });

  if (facts.length === 0) {
    logger.warn('No facts found for resolution', { jobId });
    return { resolutions: [], selected_fact_ids: [] };
  }

  // Run resolution with progress
  logger.info('🧠 Starting LLM semantic resolution...', {
    jobId,
    totalFacts: facts.length,
  });
  
  const resolutions = await resolveImportFacts({ job_id: jobId, facts });
  
  const resolved = resolutions.resolutions.filter(r => r.state === 'resolved').length;
  const unresolved = resolutions.resolutions.filter(r => r.state === 'unagreed').length;
  const informational = resolutions.resolutions.filter(r => r.state === 'informational').length;
  
  logger.info('✅ LLM resolution complete', {
    jobId,
    total: resolutions.resolutions.length,
    resolved,
    unresolved,
    informational,
    selected: resolutions.selected_fact_ids.length,
  });

  // ==========================================================================
  // LOG 5: Resolution discard report
  // Shows facts that were seen but NOT selected - critical for debugging
  // ==========================================================================
  const discardedResolutions = resolutions.resolutions.filter(
    r => r.selected_fact_id === null || r.selected_fact_id === undefined
  );
  
  if (discardedResolutions.length > 0) {
    // Group by fact_type for summary
    const discardedByType = discardedResolutions.reduce((acc, r) => {
      acc[r.fact_type] = (acc[r.fact_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.warn('🚫 [STAGE 2] Unresolved/discarded facts', {
      jobId,
      count: discardedResolutions.length,
      byType: discardedByType,
      details: discardedResolutions.slice(0, 10).map(r => ({
        type: r.fact_type,
        state: r.state,
        reason: r.reason?.slice(0, 100),
      })),
    });

    // Special warning for flight facts that were discarded
    const discardedFlights = discardedResolutions.filter(r => r.fact_type.startsWith('flight_'));
    if (discardedFlights.length > 0) {
      logger.warn('✈️ [STAGE 2] Flight facts discarded during resolution!', {
        jobId,
        count: discardedFlights.length,
        details: discardedFlights.map(r => ({
          type: r.fact_type,
          state: r.state,
          reason: r.reason,
        })),
      });
    }
  }

  if (isDiagnosticsEnabled()) {
    dumpResolutions(jobId, resolutions.resolutions, facts);
  }

  // Extract selected fact IDs
  const selectedIds = resolutions.resolutions
    .filter(r => r.selected_fact_id !== null && r.selected_fact_id !== undefined)
    .map(r => r.selected_fact_id as string);
  
  if (selectedIds.length === 0) {
    logger.warn('No facts selected after resolution', { jobId });
  }

  // Mark selected facts in database
  if (selectedIds.length > 0) {
    await selectImportFacts(supabase, jobId, resolutions.resolutions);
    logger.info('Marked facts as selected', { jobId, count: selectedIds.length });
  }

  await updateImportJobStage(supabase, jobId, 'applying');

  return {
    resolutions: resolutions.resolutions,
    selected_fact_ids: resolutions.selected_fact_ids || selectedIds,
  };
}
