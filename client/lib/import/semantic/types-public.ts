/**
 * Public Types
 * 
 * Types exposed by the orchestrator module.
 */

import type { ImportData } from '@/components/import/types';
import type { FactResolution } from './types';

// =============================================================================
// Progress Tracking
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

// =============================================================================
// Results
// =============================================================================

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
