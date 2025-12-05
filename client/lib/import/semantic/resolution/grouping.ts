/**
 * Fact Grouping Logic for Resolution
 * 
 * Groups facts by type and domain, with special handling for flight facts.
 */

import type { ImportFact, ImportFactType } from '../types';

export interface FactGroup {
    fact_type: ImportFactType;
    fact_domain: string | null;
    facts: ImportFact[];
}

/**
 * Determine default domain for a fact based on its type
 */
export function defaultDomainForFact(fact: ImportFact): string | null {
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

/**
 * Get default domain for a fact type (when no fact instance exists)
 */
export function defaultDomainForType(factType: ImportFactType): string | null {
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

/**
 * Calculate position value for a fact (for ordering)
 */
function factPositionValue(fact: ImportFact): number {
    return (fact.message_index ?? 0) * 1_000_000 +
        (fact.chunk_index ?? 0) * 1_000 +
        (fact.raw_snippet_start ?? 0);
}

/**
 * Collapse noisy flight domains by anchoring to flight numbers and proximity.
 * 
 * Flight Resolution Philosophy (Stage F2):
 * - Flights are IDs, not semantic entities
 * - Primary key: flightNumber (e.g., "TK67")
 * - No negotiation, no semantic debate
 * - Just group by flight number + order
 * - Enrichment (airports, times, etc.) happens in Stage F3 via APIs
 * 
 * This function ensures all facts for the same flight number
 * are grouped into the same domain (flight_leg_N).
 */
export function normalizeFlightFactDomains(facts: ImportFact[]): ImportFact[] {
    const flightNumberFacts = facts
        .filter(f => f.fact_type === 'flight_number' && f.value_text)
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

        if (normalizedFact.fact_type === 'flight_number') {
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
export function groupFactsForResolution(facts: ImportFact[]): FactGroup[] {
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
