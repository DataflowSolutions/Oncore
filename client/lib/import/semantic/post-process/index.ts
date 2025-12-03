/**
 * Post-Processing Main Pipeline
 * 
 * Orchestrates pattern matching across all domains
 */

import { logger } from '@/lib/logger';
import { logPostProcessSkip, dumpPostProcessing } from '../diagnostics';
import type { ExtractedFact } from '../types';
import { hasFactInDomain } from './utils';
import { IATA_TO_CITY } from './constants';
import { parseFlightDirection } from './utils';

// Import pattern matchers
import { matchFlightPatterns } from './patterns/flight-patterns';
import { matchContactPatterns } from './patterns/contact-patterns';
import { matchHotelPatterns } from './patterns/hotel-patterns';
import { matchGeneralPatterns } from './patterns/general-patterns';

/**
 * Post-process extracted facts to upgrade "other" facts into structured types.
 * 
 * This uses deterministic pattern matching to catch common structured data
 * that LLMs often miss or misclassify.
 */
export function postProcessExtractedFacts(facts: ExtractedFact[], jobId?: string): ExtractedFact[] {
    const updated = [...facts];
    let upgradeCount = 0;

    logger.info('Post-processing extracted facts', { totalFacts: facts.length });

    for (const fact of updated) {
        if (fact.fact_type !== 'other') continue;

        // Try each pattern matcher in order
        const matched =
            matchFlightPatterns(fact) ||
            matchGeneralPatterns(fact, updated) ||
            matchHotelPatterns(fact) ||
            matchContactPatterns(fact);

        if (matched) {
            upgradeCount++;
        } else {
            // No pattern matched - log skip
            logPostProcessSkip(fact, 'no_pattern_match');
        }
    }

    logger.info('Post-processing complete', {
        totalFacts: facts.length,
        upgradedFacts: upgradeCount,
        upgradeRate: `${((upgradeCount / facts.length) * 100).toFixed(1)}%`,
    });

    if (jobId) {
        dumpPostProcessing(jobId);
    }

    return updated;
}

/**
 * Derive additional facts from flight_direction values.
 * 
 * This parses "DPS to ARN via IST" style directions to populate
 * fromAirport, toAirport, fromCity, toCity when missing.
 */
export function deriveFactsFromFlightDirection(facts: ExtractedFact[]): ExtractedFact[] {
    const updated = [...facts];
    const derived: ExtractedFact[] = [];

    for (const fact of facts) {
        // Note: flight_direction is not in the current fact types, so this won't match
        // This function is kept for potential future use
        if (!fact.value_text) continue;

        const parsed = parseFlightDirection(fact.value_text);
        if (!parsed) continue;

        const domain = fact.fact_domain || 'flight_leg_1';

        // Add derived facts for airports and cities
        // (Implementation would go here if needed)
    }

    if (derived.length > 0) {
        logger.info('Derived facts from flight_direction', { derivedCount: derived.length });
        updated.push(...derived);
    }

    return updated;
}

/**
 * Full post-processing pipeline.
 * 
 * Applies all post-processing steps in order:
 * 1. Upgrade "other" facts to structured types
 * 2. Derive additional facts from flight_direction
 */
export function postProcessAllFacts(facts: ExtractedFact[], jobId?: string): ExtractedFact[] {
    let processed = postProcessExtractedFacts(facts, jobId);
    processed = deriveFactsFromFlightDirection(processed);
    return processed;
}
