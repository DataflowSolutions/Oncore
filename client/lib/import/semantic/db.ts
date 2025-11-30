/**
 * Database Service for Import Facts
 * 
 * Handles all database operations for the semantic import pipeline:
 * - Inserting extracted facts
 * - Retrieving facts for resolution
 * - Marking facts as selected
 * - Updating job stages
 */

import { logger } from '@/lib/logger';
import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ExtractedFact,
  ImportFact,
  FactResolution,
  ExtractionStage,
} from './types';

type SupabaseClientLike = Pick<SupabaseClient<Database>, 'rpc'>;

// =============================================================================
// Insert Facts (Stage 1)
// =============================================================================

/**
 * Insert extracted facts into the database
 */
export async function insertImportFacts(
  supabase: SupabaseClientLike,
  jobId: string,
  facts: ExtractedFact[]
): Promise<{ count: number; error?: string }> {
  if (facts.length === 0) {
    return { count: 0 };
  }

  logger.info('Inserting import facts', {
    jobId,
    count: facts.length,
  });

  try {
    const { data, error } = await (supabase as any).rpc('app_insert_import_facts', {
      p_job_id: jobId,
      p_facts: facts.map(fact => ({
        message_index: fact.message_index,
        chunk_index: fact.chunk_index,
        source_id: fact.source_id,
        source_file_name: fact.source_file_name,
        speaker_role: fact.speaker_role,
        speaker_name: fact.speaker_name,
        fact_type: fact.fact_type,
        fact_domain: fact.fact_domain,
        value_text: fact.value_text,
        value_number: fact.value_number,
        value_boolean: fact.value_boolean,
        value_date: fact.value_date,
        value_time: fact.value_time,
        value_datetime: fact.value_datetime,
        currency: fact.currency,
        unit: fact.unit,
        direction: fact.direction,
        status: fact.status,
        confidence: fact.confidence,
        extraction_reason: fact.extraction_reason,
        raw_snippet: fact.raw_snippet,
        raw_snippet_start: fact.raw_snippet_start,
        raw_snippet_end: fact.raw_snippet_end,
      })),
    });

    if (error) {
      logger.error('Failed to insert import facts', { jobId, error });
      return { count: 0, error: error.message };
    }

    const count = typeof data === 'number' ? data : 0;
    logger.info('Import facts inserted', { jobId, count });
    return { count };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception inserting import facts', { jobId, error: err });
    return { count: 0, error: message };
  }
}

// =============================================================================
// Get Facts (for Stage 2)
// =============================================================================

/**
 * Get all facts for a job, ordered by message_index
 */
export async function getImportFacts(
  supabase: SupabaseClientLike,
  jobId: string
): Promise<{ facts: ImportFact[]; error?: string }> {
  logger.info('Getting import facts', { jobId });

  try {
    const { data, error } = await (supabase as any).rpc('app_get_import_facts', {
      p_job_id: jobId,
    });

    if (error) {
      logger.error('Failed to get import facts', { jobId, error });
      return { facts: [], error: error.message };
    }

    const facts = (data || []) as ImportFact[];
    logger.info('Import facts retrieved', { jobId, count: facts.length });
    return { facts };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception getting import facts', { jobId, error: err });
    return { facts: [], error: message };
  }
}

// =============================================================================
// Select Facts (Stage 2)
// =============================================================================

/**
 * Mark facts as selected and record resolution decisions
 */
export async function selectImportFacts(
  supabase: SupabaseClientLike,
  jobId: string,
  resolutions: FactResolution[]
): Promise<{ count: number; error?: string }> {
  if (resolutions.length === 0) {
    return { count: 0 };
  }

  logger.info('Selecting import facts', {
    jobId,
    resolutions: resolutions.length,
    selected: resolutions.filter(r => r.selected_fact_id).length,
  });

  try {
    const { data, error } = await (supabase as any).rpc('app_select_import_facts', {
      p_job_id: jobId,
      p_selections: resolutions.map(r => ({
        fact_id: r.selected_fact_id,
        fact_type: r.fact_type,
        fact_domain: r.fact_domain,
        state: r.state,
        reason: r.reason,
        final_value_text: r.final_value_text,
        final_value_number: r.final_value_number,
        final_value_date: r.final_value_date,
        reasoning_trace: r.reasoning_trace,
      })),
    });

    if (error) {
      logger.error('Failed to select import facts', { jobId, error });
      return { count: 0, error: error.message };
    }

    const count = typeof data === 'number' ? data : 0;
    logger.info('Import facts selected', { jobId, count });
    return { count };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception selecting import facts', { jobId, error: err });
    return { count: 0, error: message };
  }
}

// =============================================================================
// Update Job Stage
// =============================================================================

/**
 * Update the extraction stage of a job
 */
export async function updateImportJobStage(
  supabase: SupabaseClientLike,
  jobId: string,
  stage: ExtractionStage,
  options?: {
    factsExtractedAt?: Date;
    resolutionCompletedAt?: Date;
  }
): Promise<{ success: boolean; error?: string }> {
  logger.info('Updating import job stage', { jobId, stage });

  try {
    const { data, error } = await (supabase as any).rpc('app_update_import_job_stage', {
      p_job_id: jobId,
      p_stage: stage,
      p_facts_extracted_at: options?.factsExtractedAt?.toISOString() ?? null,
      p_resolution_completed_at: options?.resolutionCompletedAt?.toISOString() ?? null,
    });

    if (error) {
      logger.error('Failed to update import job stage', { jobId, stage, error });
      return { success: false, error: error.message };
    }

    logger.info('Import job stage updated', { jobId, stage });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception updating import job stage', { jobId, error: err });
    return { success: false, error: message };
  }
}

// =============================================================================
// Get Resolutions
// =============================================================================

/**
 * Get all resolution decisions for a job
 */
export async function getImportResolutions(
  supabase: SupabaseClientLike,
  jobId: string
): Promise<{ resolutions: FactResolution[]; error?: string }> {
  logger.info('Getting import resolutions', { jobId });

  try {
    const { data, error } = await (supabase as any).rpc('app_get_import_resolutions', {
      p_job_id: jobId,
    });

    if (error) {
      logger.error('Failed to get import resolutions', { jobId, error });
      return { resolutions: [], error: error.message };
    }

    // Map database rows to FactResolution type
    const resolutions: FactResolution[] = (data || []).map((row: any) => ({
      fact_type: row.fact_type,
      fact_domain: row.fact_domain,
      selected_fact_id: row.selected_fact_id,
      state: row.resolution_state,
      reason: row.resolution_reason,
      final_value_text: row.final_value_text,
      final_value_number: row.final_value_number,
      final_value_date: row.final_value_date,
      reasoning_trace: row.reasoning_trace,
    }));

    logger.info('Import resolutions retrieved', { jobId, count: resolutions.length });
    return { resolutions };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception getting import resolutions', { jobId, error: err });
    return { resolutions: [], error: message };
  }
}
