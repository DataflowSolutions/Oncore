/**
 * General event pattern matchers for post-processing
 */

import { logger } from '@/lib/logger';
import { logPostProcessUpgrade } from '../../diagnostics';
import type { ExtractedFact } from '../../types';
import { hasFact, isTimeFormat } from '../utils';

/**
 * Match general event-related patterns and upgrade fact types
 * Returns true if a pattern was matched and fact was upgraded
 */
export function matchGeneralPatterns(fact: ExtractedFact, allFacts: ExtractedFact[]): boolean {
    if (fact.fact_type !== 'other') return false;

    const text = (fact.value_text || '').trim();
    const snippet = (fact.raw_snippet || '').toLowerCase();
    const originalType = fact.fact_type;

    // 1) Artist name from rider-style wording
    if (/son\s*of\s*son/i.test(text) && !hasFact(allFacts, 'general_artist')) {
        logPostProcessUpgrade('artist_name_pattern', originalType, 'general_artist', 'Son of Son', snippet);
        fact.fact_type = 'general_artist';
        fact.value_text = 'Son of Son';
        logger.debug('Upgraded other → general_artist', { value: 'Son of Son' });
        return true;
    }

    // 2) Event date patterns (DD.MM.YYYY, DD/MM/YYYY, etc.)
    if (/^\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{4}$/.test(text) && !hasFact(allFacts, 'general_date')) {
        logPostProcessUpgrade('event_date_pattern', originalType, 'general_date', text, snippet);
        fact.fact_type = 'general_date';
        logger.debug('Upgraded other → general_date', { value: text });
        return true;
    }

    // 3) Set time (HH:MM with "set" or "start" context)
    if (isTimeFormat(text) && /(set\s*time|start|beginning)/i.test(snippet) && !hasFact(allFacts, 'general_set_time')) {
        logPostProcessUpgrade('set_time_pattern', originalType, 'general_set_time', text, snippet);
        fact.fact_type = 'general_set_time';
        logger.debug('Upgraded other → general_set_time', { value: text });
        return true;
    }

    return false;
}
