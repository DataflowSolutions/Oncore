/**
 * Flight-specific pattern matchers for post-processing
 */

import { logger } from '@/lib/logger';
import { logPostProcessUpgrade } from '../../diagnostics';
import type { ExtractedFact, ImportFactType } from '../../types';
import { IATA_TO_CITY } from '../constants';
import { parseFlightDuration, isTimeFormat } from '../utils';

/**
 * Match flight-related patterns and upgrade fact types
 * Returns true if a pattern was matched and fact was upgraded
 */
export function matchFlightPatterns(fact: ExtractedFact): boolean {
    if (fact.fact_type !== 'other') return false;

    const text = (fact.value_text || '').trim();
    const snippet = (fact.raw_snippet || '').toLowerCase();
    const originalType = fact.fact_type;

    // 1) Flight number pattern: TK67, LH1234, AA123, etc.
    if (/^[A-Z]{2}\d{2,4}$/i.test(text)) {
        logPostProcessUpgrade('flight_number_pattern', originalType, 'flight_flightNumber', text, snippet);
        fact.fact_type = 'flight_flightNumber';
        logger.debug('Upgraded other → flight_flightNumber', { value: text });
        return true;
    }

    // 2) Ticket number (long digit sequence with "ticket" context)
    if (/^\d{8,}$/.test(text) && /ticket/i.test(snippet)) {
        logPostProcessUpgrade('ticket_number_pattern', originalType, 'flight_ticketNumber', text, snippet);
        fact.fact_type = 'flight_ticketNumber';
        logger.debug('Upgraded other → flight_ticketNumber', { value: text });
        return true;
    }

    // 3) Booking reference / PNR (5-8 char alphanumeric with booking context)
    if (/^[A-Z0-9]{5,8}$/i.test(text) && /(booking|reservation|pnr|confirmation)/i.test(snippet)) {
        logPostProcessUpgrade('booking_reference_pattern', originalType, 'flight_bookingReference', text, snippet);
        fact.fact_type = 'flight_bookingReference';
        logger.debug('Upgraded other → flight_bookingReference', { value: text });
        return true;
    }

    // 4) Travel class (matches both "Economy" and "Economy Class")
    if (/(economy|business|first|premium)\s*(class)?$/i.test(text)) {
        const normalized = text
            .replace(/\s+class\s*$/i, '') // Remove " Class" suffix
            .trim();
        const capitalizedClass = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
        logPostProcessUpgrade('travel_class_pattern', originalType, 'flight_travelClass', capitalizedClass, snippet);
        fact.fact_type = 'flight_travelClass';
        fact.value_text = capitalizedClass;
        logger.debug('Upgraded other → flight_travelClass', { value: text });
        return true;
    }

    // 4b) Passenger name (starts with title prefix like Mr., Ms., Mrs., Dr.)
    if (/^(mr|ms|mrs|miss|dr|prof)\./i.test(text) || /^(mr|ms|mrs|miss|dr)\s+[a-z]/i.test(text)) {
        logPostProcessUpgrade('passenger_name_pattern', originalType, 'flight_fullName', text, snippet);
        fact.fact_type = 'flight_fullName';
        logger.debug('Upgraded other → flight_fullName', { value: text });
        return true;
    }

    // 5) Flight duration / travel time
    const duration = parseFlightDuration(text);
    if (duration || /total\s*travel\s*time/i.test(snippet)) {
        logPostProcessUpgrade('flight_duration_pattern', originalType, 'flight_notes', duration || text, snippet);
        fact.fact_type = 'flight_notes';
        if (duration && !fact.value_text) {
            fact.value_text = duration;
        }
        logger.debug('Upgraded other → flight_notes (duration)', { value: text });
        return true;
    }

    // 6) Seat number (e.g., "11K", "07F", "23A")
    if (/^[0-9]{1,2}[A-K]$/i.test(text)) {
        logPostProcessUpgrade('seat_number_pattern', originalType, 'flight_seat', text, snippet);
        fact.fact_type = 'flight_seat';
        logger.debug('Upgraded other → flight_seat', { value: text });
        return true;
    }

    // 7) IATA airport codes (3 letters, standalone)
    if (/^[A-Z]{3}$/i.test(text) && text.toUpperCase() in IATA_TO_CITY) {
        // For now, we just mark it as flight_notes since we don't know if it's from or to
        // The flight enrichment API will handle airport details
        logPostProcessUpgrade('iata_airport_pattern', originalType, 'flight_notes', text.toUpperCase(), snippet);
        fact.fact_type = 'flight_notes';
        fact.value_text = text.toUpperCase();
        logger.debug('Upgraded other → flight_notes (airport)', { value: text });
        return true;
    }

    return false;
}
