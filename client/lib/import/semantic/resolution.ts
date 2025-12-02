/**
 * Stage 2: Semantic Resolution
 * 
 * This module performs global reasoning over all extracted facts
 * to determine the canonical truth for each fact type/domain.
 * 
 * Rules enforced:
 * - Latest ≠ correct (respects negotiation flow)
 * - Accepted > offered > informational
 * - Rejected facts can never become final
 * - Different cost domains never compete
 * - Missing acceptance = unresolved state
 * - When uncertain → leave field unset, not guessed
 */

import { logger } from '@/lib/logger';
import type {
  ImportFact,
  FactResolution,
  ResolutionRequest,
  ResolutionResult,
  ResolutionState,
  ImportFactType,
  ImportFactStatus,
  ReasoningStep,
  ImportSourceScope,
} from './types';
import {
  STATUS_PRIORITY,
  isFinalizableStatus,
  isRejectedStatus,
  isSelectableStatus,
  NEVER_SELECTABLE_STATUSES,
  getEffectiveSpeakerAuthority,
  speakerHasAuthority,
  getSectionFromFactType,
} from './types';

// =============================================================================
// HARD SERVER-SIDE RULES (LLM cannot override these)
// =============================================================================

// Source scope priority for provenance weighting (higher = more trusted)
const SOURCE_SCOPE_PRIORITY: Record<ImportSourceScope, number> = {
  contract_main: 100,
  itinerary: 90,
  confirmation: 85,
  general_info: 50,
  rider_example: 20,
  unknown: 10,
};

function getSourceScopePriority(scope?: ImportSourceScope): number {
  if (!scope) return SOURCE_SCOPE_PRIORITY.unknown;
  return SOURCE_SCOPE_PRIORITY[scope] ?? SOURCE_SCOPE_PRIORITY.unknown;
}

/**
 * Normalize common date formats to ISO YYYY-MM-DD.
 */
function normalizeEventDateToISO(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // Already ISO-like
  const isoMatch = raw.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  // DD Mon YYYY or DD Month YYYY
  const monthNames: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  const ddMonY = raw.match(/^(\d{1,2})[\s\.\-\/](\w+)[\s\.\-\/](\d{4})$/);
  if (ddMonY) {
    const [ , d, mon, y ] = ddMonY;
    const mm = monthNames[mon.toLowerCase()];
    if (mm) {
      const dd = d.padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
  }

  // Month DD, YYYY
  const monDdY = raw.match(/^(\w+)[\s]+(\d{1,2}),[\s]*(\d{4})$/);
  if (monDdY) {
    const [, mon, d, y] = monDdY;
    const mm = monthNames[mon.toLowerCase()];
    if (mm) {
      const dd = d.padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
  }

  // DD.MM.YYYY
  const dotted = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    const [, d, m, y] = dotted;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  return null;
}

/**
 * Server-side assertion: A fact can be selected.
 * Throws if the fact violates hard rules.
 */
function assertFactIsSelectable(fact: ImportFact, context: string): void {
  // HARD RULE 1: Rejected/withdrawn/question facts can NEVER be selected
  if (!isSelectableStatus(fact.status)) {
    throw new Error(
      `HARD RULE VIOLATION [${context}]: Cannot select fact ${fact.id} with status '${fact.status}'. ` +
      `Statuses ${NEVER_SELECTABLE_STATUSES.join(', ')} can NEVER be selected.`
    );
  }
}

/**
 * Server-side assertion: Resolution state is valid for the selection.
 */
function assertValidResolutionState(
  resolution: FactResolution,
  selectedFact: ImportFact | null,
  context: string
): void {
  // If state is 'resolved', we MUST have a selected fact
  if (resolution.state === 'resolved' && !selectedFact) {
    throw new Error(
      `HARD RULE VIOLATION [${context}]: Resolution state is 'resolved' but no fact was selected.`
    );
  }
  
  // If state is 'resolved', the selected fact MUST be accepted/final
  if (resolution.state === 'resolved' && selectedFact && !isFinalizableStatus(selectedFact.status)) {
    throw new Error(
      `HARD RULE VIOLATION [${context}]: Resolution state is 'resolved' but selected fact ` +
      `has status '${selectedFact.status}'. Only 'accepted' or 'final' can be resolved.`
    );
  }
  
  // If state is 'unagreed' or 'missing', we must NOT have a selected fact
  if ((resolution.state === 'unagreed' || resolution.state === 'missing') && selectedFact) {
    throw new Error(
      `HARD RULE VIOLATION [${context}]: Resolution state is '${resolution.state}' ` +
      `but a fact was selected. Unresolved states must not write to canonical tables.`
    );
  }
}

// =============================================================================
// Computed Confidence (not model self-reporting)
// =============================================================================

/**
 * Compute confidence for a fact based on objective signals, not just model output.
 * This replaces blind trust in model confidence with computed confidence.
 */
function computeFactConfidence(
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
function computeResolutionConfidence(
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

// =============================================================================
// LLM Prompts for Semantic Resolution
// =============================================================================

const RESOLUTION_SYSTEM_PROMPT = `You are an expert at analyzing negotiation threads and determining the final agreed state.
You must respond with valid JSON only.

Your task is to review ALL extracted facts and determine:
1. Which facts represent the FINAL AGREED state (if any)
2. Which facts were superseded by counter-offers or rejections
3. Which fact domains remain UNRESOLVED (offers made but not accepted)

AVAILABLE STATES - choose the right one:
- "resolved" = Agreement reached. REQUIRES a fact with status="accepted" or "final"
- "unagreed" = Active negotiation but no agreement. Use when counter-offers or rejections exist but no acceptance
- "informational" = Data record without negotiation. Use for single offers/info WITHOUT counter-offers or rejections
- "missing" = No facts found for this type

CRITICAL SERVER-ENFORCED RULES:
1. state="resolved" REQUIRES selected_fact_id pointing to a fact with status "accepted" or "final"
2. REJECTED/WITHDRAWN facts can NEVER be selected - ignore them
3. Different cost domains (artist_fee vs venue_cost) are COMPLETELY SEPARATE
4. Single offers WITHOUT negotiation context (no counter-offers, no rejections) = "informational", NOT "unagreed"

OUTPUT FORMAT (respond with JSON only):
{
  "resolutions": [
    {
      "fact_type": "artist_fee",
      "fact_domain": null,
      "selected_fact_id": "uuid-of-the-ACCEPTED-fact",
      "state": "resolved",
      "reason": "Explicit acceptance found"
    },
    {
      "fact_type": "venue_cost",
      "selected_fact_id": "uuid-of-info-fact",
      "state": "informational",
      "reason": "Single info fact, no negotiation context"
    }
  ]
}`;

const RESOLUTION_USER_PROMPT = `Analyze the following extracted facts and determine the final resolved state for each fact type.
Respond with JSON containing your resolutions.

IMPORTANT - Read the "status" field of each fact:
- If a fact has status="accepted" or status="final" → it CAN be selected, use state="resolved"
- If a fact has status="rejected" or status="withdrawn" → NEVER select it, ignore completely

STATE DECISION LOGIC:
1. If ANY fact has status="accepted" or "final" → state="resolved", select that fact
2. If ONLY offers exist WITH counter-offers/rejections → state="unagreed" (active negotiation)
3. If ONLY offers exist WITHOUT counter-offers/rejections → state="informational" (record/confirmation)
4. If ONLY info facts exist → state="informational"

The key distinction:
- "unagreed" = active negotiation with back-and-forth, no final agreement reached
- "informational" = data record (like a booking confirmation) - single offer without negotiation context

Facts to analyze (ordered by message_index):
{facts_json}

Return valid JSON with resolutions for each fact_type.`;

// =============================================================================
// Fact Grouping
// =============================================================================

interface FactGroup {
  fact_type: ImportFactType;
  fact_domain: string | null;
  facts: ImportFact[];
}

function defaultDomainForFact(fact: ImportFact): string | null {
  if (fact.fact_type.startsWith('flight_')) {
    if (fact.fact_domain) return fact.fact_domain;
    // Use value_text to avoid collapsing multiple legs with missing domains
    if (fact.value_text) {
      const slug = fact.value_text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `flight_${slug || 'leg_1'}`;
    }
    return 'flight_leg_1';
  }
  if (fact.fact_type.startsWith('hotel_')) return 'hotel_main';
  if (fact.fact_type.startsWith('contact_')) return 'contact_main';
  return null;
}

function defaultDomainForType(factType: ImportFactType): string | null {
  if (factType.startsWith('flight_')) return 'flight_leg_1';
  if (factType.startsWith('hotel_')) return 'hotel_main';
  if (factType.startsWith('contact_')) return 'contact_main';
  return null;
}

/**
 * Normalize flight numbers to a canonical token for grouping.
 */
function normalizeFlightNumberValue(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
  return cleaned || null;
}

function factPositionValue(fact: ImportFact): number {
  return (fact.message_index ?? 0) * 1_000_000 +
    (fact.chunk_index ?? 0) * 1_000 +
    (fact.raw_snippet_start ?? 0);
}

/**
 * Collapse noisy flight domains by anchoring to flight numbers and proximity.
 * Primary key = flight_number; secondary = proximity to that number in the source.
 */
function normalizeFlightFactDomains(facts: ImportFact[]): ImportFact[] {
  const flightNumberFacts = facts
    .filter(f => f.fact_type === 'flight_flightNumber' && f.value_text)
    .sort((a, b) => {
      if (a.message_index !== b.message_index) return a.message_index - b.message_index;
      return a.chunk_index - b.chunk_index;
    });

  const domainByFlightNumber = new Map<string, string>();
  const domainOrder: string[] = [];
  const typeAllocation: Record<string, number> = {};
  let legCounter = 1;

  for (const fact of flightNumberFacts) {
    const normalizedNumber = normalizeFlightNumberValue(fact.value_text);
    if (!normalizedNumber) continue;
    let domain = fact.fact_domain;
    if (!domain || !/^flight_leg_\d+$/i.test(domain)) {
      domain = domainByFlightNumber.get(normalizedNumber) || `flight_leg_${legCounter++}`;
    }
    domainByFlightNumber.set(normalizedNumber, domain);
    domainOrder.push(domain);
  }

  let firstDomain: string | null = null;
  let lastDomain: string | null = null;
  for (const domain of domainByFlightNumber.values()) {
    firstDomain = domain;
    lastDomain = domain;
    break;
  }
  for (const domain of domainByFlightNumber.values()) {
    lastDomain = domain;
  }

  const findNearestDomain = (fact: ImportFact, preferUpcoming: boolean): string | null => {
    const snippet = `${fact.raw_snippet || ''} ${fact.value_text || ''}`.toUpperCase();
    for (const [num, domain] of domainByFlightNumber.entries()) {
      if (snippet.includes(num)) {
        return domain;
      }
    }

    const sameSourceNumbers = flightNumberFacts
      .filter(numFact => !(fact.source_id && numFact.source_id && fact.source_id !== numFact.source_id))
      .map(numFact => ({ fact: numFact, pos: factPositionValue(numFact) }))
      .sort((a, b) => a.pos - b.pos);

    if (sameSourceNumbers.length === 0) return null;

    if (sameSourceNumbers.length > 1) {
      const uniquePositions = new Set(sameSourceNumbers.map(entry => entry.pos));
      if (uniquePositions.size === 1) {
        return null; // cannot disambiguate by position
      }
    }

    const currentPos = factPositionValue(fact);
    const previous = sameSourceNumbers
      .filter(entry => entry.pos <= currentPos)
      .sort((a, b) => b.pos - a.pos);
    const upcoming = sameSourceNumbers.find(entry => entry.pos > currentPos);

    if (preferUpcoming && upcoming) {
      const normalizedNumber = normalizeFlightNumberValue(upcoming.fact.value_text);
      if (normalizedNumber) {
        return domainByFlightNumber.get(normalizedNumber) || null;
      }
    }

    if (previous.length > 0) {
      const normalizedNumber = normalizeFlightNumberValue(previous[0].fact.value_text);
      if (normalizedNumber) {
        return domainByFlightNumber.get(normalizedNumber) || null;
      }
    }

    if (!preferUpcoming && upcoming) {
      const normalizedNumber = normalizeFlightNumberValue(upcoming.fact.value_text);
      if (normalizedNumber) {
        return domainByFlightNumber.get(normalizedNumber) || null;
      }
    }

    const last = sameSourceNumbers[sameSourceNumbers.length - 1];
    const lastNumber = normalizeFlightNumberValue(last.fact.value_text);
    return lastNumber ? domainByFlightNumber.get(lastNumber) || null : null;
  };

  return facts.map(fact => {
    if (!fact.fact_type.startsWith('flight_')) return fact;
    const normalizedFact = { ...fact };

    if (normalizedFact.fact_type === 'flight_flightNumber') {
      const normalizedNumber = normalizeFlightNumberValue(normalizedFact.value_text);
      if (normalizedNumber && domainByFlightNumber.has(normalizedNumber)) {
        normalizedFact.fact_domain = domainByFlightNumber.get(normalizedNumber) || normalizedFact.fact_domain;
      }
      return normalizedFact;
    }

    if (normalizedFact.fact_domain && /^flight_leg_\d+$/i.test(normalizedFact.fact_domain)) {
      return normalizedFact;
    }

    const prefersFinalLeg = [
      'flight_destination_city',
      'flight_destination_airport',
      'flight_arrival_datetime',
      'flight_arrival',
    ].includes(normalizedFact.fact_type);

    const nearestDomain = findNearestDomain(normalizedFact, prefersFinalLeg);
    if (nearestDomain) {
      normalizedFact.fact_domain = nearestDomain;
      return normalizedFact;
    }

    const fallbackDomain = prefersFinalLeg
      ? (lastDomain || firstDomain)
      : (domainOrder.length === 1 ? firstDomain : null);
    if (fallbackDomain) {
      normalizedFact.fact_domain = fallbackDomain;
    } else if (domainOrder.length > 0) {
      const allocationIndex = typeAllocation[normalizedFact.fact_type] ?? 0;
      const allocatedDomain = domainOrder[Math.min(allocationIndex, domainOrder.length - 1)];
      typeAllocation[normalizedFact.fact_type] = allocationIndex + 1;
      normalizedFact.fact_domain = allocatedDomain;
    }

    return normalizedFact;
  });
}

/**
 * Group facts by type and domain for resolution
 */
function groupFactsForResolution(facts: ImportFact[]): FactGroup[] {
  const normalizedFacts = normalizeFlightFactDomains(facts);
  const groups = new Map<string, FactGroup>();

  for (const fact of normalizedFacts) {
    const normalizedDomain = fact.fact_domain || defaultDomainForFact(fact) || '';
    const key = `${fact.fact_type}|${normalizedDomain}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        fact_type: fact.fact_type,
        fact_domain: normalizedDomain || null,
        facts: [],
      });
    }
    
    groups.get(key)!.facts.push(fact);
  }

  // Sort facts within each group by message_index
  for (const group of groups.values()) {
    group.facts.sort((a, b) => {
      if (a.message_index !== b.message_index) {
        return a.message_index - b.message_index;
      }
      return a.chunk_index - b.chunk_index;
    });
  }

  return Array.from(groups.values());
}

// =============================================================================
// Rule-Based Resolution (Fallback)
// =============================================================================

/**
 * Apply rule-based resolution for a fact group.
 * This is used as a fallback if LLM resolution fails.
 * 
 * Uses:
 * - Hard status rules (rejected/question NEVER selectable)
 * - Speaker authority weighting
 * - Computed confidence (not model self-reporting)
 */
function resolveFactGroupByRules(group: FactGroup): FactResolution {
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
    // Sort by: 1) Speaker authority (desc), 2) Computed confidence (desc), 3) Message index (latest)
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

// =============================================================================
// LLM Resolution
// =============================================================================

interface LLMResponse {
  content: string | null;
  error?: string;
}

async function callResolutionLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { content: null, error: 'OPENAI_API_KEY not set' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0, // Zero temperature for deterministic resolution
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      return { content: null, error: `LLM HTTP error: ${response.status} ${message}` };
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? null;
    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown LLM error';
    return { content: null, error: message };
  }
}

interface RawResolutionFromLLM {
  fact_type?: string;
  fact_domain?: string | null;
  selected_fact_id?: string | null;
  state?: string;
  reason?: string;
  final_value_text?: string;
  final_value_number?: number;
  final_value_date?: string;
  reasoning_trace?: ReasoningStep[];
}

/**
 * Parse LLM resolution response
 */
function parseLLMResolutions(
  content: string,
  facts: ImportFact[]
): FactResolution[] {
  try {
    const parsed = JSON.parse(content);
    const rawResolutions: RawResolutionFromLLM[] = parsed.resolutions || [];
    
    // Build a set of valid fact IDs for validation
    const validFactIds = new Set(facts.map(f => f.id));
    
    return rawResolutions.map((raw): FactResolution => {
      // Validate selected_fact_id exists
      const selectedId = raw.selected_fact_id && validFactIds.has(raw.selected_fact_id)
        ? raw.selected_fact_id
        : null;
      
      const state = normalizeResolutionState(raw.state);
      
      return {
        fact_type: raw.fact_type as ImportFactType || 'other',
        fact_domain: raw.fact_domain || undefined,
        selected_fact_id: selectedId,
        state,
        reason: raw.reason || 'No reason provided',
        final_value_text: raw.final_value_text,
        final_value_number: raw.final_value_number,
        final_value_date: raw.final_value_date,
        reasoning_trace: raw.reasoning_trace,
      };
    });
  } catch (error) {
    logger.error('Failed to parse LLM resolution response', { error, content });
    return [];
  }
}

function normalizeResolutionState(raw?: string): ResolutionState {
  if (!raw) return 'missing';
  
  const normalized = raw.toLowerCase();
  
  const validStates: ResolutionState[] = [
    'resolved', 'unagreed', 'conflicting', 'missing', 'informational',
  ];
  
  if (validStates.includes(normalized as ResolutionState)) {
    return normalized as ResolutionState;
  }
  
  return 'missing';
}

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

  // Prepare facts summary for LLM
  const factsSummary = factsForResolution.map(f => ({
    id: f.id,
    message_index: f.message_index,
    fact_type: f.fact_type,
    fact_domain: f.fact_domain,
    value_text: f.value_text,
    value_number: f.value_number,
    status: f.status,
    speaker_role: f.speaker_role,
    confidence: f.confidence,
    raw_snippet: f.raw_snippet?.substring(0, 200),
  }));

  const userPrompt = RESOLUTION_USER_PROMPT.replace(
    '{facts_json}',
    JSON.stringify(factsSummary, null, 2)
  );

  // Try LLM resolution first
  const llmResponse = await callResolutionLLM(RESOLUTION_SYSTEM_PROMPT, userPrompt);
  
  let resolutions: FactResolution[] = [];
  const warnings: string[] = [];

  if (llmResponse.error || !llmResponse.content) {
    warnings.push(`LLM resolution failed: ${llmResponse.error || 'empty response'}`);
    logger.warn('LLM resolution failed, falling back to rules', {
      job_id,
      error: llmResponse.error,
    });
    
    // Fall back to rule-based resolution
    resolutions = groups.map(group => resolveFactGroupByRules(group));
  } else {
    // Parse LLM resolutions
    resolutions = parseLLMResolutions(llmResponse.content, factsForResolution);
    
    // Validate and fill in any missing groups with rule-based resolution
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

/**
 * Validate resolutions against our HARD SERVER-SIDE rules.
 * The LLM cannot override these - we enforce them programmatically.
 */
function validateResolutions(
  resolutions: FactResolution[],
  facts: ImportFact[],
  warnings: string[]
): FactResolution[] {
  const factsById = new Map(facts.map(f => [f.id, f]));
  const factGroups = groupFactsForResolution(facts);
  const groupsByKey = new Map(factGroups.map(g => [`${g.fact_type}|${g.fact_domain || ''}`, g]));
  
  return resolutions.map(resolution => {
    const normalizedResolutionDomain = resolution.fact_domain || defaultDomainForType(resolution.fact_type) || '';
    const groupKey = `${resolution.fact_type}|${normalizedResolutionDomain}`;
    const group = groupsByKey.get(groupKey);
    const selectedFact = resolution.selected_fact_id 
      ? factsById.get(resolution.selected_fact_id) 
      : null;
    
    // =================================================================
    // HARD RULE 1: Never-selectable statuses can NEVER be selected
    // =================================================================
    if (selectedFact && !isSelectableStatus(selectedFact.status)) {
      warnings.push(
        `HARD RULE VIOLATION: Fact ${resolution.selected_fact_id} has status '${selectedFact.status}' ` +
        `which can NEVER be selected - correcting to unagreed`
      );
      return {
        ...resolution,
        selected_fact_id: null,
        state: 'unagreed' as ResolutionState,
        reason: `${resolution.reason} [SERVER-CORRECTED: '${selectedFact.status}' status cannot be selected]`,
        confidence: 0.4, // Low confidence due to correction
      };
    }
    
    // =================================================================
    // HARD RULE 2: 'resolved' state requires accepted/final fact
    // =================================================================
    if (resolution.state === 'resolved' && selectedFact) {
      if (!isFinalizableStatus(selectedFact.status)) {
        // Check if there's an accepted fact we should use instead
        const acceptedFact = group?.facts.find(f => isFinalizableStatus(f.status));
        if (acceptedFact) {
          warnings.push(
            `HARD RULE CORRECTION: Resolution marked as 'resolved' but selected fact has ` +
            `status '${selectedFact.status}'. Using accepted fact ${acceptedFact.id} instead.`
          );
          return {
            ...resolution,
            selected_fact_id: acceptedFact.id,
            final_value_number: acceptedFact.value_number,
            final_value_text: acceptedFact.value_text,
            final_value_date: resolution.fact_type === 'general_date'
              ? (normalizeEventDateToISO(acceptedFact.value_date || acceptedFact.value_text) || acceptedFact.value_date)
              : acceptedFact.value_date,
            reason: `${resolution.reason} [SERVER-CORRECTED: Using accepted fact]`,
            confidence: group 
              ? computeResolutionConfidence(resolution, acceptedFact, group) 
              : 0.7,
          };
        } else {
          // No accepted fact - cannot be resolved
          warnings.push(
            `HARD RULE VIOLATION: Resolution marked as 'resolved' but no accepted/final fact exists. ` +
            `Downgrading to 'unagreed'.`
          );
          return {
            ...resolution,
            selected_fact_id: null,
            state: 'unagreed' as ResolutionState,
            reason: `${resolution.reason} [SERVER-CORRECTED: No accepted fact for resolution]`,
            confidence: 0.5,
          };
        }
      }
    } else if ((resolution.state === 'resolved' || resolution.state === 'informational') && !selectedFact) {
      // Allow resolved/informational with explicit value but missing selected_fact_id (LLM omission)
      const hasValue =
        resolution.final_value_text !== undefined ||
        resolution.final_value_number !== undefined ||
        resolution.final_value_date !== undefined;
      if (hasValue) {
        const normalizedDate = resolution.fact_type === 'general_date'
          ? normalizeEventDateToISO(resolution.final_value_date || resolution.final_value_text || null)
          : resolution.final_value_date;
        warnings.push(
          `Resolution for ${resolution.fact_type} has no selected_fact_id but includes a value; keeping value as-is`
        );
        return {
          ...resolution,
          fact_domain: resolution.fact_domain ?? group?.fact_domain ?? undefined,
          final_value_date: normalizedDate ?? resolution.final_value_date,
          confidence: resolution.confidence ?? 0.6,
        };
      }
    }
    
    // =================================================================
    // HARD RULE 3: Unresolved states must NOT have a selected fact
    // =================================================================
    if ((resolution.state === 'unagreed' || resolution.state === 'missing') && selectedFact) {
      warnings.push(
        `HARD RULE CORRECTION: State '${resolution.state}' cannot have a selected fact. ` +
        `Clearing selected_fact_id.`
      );
      return {
        ...resolution,
        selected_fact_id: null,
        final_value_number: undefined,
        final_value_text: undefined,
        final_value_date: undefined,
        reason: `${resolution.reason} [SERVER-CORRECTED: Unresolved state cleared selection]`,
        confidence: 0.6,
      };
    }
    
    // =================================================================
    // HARD RULE 4: Speaker authority validation
    // =================================================================
    if (selectedFact && group) {
      // Check if there's a higher-authority speaker with the same value
      const higherAuthorityFacts = group.facts.filter(f => 
        f.id !== selectedFact.id &&
        isSelectableStatus(f.status) &&
        speakerHasAuthority(f.speaker_role, selectedFact.fact_type) &&
        getEffectiveSpeakerAuthority(f.speaker_role, f.fact_type) > 
          getEffectiveSpeakerAuthority(selectedFact.speaker_role, selectedFact.fact_type)
      );
      
      // If a higher-authority speaker has a DIFFERENT value that's also accepted,
      // we should flag this as a conflict
      const conflictingHighAuthority = higherAuthorityFacts.find(f => 
        isFinalizableStatus(f.status) &&
        ((f.value_number !== undefined && selectedFact.value_number !== undefined && 
          f.value_number !== selectedFact.value_number) ||
         (f.value_text && selectedFact.value_text && 
          f.value_text.toLowerCase() !== selectedFact.value_text.toLowerCase()))
      );
      
      if (conflictingHighAuthority) {
        warnings.push(
          `SPEAKER AUTHORITY CONFLICT: Selected fact from ${selectedFact.speaker_role} conflicts with ` +
          `higher-authority ${conflictingHighAuthority.speaker_role}. Using higher-authority value.`
        );
        return {
          ...resolution,
          selected_fact_id: conflictingHighAuthority.id,
          final_value_number: conflictingHighAuthority.value_number,
          final_value_text: conflictingHighAuthority.value_text,
          final_value_date: conflictingHighAuthority.value_date,
          reason: `${resolution.reason} [SERVER-CORRECTED: Higher authority speaker preferred]`,
          confidence: computeResolutionConfidence(resolution, conflictingHighAuthority, group),
        };
      }
    }
    
    // =================================================================
    // RULE 5: Ensure values are populated from selected fact
    // LLM sometimes returns correct selection but omits values
    // =================================================================
    if (selectedFact && (resolution.state === 'resolved' || resolution.state === 'informational')) {
      const needsValueFix = 
        (resolution.final_value_number === undefined && selectedFact.value_number !== undefined) ||
        (resolution.final_value_text === undefined && selectedFact.value_text !== undefined) ||
        (resolution.final_value_date === undefined && selectedFact.value_date !== undefined);
      
      if (needsValueFix) {
        const normalizedDate = resolution.fact_type === 'general_date'
          ? normalizeEventDateToISO(resolution.final_value_date ?? selectedFact.value_date ?? selectedFact.value_text)
          : resolution.final_value_date;

        return {
          ...resolution,
          final_value_number: resolution.final_value_number ?? selectedFact.value_number,
          final_value_text: resolution.final_value_text ?? selectedFact.value_text,
          final_value_date: normalizedDate ?? selectedFact.value_date,
          confidence: group 
            ? computeResolutionConfidence(resolution, selectedFact, group) 
            : resolution.confidence,
        };
      }
    }
    
    // =================================================================
    // Compute final confidence if not already set
    // =================================================================
    if (group && resolution.confidence === undefined) {
      return {
        ...resolution,
        confidence: computeResolutionConfidence(resolution, selectedFact || null, group),
      };
    }

    return resolution;
  });
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
