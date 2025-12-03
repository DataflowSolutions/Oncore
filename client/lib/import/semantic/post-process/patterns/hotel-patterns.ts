/**
 * Hotel-specific pattern matchers for post-processing
 */

import { logger } from '@/lib/logger';
import { logPostProcessUpgrade } from '../../diagnostics';
import type { ExtractedFact } from '../../types';

/**
 * Match hotel-related patterns and upgrade fact types
 * Returns true if a pattern was matched and fact was upgraded
 */
export function matchHotelPatterns(fact: ExtractedFact): boolean {
    if (fact.fact_type !== 'other') return false;

    const text = (fact.value_text || '').trim();
    const snippet = (fact.raw_snippet || '').toLowerCase();
    const originalType = fact.fact_type;

    // Hotel booking reference
    if (/^[A-Z0-9]{6,10}$/i.test(text) && /(hotel|accommodation|room)/i.test(snippet)) {
        logPostProcessUpgrade('hotel_booking_pattern', originalType, 'hotel_bookingReference', text, snippet);
        fact.fact_type = 'hotel_bookingReference';
        logger.debug('Upgraded other → hotel_bookingReference', { value: text });
        return true;
    }

    return false;
}
