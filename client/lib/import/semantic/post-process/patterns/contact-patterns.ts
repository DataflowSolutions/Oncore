/**
 * Contact-specific pattern matchers for post-processing
 */

import { logger } from '@/lib/logger';
import { logPostProcessUpgrade } from '../../diagnostics';
import type { ExtractedFact } from '../../types';

/**
 * Match contact-related patterns and upgrade fact types
 * Returns true if a pattern was matched and fact was upgraded
 */
export function matchContactPatterns(fact: ExtractedFact): boolean {
    if (fact.fact_type !== 'other') return false;

    const text = (fact.value_text || '').trim();
    const snippet = (fact.raw_snippet || '').toLowerCase();
    const originalType = fact.fact_type;

    // 1) Email addresses
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        logPostProcessUpgrade('email_pattern', originalType, 'contact_email', text, snippet);
        fact.fact_type = 'contact_email';
        logger.debug('Upgraded other → contact_email', { value: text });
        return true;
    }

    // 2) Phone numbers (various formats)
    if (/^[\+\(]?[\d\s\-\(\)]{10,}$/.test(text) && /(phone|tel|mobile|call)/i.test(snippet)) {
        logPostProcessUpgrade('phone_pattern', originalType, 'contact_phone', text, snippet);
        fact.fact_type = 'contact_phone';
        logger.debug('Upgraded other → contact_phone', { value: text });
        return true;
    }

    return false;
}
