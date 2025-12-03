/**
 * Confidence Computation for Resolution
 * 
 * Computes confidence based on objective signals, not just model self-reporting.
 */

import type { ImportFact, FactResolution } from '../types';
import {
    STATUS_PRIORITY,
    isRejectedStatus,
    getEffectiveSpeakerAuthority,
} from '../types';
import { getSourceScopePriority } from './rules';

// FactGroup interface (duplicated here to avoid circular deps)
interface FactGroup {
    fact_type: string;
    fact_domain: string | null;
    facts: ImportFact[];
}

/**
 * Compute confidence for a fact based on objective signals, not just model output.
 * This replaces blind trust in model confidence with computed confidence.
 */
export function computeFactConfidence(
    fact: ImportFact,
    allFacts: ImportFact[],
    group: FactGroup
): number {
    let confidence = 0.3; // Base confidence

    // Source scope weighting
    confidence += (getSourceScopePriority(fact.source_scope) / 100) * 0.1;

    // 1. Status-based confidence boost
    if (fact.status === 'accepted' || fact.status === 'final') {
        confidence += 0.4; // Explicit acceptance is high confidence
    } else if (fact.status === 'info') {
        confidence += 0.2;
    } else if (fact.status === 'offer') {
        confidence += 0.1;
    }

    // 2. Speaker authority boost
    const speakerAuthority = getEffectiveSpeakerAuthority(fact.speaker_role, fact.fact_type);
    confidence += (speakerAuthority / 100) * 0.15; // Up to 0.15 boost

    // 3. Repetition boost - same value mentioned multiple times
    const sameValueFacts = group.facts.filter(f => {
        if (fact.value_number !== undefined && f.value_number !== undefined) {
            return f.value_number === fact.value_number;
        }
        if (fact.value_text && f.value_text) {
            return f.value_text.toLowerCase().trim() === fact.value_text.toLowerCase().trim();
        }
        return false;
    });
    if (sameValueFacts.length > 1) {
        confidence += Math.min(0.15, (sameValueFacts.length - 1) * 0.05);
    }

    // 4. Contradiction penalty - if this fact contradicts later facts
    const laterFacts = group.facts.filter(f => f.message_index > fact.message_index);
    const hasContradiction = laterFacts.some(f => {
        // Different values with higher status
        const differentValue = (
            (fact.value_number !== undefined && f.value_number !== undefined && f.value_number !== fact.value_number) ||
            (fact.value_text && f.value_text && f.value_text.toLowerCase() !== fact.value_text.toLowerCase())
        );
        return differentValue && STATUS_PRIORITY[f.status] >= STATUS_PRIORITY[fact.status];
    });
    if (hasContradiction) {
        confidence -= 0.2;
    }

    // 5. Explicit rejection penalty - if this value was rejected later
    const wasRejected = laterFacts.some(f =>
        isRejectedStatus(f.status) &&
        f.message_index > fact.message_index
    );
    if (wasRejected) {
        confidence -= 0.3;
    }

    // 6. Confirmation phrase boost (based on raw snippet)
    const snippet = (fact.raw_snippet || '').toLowerCase();
    const confirmationPhrases = [
        'agreed', 'confirmed', 'accepted', 'deal', 'perfect', 'sounds good',
        'that works', 'let\'s do it', 'approved', 'signed off',
    ];
    if (confirmationPhrases.some(phrase => snippet.includes(phrase))) {
        confidence += 0.15;
    }

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, confidence));
}

/**
 * Compute confidence for a resolution decision.
 */
export function computeResolutionConfidence(
    resolution: FactResolution,
    selectedFact: ImportFact | null,
    group: FactGroup
): number {
    if (!selectedFact) {
        // Unresolved states have moderate confidence (we're confident there's no resolution)
        return resolution.state === 'missing' ? 0.8 : 0.6;
    }

    // Base on fact confidence
    let confidence = computeFactConfidence(selectedFact, group.facts, group);

    // Boost if multiple facts point to same value
    const sameValueCount = group.facts.filter(f => {
        if (selectedFact.value_number !== undefined && f.value_number !== undefined) {
            return f.value_number === selectedFact.value_number;
        }
        return false;
    }).length;

    if (sameValueCount > 1) {
        confidence += 0.1;
    }

    // Boost if no contradicting facts exist
    const hasContradictions = group.facts.some(f =>
        f.id !== selectedFact.id &&
        !isRejectedStatus(f.status) &&
        ((f.value_number !== undefined && selectedFact.value_number !== undefined && f.value_number !== selectedFact.value_number) ||
            (f.value_text && selectedFact.value_text && f.value_text !== selectedFact.value_text))
    );

    if (!hasContradictions) {
        confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
}
