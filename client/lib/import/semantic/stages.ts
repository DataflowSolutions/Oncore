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
 */
export async function runFactExtraction(
  supabase: SupabaseClientLike,
  jobId: string,
  sources: ImportSource[],
  onProgress?: SemanticProgressCallback
): Promise<FactExtractionResult> {
  logger.info('Stage 1: Fact extraction starting', { jobId, sources: sources.length });
  await updateImportJobStage(supabase, jobId, 'extracting_facts');

  const allFacts: ExtractedFact[] = [];
  const maxWordsPerChunk = 800;

  for (let sourceIdx = 0; sourceIdx < sources.length; sourceIdx++) {
    const source = sources[sourceIdx];

    logger.info(`Extracting facts from source: ${source.file_name}`, {
      jobId,
      source: source.id,
    });

    const chunks = buildAllChunks(source, maxWordsPerChunk);

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];

      if (onProgress) {
        await onProgress({
          stage: 'extracting_facts',
          current_source: source.file_name,
          current_chunk: chunkIdx + 1,
          total_chunks: chunks.length,
          sources_completed: sourceIdx,
          total_sources: sources.length,
        });
      }

      if (isDiagnosticsEnabled()) {
        logChunk(jobId, source, chunk);
      }

      logger.info(`Extracting from chunk ${chunkIdx + 1}/${chunks.length}`, {
        jobId,
        source: source.id,
        chunk: chunkIdx + 1,
      });

      const chunkFacts = await extractFactsFromChunk(jobId, source, chunk);
      allFacts.push(...chunkFacts);
    }
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
    dumpFacts(jobId, processedFacts);
    dumpPostProcessing(jobId, allFacts, processedFacts);
  }

  // Insert facts into database
  const importFacts = await insertImportFacts(supabase, jobId, processedFacts);
  logger.info('Facts inserted into database', {
    jobId,
    count: importFacts.length,
  });

  return {
    facts: processedFacts,
    sources,
  };
}

/**
 * Build all chunks for a source across all sections
 */
function buildAllChunks(source: ImportSource, maxWords: number): TextChunk[] {
  const sections: ImportSection[] = [
    'confirmation',
    'contract',
    'itinerary',
    'rider',
    'general',
  ];

  const allChunks: TextChunk[] = [];
  for (const section of sections) {
    const sectionChunks = buildChunksForSection(source, section, maxWords);
    allChunks.push(...sectionChunks);
  }

  return allChunks;
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
  const facts = await getImportFacts(supabase, jobId);
  logger.info('Fetched facts for resolution', { jobId, count: facts.length });

  if (facts.length === 0) {
    logger.warn('No facts found for resolution', { jobId });
    return { resolutions: [], selected_fact_ids: [] };
  }

  // Run resolution
  const resolutions = await resolveImportFacts(facts);
  logger.info('Resolution complete', { jobId, resolutions: resolutions.length });

  if (isDiagnosticsEnabled()) {
    dumpResolutions(jobId, resolutions);
  }

  // Extract selected fact IDs
  const selectedIds = resolutions
    .filter(r => r.selected_fact_id)
    .map(r => r.selected_fact_id as string);

  // Mark selected facts in database
  if (selectedIds.length > 0) {
    await selectImportFacts(supabase, selectedIds);
    logger.info('Marked facts as selected', { jobId, count: selectedIds.length });
  }

  await updateImportJobStage(supabase, jobId, 'applying');

  return {
    resolutions,
    selected_fact_ids: selectedIds,
  };
}
