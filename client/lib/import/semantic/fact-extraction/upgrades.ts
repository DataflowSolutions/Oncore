/**
 * Filename-based status upgrades (Safety Net)
 */

import { logger } from '@/lib/logger';
import type { ExtractedFact, ImportFactType, ImportFactStatus } from '../types';

/**
 * Patterns that indicate a document is a confirmation/booking (not a negotiation).
 * Facts from these documents should be "final" not "offer".
 */
const CONFIRMATION_FILENAME_PATTERNS = [
    /turkish\s*airlines/i,
    /booking/i,
    /confirmation/i,
    /itinerary/i,
    /e-?ticket/i,
    /boarding\s*pass/i,
    /reservation/i,
    /receipt/i,
    /invoice/i,
    /ticket/i,
    /pnr/i,
    /manage\s*booking/i,
    /flight.*confirmation/i,
    /hotel.*confirmation/i,
];

/**
 * Fact types that are typically "final" in confirmation documents
 */
const CONFIRMATION_FACT_TYPES: Set<ImportFactType> = new Set([
    // Flight facts (KEYS ONLY - enrichment fields excluded)
    'flight_number',
    'flight_date',
    'flight_passenger_name',
    'flight_booking_reference',
    'flight_ticket_number',
    'flight_seat',
    'flight_travel_class',
    // Hotel facts
    'hotel_name',
    'hotel_address',
    'hotel_city',
    'hotel_country',
    'hotel_checkin_date',
    'hotel_checkin_time',
    'hotel_checkout_date',
    'hotel_checkout_time',
    'hotel_booking_reference',
    'hotel_phone',
    'hotel_email',
    'hotel_notes',
    // Contact facts
    'contact_name',
    'contact_email',
    'contact_phone',
    'contact_role',
]);

/**
 * Upgrade fact statuses based on filename patterns.
 * This is a safety net when the LLM misclassifies facts from confirmation documents.
 */
export function upgradeFactStatusesFromFilename(
    facts: ExtractedFact[],
    fileName: string
): ExtractedFact[] {
    // Check if filename suggests a confirmation document
    const isConfirmationDoc = CONFIRMATION_FILENAME_PATTERNS.some(pattern =>
        pattern.test(fileName)
    );

    if (!isConfirmationDoc) {
        return facts;
    }

    // Upgrade appropriate fact types from offer/info to final
    return facts.map(fact => {
        // Only upgrade if it's a confirmation-type fact
        if (!CONFIRMATION_FACT_TYPES.has(fact.fact_type)) {
            return fact;
        }

        // Only upgrade "offer" or "info" - don't touch accepted/rejected/etc
        if (fact.status === 'offer' || fact.status === 'info' || fact.status === 'unknown') {
            logger.debug('Upgrading fact status based on filename', {
                fileName,
                factType: fact.fact_type,
                oldStatus: fact.status,
                newStatus: 'final',
            });
            return {
                ...fact,
                status: 'final' as ImportFactStatus,
                extraction_reason: `${fact.extraction_reason || ''} [Status upgraded: confirmation document]`.trim(),
            };
        }

        return fact;
    });
}
