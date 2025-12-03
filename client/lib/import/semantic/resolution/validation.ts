/**
 * Resolution Validation
 * 
 * Validates LLM-generated resolutions against hard rules and auto-corrects
 * invalid states.
 */

import { logger } from '@/lib/logger';
import type { ImportFact, FactResolution } from '../types';
import { isFinalizableStatus } from '../types';
import {
    normalizeEventDateToISO,
    assertFactIsSelectable,
    assertValidResolutionState,
} from './rules';
import { computeResolutionConfidence } from './confidence';
import { groupFactsForResolution, type FactGroup } from './grouping';

/**
 * Validate and auto-correct resolutions against business rules
 */
export function validateResolutions(
    resolutions: FactResolution[],
    facts: ImportFact[],
    warnings: string[]
): FactResolution[] {
    const factsById = new Map(facts.map(f => [f.id, f]));
    const factGroups = groupFactsForResolution(facts);
    const groupsByKey = new Map(factGroups.map(g => [`${g.fact_type}|${g.fact_domain || ''}`, g]));

    return resolutions.map(resolution => {
        const selectedFact = resolution.selected_fact_id
            ? factsById.get(resolution.selected_fact_id) || null
            : null;

        const context = `${resolution.fact_type}:${resolution.fact_domain || 'null'}`;
        const groupKey = `${resolution.fact_type}|${resolution.fact_domain || ''}`;
        const group = groupsByKey.get(groupKey);

        // HARD RULE 1: If fact selected, it must be selectable
        if (selectedFact) {
            try {
                assertFactIsSelectable(selectedFact, context);
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                warnings.push(msg);
                return {
                    ...resolution,
                    selected_fact_id: null,
                    state: 'unagreed',
                    reason: `LLM selected invalid fact - ${msg}`,
                };
            }
        }

        // HARD RULE 2: Validate resolution state
        try {
            assertValidResolutionState(resolution, selectedFact, context);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            warnings.push(msg);

            // Auto-correct state based on the selected fact
            if (selectedFact && isFinalizableStatus(selectedFact.status)) {
                const normalizedDate = resolution.fact_type === 'general_date'
                    ? normalizeEventDateToISO(selectedFact.value_date || selectedFact.value_text)
                    : undefined;

                return {
                    ...resolution,
                    fact_domain: resolution.fact_domain ?? group?.fact_domain ?? undefined,
                    state: 'resolved',
                    reason: `LLM state corrected: fact is ${selectedFact.status}`,
                    final_value_text: selectedFact.value_text,
                    final_value_number: selectedFact.value_number,
                    final_value_date: normalizedDate ?? selectedFact.value_date,
                };
            } else {
                return {
                    ...resolution,
                    selected_fact_id: null,
                    state: resolution.state === 'missing' ? 'missing' : 'unagreed',
                    reason: `LLM state corrected - ${msg}`,
                };
            }
        }

        // Compute confidence if missing
        if (resolution.confidence === undefined && group) {
            const confidence = computeResolutionConfidence(resolution, selectedFact, group);
            return { ...resolution, confidence };
        }

        return resolution;
    });
}
