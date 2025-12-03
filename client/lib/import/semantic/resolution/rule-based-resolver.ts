/**
 * Rule-Based Resolution (Fallback)
 * 
 * Deterministic fallback resolver when LLM resolution fails or is unavailable.
 * Uses hard status rules, speaker authority, and computed confidence.
 */

import { logger } from '@/lib/logger';
import type {
    FactResolution,
    ImportFact,
    ReasoningStep,
} from '../types';
import {
    isSelectableStatus,
    isFinalizableStatus,
    getEffectiveSpeakerAuthority,
} from '../types';
import { getSourceScopePriority, normalizeEventDateToISO } from './rules';
import { computeFactConfidence } from './confidence';
import type { FactGroup } from './grouping';

/**
 * Apply rule-based resolution for a fact group.
 * This is used as a fallback if LLM resolution fails.
 * 
 * Uses:
 * - Hard status rules (rejected/question NEVER selectable)
 * - Speaker authority weighting
 * - Computed confidence (not model self-reporting)
 */
export function resolveFactGroupByRules(group: FactGroup): FactResolution {
    const { fact_type, fact_domain, facts } = group;
    const reasoning: ReasoningStep[] = [];

    reasoning.push({
        step: 1,
        action: 'Analyzing fact group',
        observation: `Found ${facts.length} facts of type ${fact_type}`,
    });

    // Filter to selectable facts only (HARD RULE: rejected/question/withdrawn never selectable)
    const selectableFacts = facts.filter(f => isSelectableStatus(f.status));

    if (selectableFacts.length === 0) {
        reasoning.push({
            step: 2,
            action: 'Check for selectable facts',
            observation: 'No selectable facts (all rejected/withdrawn/question)',
            conclusion: 'No valid facts remain',
        });

        return {
            fact_type,
            fact_domain: fact_domain || undefined,
            selected_fact_id: null,
            state: 'unagreed',
            reason: 'All facts were rejected, withdrawn, or questions',
            reasoning_trace: reasoning,
            confidence: 0.8, // High confidence in the "no resolution" outcome
        };
    }

    reasoning.push({
        step: 2,
        action: 'Filter to selectable facts',
        observation: `${selectableFacts.length} selectable facts remain`,
    });

    // Look for accepted/final facts (HARD RULE: only these can produce 'resolved' state)
    const finalized = selectableFacts.filter(f => isFinalizableStatus(f.status));

    if (finalized.length > 0) {
        // Sort by: 1) Source scope 2) Speaker authority (desc), 3) Computed confidence (desc), 4) Message index (latest)
        finalized.sort((a, b) => {
            const aScope = getSourceScopePriority(a.source_scope);
            const bScope = getSourceScopePriority(b.source_scope);
            if (bScope !== aScope) return bScope - aScope;

            // First: speaker authority for this fact type
            const aAuth = getEffectiveSpeakerAuthority(a.speaker_role, a.fact_type);
            const bAuth = getEffectiveSpeakerAuthority(b.speaker_role, b.fact_type);
            if (bAuth !== aAuth) return bAuth - aAuth;

            // Second: computed confidence
            const aConf = computeFactConfidence(a, facts, group);
            const bConf = computeFactConfidence(b, facts, group);
            if (bConf !== aConf) return bConf - aConf;

            // Third: message index (latest wins on tie)
            return b.message_index - a.message_index;
        });

        const selected = finalized[0];
        const speakerAuth = getEffectiveSpeakerAuthority(selected.speaker_role, selected.fact_type);
        const factConf = computeFactConfidence(selected, facts, group);

        reasoning.push({
            step: 3,
            action: 'Found accepted/final fact(s)',
            observation: `Selected fact ${selected.id} (speaker: ${selected.speaker_role}, authority: ${speakerAuth}, confidence: ${factConf.toFixed(2)})`,
            conclusion: `Final value: ${selected.value_text || selected.value_number}`,
        });

        const normalizedDate = selected.fact_type === 'general_date'
            ? normalizeEventDateToISO(selected.value_date || selected.value_text)
            : undefined;

        return {
            fact_type,
            fact_domain: fact_domain || undefined,
            selected_fact_id: selected.id,
            state: 'resolved',
            reason: `Accepted/final fact from ${selected.speaker_role} (authority: ${speakerAuth})`,
            final_value_text: selected.value_text,
            final_value_number: selected.value_number,
            final_value_date: normalizedDate || selected.value_date,
            reasoning_trace: reasoning,
            confidence: factConf,
        };
    }

    reasoning.push({
        step: 3,
        action: 'Check for accepted facts',
        observation: 'No accepted/final facts found',
    });

    // Check if we have offers/counter-offers but no acceptance
    const negotiating = selectableFacts.filter(
        f => f.status === 'offer' || f.status === 'counter_offer'
    );

    // Check for info-only facts
    const infoFacts = selectableFacts.filter(f => f.status === 'info' || f.status === 'unknown');

    // Check for evidence of active negotiation:
    // - Counter-offers indicate back-and-forth
    // - Rejected facts (in the original group, not selectable) indicate negotiation
    const counterOffers = selectableFacts.filter(f => f.status === 'counter_offer');
    const pureOffers = selectableFacts.filter(f => f.status === 'offer');
    const hasRejected = facts.some(f => f.status === 'rejected' || f.status === 'withdrawn');

    // If there's evidence of negotiation (counter-offers OR rejected facts), mark as unagreed
    if (negotiating.length > 0 && (counterOffers.length > 0 || hasRejected)) {
        // This looks like an actual negotiation with back-and-forth
        reasoning.push({
            step: 4,
            action: 'Check negotiation state',
            observation: `Found ${negotiating.length} offers/counter-offers without acceptance` +
                (hasRejected ? ' (some facts were rejected)' : ''),
            conclusion: 'Negotiation incomplete - marking as unagreed',
        });

        return {
            fact_type,
            fact_domain: fact_domain || undefined,
            selected_fact_id: null,
            state: 'unagreed',
            reason: 'Offers exist but no acceptance found - negotiation incomplete',
            reasoning_trace: reasoning,
            confidence: 0.7, // Confident about incomplete negotiation
        };
    }

    // If we have only pure offers (no counter-offers, no rejections) OR info facts,
    // treat as informational data from a confirmation document
    const informationalFacts = [...infoFacts, ...pureOffers];

    if (informationalFacts.length > 0) {
        // For info/offer facts without negotiation, sort by computed confidence
        informationalFacts.sort((a, b) => {
            const aScope = getSourceScopePriority(a.source_scope);
            const bScope = getSourceScopePriority(b.source_scope);
            if (bScope !== aScope) return bScope - aScope;

            const aConf = computeFactConfidence(a, facts, group);
            const bConf = computeFactConfidence(b, facts, group);
            return bConf - aConf;
        });
        const selected = informationalFacts[0];
        const factConf = computeFactConfidence(selected, facts, group);

        const normalizedDate = selected.fact_type === 'general_date'
            ? normalizeEventDateToISO(selected.value_date || selected.value_text)
            : undefined;

        reasoning.push({
            step: 4,
            action: 'Found informational facts',
            observation: `Selecting highest computed confidence fact (status: ${selected.status}, confidence: ${factConf.toFixed(2)})`,
            conclusion: `Informational value: ${selected.value_text || selected.value_number}`,
        });

        return {
            fact_type,
            fact_domain: fact_domain || undefined,
            selected_fact_id: selected.id,
            state: 'informational',
            reason: `Informational fact selected (${selected.status === 'offer' ? 'single offer treated as confirmed' : 'no negotiation involved'})`,
            final_value_text: selected.value_text,
            final_value_number: selected.value_number,
            final_value_date: normalizedDate || selected.value_date,
            reasoning_trace: reasoning,
            confidence: factConf,
        };
    }

    // No usable facts
    reasoning.push({
        step: 4,
        action: 'Final check',
        observation: 'No usable facts found',
        conclusion: 'Marking as missing',
    });

    return {
        fact_type,
        fact_domain: fact_domain || undefined,
        selected_fact_id: null,
        state: 'missing',
        reason: 'No valid facts found for this type',
        reasoning_trace: reasoning,
        confidence: 0.8, // High confidence in the "missing" outcome
    };
}
