/**
 * Stage 2: Semantic Resolution
 * 
 * This module performs global reasoning over all extracted facts
 * to determine the canonical truth for each fact type/domain.
 * 
 * Fully modularized - orchestrates resolution using specialized sub-modules.
 */

import { logger } from '@/lib/logger';
import type {
    FactResolution,
    ResolutionRequest,
    ResolutionResult,
} from './types';

// Import from modular sub-files
import { normalizeEventDateToISO } from './resolution/rules';
import { normalizeFlightFactDomains, groupFactsForResolution } from './resolution/grouping';
import { resolveFactGroupByRules } from './resolution/rule-based-resolver';
import { resolveFactsWithLLM } from './resolution/llm-resolver';
import { validateResolutions } from './resolution/validation';

// =============================================================================
// Main Resolution Function
// =============================================================================

/**
 * Perform semantic resolution over all facts for a job.
 * This is Stage 2 of the semantic import pipeline.
 */
export async function resolveImportFacts(
    request: ResolutionRequest
): Promise<ResolutionResult> {
    const { job_id, facts } = request;

    logger.info('Semantic resolution starting', {
        job_id,
        total_facts: facts.length,
    });

    if (facts.length === 0) {
        logger.info('No facts to resolve', { job_id });
        return {
            resolutions: [],
            selected_fact_ids: [],
        };
    }

    // Normalize flight domains up front so grouping and prompts stay consistent
    const factsForResolution = normalizeFlightFactDomains(facts);

    // Group facts by type and domain
    const groups = groupFactsForResolution(factsForResolution);

    logger.info('Facts grouped for resolution', {
        job_id,
        groups: groups.map(g => ({
            type: g.fact_type,
            domain: g.fact_domain,
            count: g.facts.length,
        })),
    });

    // Try LLM resolution first
    const llmResult = await resolveFactsWithLLM(factsForResolution, job_id);

    let resolutions: FactResolution[] = [];
    const warnings: string[] = [];

    if (llmResult.error) {
        warnings.push(`LLM resolution failed: ${llmResult.error}`);
        
        // Fall back to rule-based resolution
        resolutions = groups.map(group => resolveFactGroupByRules(group));
    } else {
        resolutions = llmResult.resolutions;

        // Fill in any missing groups with rule-based resolution
        const resolvedTypes = new Set(resolutions.map(r => `${r.fact_type}|${r.fact_domain || ''}`));

        for (const group of groups) {
            const key = `${group.fact_type}|${group.fact_domain || ''}`;
            if (!resolvedTypes.has(key)) {
                logger.info('LLM missed fact group, applying rules', {
                    job_id,
                    fact_type: group.fact_type,
                    fact_domain: group.fact_domain,
                });
                resolutions.push(resolveFactGroupByRules(group));
            }
        }
    }

    // Normalize event_date strings to ISO when possible (for downstream mapping)
    resolutions = resolutions.map(resolution => {
        if (resolution.fact_type !== 'general_date') return resolution;
        const normalizedDate = normalizeEventDateToISO(
            resolution.final_value_date || resolution.final_value_text || null
        );
        if (normalizedDate && normalizedDate !== resolution.final_value_date) {
            return { ...resolution, final_value_date: normalizedDate };
        }
        return resolution;
    });

    // Validate resolutions against rules
    resolutions = validateResolutions(resolutions, factsForResolution, warnings);

    // Collect selected fact IDs
    const selected_fact_ids = resolutions
        .filter(r => r.selected_fact_id !== null)
        .map(r => r.selected_fact_id as string);

    logger.info('Semantic resolution complete', {
        job_id,
        resolutions: resolutions.length,
        selected: selected_fact_ids.length,
        warnings: warnings.length,
    });

    return {
        resolutions,
        selected_fact_ids,
        warnings: warnings.length > 0 ? warnings : undefined,
    };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get a human-readable summary of resolution results
 */
export function summarizeResolutions(resolutions: FactResolution[]): string {
    const resolved = resolutions.filter(r => r.state === 'resolved');
    const unagreed = resolutions.filter(r => r.state === 'unagreed');
    const info = resolutions.filter(r => r.state === 'informational');
    const missing = resolutions.filter(r => r.state === 'missing');

    const lines = [
        `Resolution Summary:`,
        `- Resolved: ${resolved.length}`,
        `- Unagreed (negotiation incomplete): ${unagreed.length}`,
        `- Informational: ${info.length}`,
        `- Missing: ${missing.length}`,
    ];

    if (resolved.length > 0) {
        lines.push('', 'Resolved values:');
        for (const r of resolved) {
            const value = r.final_value_text || r.final_value_number || r.final_value_date;
            lines.push(`  - ${r.fact_type}: ${value} (${r.reason})`);
        }
    }

    if (unagreed.length > 0) {
        lines.push('', 'Unagreed (needs resolution):');
        for (const r of unagreed) {
            lines.push(`  - ${r.fact_type}: ${r.reason}`);
        }
    }

    return lines.join('\n');
}
