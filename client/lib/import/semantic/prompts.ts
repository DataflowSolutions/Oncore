/**
 * Semantic Import - LLM Prompts
 * 
 * Re-exports from modular submodules for backward compatibility.
 */

import { generateFactTypeList } from './prompts/utils';
import { getFactExtractionSystemPrompt } from './prompts/fact-extraction-system';
import { getFactExtractionUserPrompt } from './prompts/fact-extraction-user';

export { generateFactTypeList, getFactExtractionSystemPrompt, getFactExtractionUserPrompt };

export const PROMPTS = {
  factExtraction: {
    system: getFactExtractionSystemPrompt,
    user: getFactExtractionUserPrompt,
  },
} as const;
