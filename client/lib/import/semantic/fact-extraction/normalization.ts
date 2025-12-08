/**
 * Normalization logic for extracted facts
 */

import { logger } from '@/lib/logger';
import { FACT_TYPE_TO_IMPORT_FIELD } from '../types';
import type {
    ImportFactType,
    ImportFactDirection,
    ImportFactStatus,
    ImportFactSpeaker,
    ImportSourceScope,
} from '../types';

/**
 * Aliases for common LLM output variations.
 * Maps non-standard fact_type strings to their canonical ImportFactType.
 */
const FACT_TYPE_ALIASES: Record<string, ImportFactType> = {
    // Flight aliases
    'flightnumber': 'flight_number',
    'flight_no': 'flight_number',
    'flightno': 'flight_number',
    'flight_num': 'flight_number',
    'flightnum': 'flight_number',
    'flight_code': 'flight_number',
    'flightcode': 'flight_number',
    'flight_id': 'flight_number',
    'flightid': 'flight_number',
    'flight_passenger': 'flight_passenger_name',
    'flightpassenger': 'flight_passenger_name',
    'passenger_name': 'flight_passenger_name',
    'passengername': 'flight_passenger_name',
    'passenger': 'flight_passenger_name',
    'flight_pnr': 'flight_booking_reference',
    'flightpnr': 'flight_booking_reference',
    'pnr': 'flight_booking_reference',
    'booking_reference': 'flight_booking_reference',
    'bookingreference': 'flight_booking_reference',
    'confirmation_number': 'flight_booking_reference',
    'confirmationnumber': 'flight_booking_reference',
    'flight_ticket': 'flight_ticket_number',
    'flightticket': 'flight_ticket_number',
    'ticket_number': 'flight_ticket_number',
    'ticketnumber': 'flight_ticket_number',
    'ticket_no': 'flight_ticket_number',
    'ticketno': 'flight_ticket_number',
    'ticket': 'flight_ticket_number',
    'flight_class': 'flight_travel_class',
    'flightclass': 'flight_travel_class',
    'travel_class': 'flight_travel_class',
    'travelclass': 'flight_travel_class',
    'class': 'flight_travel_class',
    'cabin_class': 'flight_travel_class',
    'cabinclass': 'flight_travel_class',
    'seat_number': 'flight_seat',
    'seatnumber': 'flight_seat',
    'seat': 'flight_seat',
    'flight_seat_number': 'flight_seat',
    'flightseatnumber': 'flight_seat',
    // Hotel aliases
    'hotelname': 'hotel_name',
    'hotel': 'hotel_name',
    'hoteladdress': 'hotel_address',
    'hotelcity': 'hotel_city',
    'hotelcountry': 'hotel_country',
    'checkin_date': 'hotel_checkin_date',
    'checkindate': 'hotel_checkin_date',
    'check_in_date': 'hotel_checkin_date',
    'checkout_date': 'hotel_checkout_date',
    'checkoutdate': 'hotel_checkout_date',
    'check_out_date': 'hotel_checkout_date',
    // General aliases
    'artist': 'general_artist',
    'artistname': 'general_artist',
    'artist_name': 'general_artist',
    'venue': 'general_venue',
    'venuename': 'general_venue',
    'venue_name': 'general_venue',
    'event': 'general_event_name',
    'eventname': 'general_event_name',
    'event_name': 'general_event_name',
    'city': 'general_city',
    'country': 'general_country',
    'date': 'general_date',
    'event_date': 'general_date',
    'eventdate': 'general_date',
    // Deal aliases
    'fee': 'deal_fee',
    'artist_fee': 'deal_fee',
    'artistfee': 'deal_fee',
    'currency': 'deal_currency',
    'payment_terms': 'deal_payment_terms',
    'paymentterms': 'deal_payment_terms',
};

/**
 * Validate and normalize a fact type from LLM output.
 * Handles common LLM variations and logs when falling back to 'other'.
 */
export function normalizeFactType(raw?: string): ImportFactType {
    if (!raw) return 'other';

    const normalized = raw.toLowerCase().replace(/[^a-z_]/g, '_');
    const validTypes = Object.keys(FACT_TYPE_TO_IMPORT_FIELD) as ImportFactType[];

    // Check if it's already a valid type
    if (validTypes.includes(normalized as ImportFactType)) {
        return normalized as ImportFactType;
    }

    // Check aliases (using the cleaned normalized version)
    const cleanedForAlias = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FACT_TYPE_ALIASES[cleanedForAlias]) {
        logger.debug('Fact type alias matched', {
            raw,
            alias: cleanedForAlias,
            mapped: FACT_TYPE_ALIASES[cleanedForAlias],
        });
        return FACT_TYPE_ALIASES[cleanedForAlias];
    }

    // Also check the underscore version for aliases
    if (FACT_TYPE_ALIASES[normalized]) {
        logger.debug('Fact type alias matched', {
            raw,
            alias: normalized,
            mapped: FACT_TYPE_ALIASES[normalized],
        });
        return FACT_TYPE_ALIASES[normalized];
    }

    // ==========================================================================
    // LOG 3: Normalization drop report
    // This catches every fact_type that falls through to 'other'
    // ==========================================================================
    const isFlightRelated = raw.toLowerCase().includes('flight') || 
                           raw.toLowerCase().includes('passenger') ||
                           raw.toLowerCase().includes('ticket') ||
                           raw.toLowerCase().includes('booking') ||
                           raw.toLowerCase().includes('pnr') ||
                           raw.toLowerCase().includes('seat');
    
    const isContactRelated = raw.toLowerCase().includes('contact') ||
                            raw.toLowerCase().includes('email') ||
                            raw.toLowerCase().includes('phone') ||
                            raw.toLowerCase().includes('name') ||
                            raw.toLowerCase().includes('role');

    const isImportant = isFlightRelated || isContactRelated;
    
    // Always log drops for important fact types
    if (isImportant) {
        logger.warn('🚨 [NORMALIZATION DROP] Important fact_type normalized to "other"', {
            raw_fact_type: raw,
            normalized_attempt: normalized,
            category: isFlightRelated ? 'flight' : 'contact',
            reason: 'UNKNOWN_FACT_TYPE',
            hint: 'Add to FACT_TYPE_ALIASES in normalization.ts',
        });
    } else {
        logger.debug('[NORMALIZATION DROP] Unknown fact_type normalized to "other"', {
            raw_fact_type: raw,
            normalized_attempt: normalized,
            reason: 'UNKNOWN_FACT_TYPE',
        });
    }

    return 'other';
}

/**
 * Validate and normalize direction from LLM output
 */
export function normalizeDirection(raw?: string): ImportFactDirection {
    if (!raw) return 'unknown';

    const normalized = raw.toLowerCase().replace(/[^a-z_]/g, '_');

    const validDirections: ImportFactDirection[] = [
        'we_pay', 'they_pay', 'included', 'external_cost', 'split', 'unknown',
    ];

    if (validDirections.includes(normalized as ImportFactDirection)) {
        return normalized as ImportFactDirection;
    }

    return 'unknown';
}

/**
 * Validate and normalize status from LLM output
 */
export function normalizeStatus(raw?: string): ImportFactStatus {
    if (!raw) return 'unknown';

    const normalized = raw.toLowerCase().replace(/[^a-z_]/g, '_');

    const validStatuses: ImportFactStatus[] = [
        'offer', 'counter_offer', 'accepted', 'rejected', 'withdrawn',
        'info', 'question', 'final', 'unknown',
    ];

    if (validStatuses.includes(normalized as ImportFactStatus)) {
        return normalized as ImportFactStatus;
    }

    return 'unknown';
}

/**
 * Validate and normalize speaker role from LLM output
 */
export function normalizeSpeakerRole(raw?: string): ImportFactSpeaker {
    if (!raw) return 'unknown';

    const normalized = raw.toLowerCase().replace(/[^a-z_]/g, '_');

    const validRoles: ImportFactSpeaker[] = [
        'artist', 'artist_agent', 'promoter', 'venue', 'production', 'unknown',
    ];

    if (validRoles.includes(normalized as ImportFactSpeaker)) {
        return normalized as ImportFactSpeaker;
    }

    return 'unknown';
}

/**
 * Validate and normalize source_scope from LLM output
 */
export function normalizeSourceScope(raw?: string): ImportSourceScope {
    if (!raw) return 'unknown';

    const normalized = raw.toLowerCase().replace(/[^a-z_]/g, '_');

    const validScopes: ImportSourceScope[] = [
        'contract_main',
        'itinerary',
        'confirmation',
        'rider_example',
        'general_info',
        'unknown',
    ];

    if (validScopes.includes(normalized as ImportSourceScope)) {
        return normalized as ImportSourceScope;
    }

    return 'unknown';
}

/**
 * Lightweight filename-based source scope inference (used as fallback when model does not provide one)
 */
export function inferSourceScopeFromFilename(fileName: string): ImportSourceScope {
    const lower = (fileName || '').toLowerCase();

    if (lower.includes('rider')) return 'rider_example';
    if (lower.match(/itinerary|schedule|run[-_ ]?of[-_ ]?show/)) return 'itinerary';
    if (lower.match(/flight|airline|booking|confirmation|ticket|boarding|pnr/)) return 'confirmation';
    if (lower.match(/contract|agreement|offer/)) return 'contract_main';

    return 'unknown';
}
