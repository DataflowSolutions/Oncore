/**
 * Utility functions for post-processing
 */

import type { ExtractedFact, ImportFactType } from '../types';

/**
 * Check if facts already contain a specific fact type
 */
export function hasFact(facts: ExtractedFact[], type: ImportFactType): boolean {
    return facts.some(f => f.fact_type === type);
}

/**
 * Check if facts contain a specific fact type with a specific domain
 */
export function hasFactInDomain(facts: ExtractedFact[], type: ImportFactType, domain: string | null): boolean {
    return facts.some(f => f.fact_type === type && f.fact_domain === domain);
}

/**
 * Extract IATA airport codes from text
 */
export function extractIATACodes(text: string): string[] {
    // Match 3-letter uppercase codes (common IATA format)
    const matches = text.match(/\b[A-Z]{3}\b/g);
    return matches ? [...new Set(matches)] : [];
}

/**
 * Parse flight direction string (e.g., "DPS to ARN via IST")
 */
export function parseFlightDirection(direction: string): {
    fromAirport: string | null;
    toAirport: string | null;
    viaAirport: string | null;
} | null {
    // Pattern: "XXX to YYY via ZZZ" or "XXX to YYY"
    const match = direction.match(/([A-Z]{3})\s+to\s+([A-Z]{3})(?:\s+via\s+([A-Z]{3}))?/i);
    if (!match) return null;

    const [, fromAirport, toAirport, viaAirport] = match;
    return {
        fromAirport: fromAirport.toUpperCase(),
        toAirport: toAirport.toUpperCase(),
        viaAirport: viaAirport ? viaAirport.toUpperCase() : null,
    };
}

/**
 * Parse flight duration from text (e.g., "20h 30m", "2 hours 45 minutes")
 */
export function parseFlightDuration(text: string): string | null {
    // Match patterns like "20h 30m", "2h30m", "2 hours 30 minutes"
    const patterns = [
        /(\d+)\s*h\s*(\d+)\s*m/i,
        /(\d+)\s*hours?\s*(\d+)\s*min/i,
        /(\d+)h(\d+)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const [, hours, minutes] = match;
            return `${hours}h ${minutes}m`;
        }
    }

    // Just hours
    const hoursOnly = text.match(/(\d+)\s*(?:hours?|h)/i);
    if (hoursOnly) {
        return `${hoursOnly[1]}h 0m`;
    }

    return null;
}

/**
 * Detect if text is a time value (HH:MM format)
 */
export function isTimeFormat(text: string): boolean {
    return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(text);
}
