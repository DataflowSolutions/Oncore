/**
 * Semantic Import Module
 * 
 * Two-stage pipeline for intelligent import extraction:
 * - Stage 1: Extract candidate facts (per chunk)
 * - Stage 2: Semantic resolution (global reasoning)
 */

// Types
export type {
  ImportFactType,
  ImportFactDirection,
  ImportFactStatus,
  ImportFactSpeaker,
  ExtractionStage,
  ExtractedFact,
  ImportFact,
  FactExtractionRequest,
  FactExtractionResult,
  ResolutionState,
  FactResolution,
  ReasoningStep,
  ResolutionRequest,
  ResolutionResult,
} from './types';

export {
  FACT_TYPE_TO_IMPORT_FIELD,
  getFactTypesForSection,
  isArrayFactType,
  getArrayKeyForFactType,
  getFieldNameForFactType,
  getSectionFromFactType,
  STATUS_PRIORITY,
  isFinalizableStatus,
  isRejectedStatus,
  isSelectableStatus,
  SPEAKER_AUTHORITY,
  speakerHasAuthority,
  getEffectiveSpeakerAuthority,
} from './types';

// Fact Extraction (Stage 1)
export {
  extractFactsFromChunk,
  extractFactsFromSource,
} from './fact-extraction';

// Resolution (Stage 2)
export {
  resolveImportFacts,
  summarizeResolutions,
} from './resolution';

// Database Operations
export {
  insertImportFacts,
  getImportFacts,
  selectImportFacts,
  updateImportJobStage,
  getImportResolutions,
} from './db';

// Orchestrator
export type {
  SemanticExtractionProgress,
  SemanticProgressCallback,
  SemanticExtractionResult,
} from './types-public';

export {
  runSemanticImport,
  applyResolutionsToImportData,
} from './orchestrator';
