/**
 * Stage 1: Candidate Fact Extraction
 * 
 * Re-exports from modular submodules for backward compatibility.
 * This file maintains the same API while delegating to focused sub-modules.
 */

export { extractFactsFromChunk, extractFactsFromSource } from './fact-extraction/index';
export { callFactExtractionLLM } from './fact-extraction/llm-client';
export { parseLLMFacts } from './fact-extraction/validation';
export {
  normalizeFactType,
  normalizeDirection,
  normalizeStatus,
  normalizeSpeakerRole,
  normalizeSourceScope,
  inferSourceScopeFromFilename,
} from './fact-extraction/normalization';
export { upgradeFactStatusesFromFilename } from './fact-extraction/upgrades';
