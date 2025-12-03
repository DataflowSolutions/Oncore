/**
 * Post-Processing for Extracted Facts
 * 
 * Re-exports from modular submodules for backward compatibility.
 * This file maintains the same API while delegating to focused sub-modules.
 */

export { postProcessExtractedFacts, deriveFactsFromFlightDirection, postProcessAllFacts } from './post-process/index';
export { IATA_TO_CITY } from './post-process/constants';
export { parseFlightDirection } from './post-process/utils';
