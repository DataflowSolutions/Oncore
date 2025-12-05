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

    const sectionFacts = allFacts.filter(f => f.fact_type.startsWith(`${section}_`)).length;
    const newFacts = allFacts.length - beforeCount;
    logger.info(`✅ [Section ${sectionProgress}] ${section} complete: +${newFacts} facts`, {
      jobId,
      section,
      newFactsThisSection: newFacts,
      totalSectionFacts: sectionFacts,
      totalFactsSoFar: allFacts.length,
    });
  }

  logger.info('Stage 1 complete: Extracted facts (before post-processing)', {
    jobId,
    count: allFacts.length,
  });

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
