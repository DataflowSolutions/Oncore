/**
 * Validation and parsing of LLM responses
 */

import { logger } from '@/lib/logger';
import type { ExtractedFact, FactExtractionRequest } from '../types';
import {
    normalizeSourceScope,
    normalizeSpeakerRole,
    normalizeFactType,
    normalizeDirection,
    normalizeStatus,
} from './normalization';

/**
 * Validate time format (HH:MM or HH:MM:SS)
 */
function validateTimeValue(value: string | undefined): string | undefined {
    if (!value) return undefined;
    // Accept HH:MM or HH:MM:SS format only
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (timeRegex.test(value)) {
        return value;
    }
    // Try to extract time from string like "10:00 AM" or "14:30"
    const extractedTime = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (extractedTime) {
        const [, hours, minutes, seconds] = extractedTime;
        const h = parseInt(hours, 10);
        const m = parseInt(minutes, 10);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            return seconds ? `${hours.padStart(2, '0')}:${minutes}:${seconds}` : `${hours.padStart(2, '0')}:${minutes}`;
        }
    }
    // Invalid time format - return undefined
    logger.debug('Invalid time value rejected', { value });
    return undefined;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function validateDateValue(value: string | undefined): string | undefined {
    if (!value) return undefined;
    // Accept YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(value)) {
        return value;
    }
    // Try to parse and reformat
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) {
        const date = new Date(parsed);
        return date.toISOString().split('T')[0];
    }
    logger.debug('Invalid date value rejected', { value });
    return undefined;
}

interface RawFactFromLLM {
    fact_type?: string;
    fact_domain?: string;
    value_text?: string;
    value_number?: number;
    value_boolean?: boolean;
    value_date?: string;
    value_time?: string;
    value_datetime?: string;
    currency?: string;
    unit?: string;
    direction?: string;
    status?: string;
    speaker_role?: string;
    speaker_name?: string;
    confidence?: number;
    extraction_reason?: string;
    raw_snippet?: string;
    raw_snippet_start?: number;
    raw_snippet_end?: number;
    source_scope?: string;
}

/**
 * Check if semantic import debug logging is enabled
 */
function isDebugEnabled(): boolean {
    // always true
    return process.env.SEMANTIC_IMPORT_DEBUG === 'true' || process.env.IMPORT_DEBUG === 'true';
}

/**
 * Parse and validate facts from LLM response
 */
export function parseLLMFacts(
    content: string,
    request: FactExtractionRequest
): ExtractedFact[] {
    try {
        const parsed = JSON.parse(content);
        const rawFacts: RawFactFromLLM[] = parsed.facts || [];

        // ==========================================================================
        // LOG 1: Raw LLM output (before ANY processing)
        // This is the truth the model gave us - non-negotiable visibility
        // ==========================================================================
        if (isDebugEnabled()) {
            logger.debug('🔬 [AI BOUNDARY] Raw LLM output', {
                job_id: request.job_id,
                section: request.current_section,
                chunk_index: request.chunk_index,
                model: process.env.OPENAI_EXTRACTION_MODEL || 'gpt-4o-mini',
                raw_content: content.slice(0, 2000), // Truncate for log sanity
                raw_facts_count: rawFacts.length,
            });
        }

        // ==========================================================================
        // LOG 2: Parsed JSON (after JSON.parse, before normalization)
        // This catches camelCase, spacing, pluralization, hallucinated keys
        // ==========================================================================
        if (isDebugEnabled() && rawFacts.length > 0) {
            logger.debug('🔬 [AI BOUNDARY] Parsed JSON before normalization', {
                job_id: request.job_id,
                section: request.current_section,
                chunk_index: request.chunk_index,
                facts: rawFacts.map(f => ({
                    raw_fact_type: f.fact_type,  // CRITICAL: The raw string from LLM
                    value: f.value_text || f.value_number || f.value_date,
                    snippet_preview: f.raw_snippet?.slice(0, 50),
                })),
            });
        }

        const facts = rawFacts.map((raw, index): ExtractedFact => ({
            message_index: request.message_index,
            chunk_index: request.chunk_index,
            source_id: request.source_id,
            source_file_name: request.source_file_name,
            source_scope: normalizeSourceScope(raw.source_scope),

            speaker_role: normalizeSpeakerRole(raw.speaker_role),
            speaker_name: raw.speaker_name,

            fact_type: normalizeFactType(raw.fact_type),
            fact_domain: raw.fact_domain,

            value_text: raw.value_text,
            value_number: typeof raw.value_number === 'number' ? raw.value_number : undefined,
            value_boolean: typeof raw.value_boolean === 'boolean' ? raw.value_boolean : undefined,
            value_date: validateDateValue(raw.value_date),
            value_time: validateTimeValue(raw.value_time),
            value_datetime: raw.value_datetime,

            currency: raw.currency,
            unit: raw.unit,

            direction: normalizeDirection(raw.direction),
            status: normalizeStatus(raw.status),

            confidence: typeof raw.confidence === 'number'
                ? Math.max(0, Math.min(1, raw.confidence))
                : 0.5,
            extraction_reason: raw.extraction_reason,

            raw_snippet: raw.raw_snippet || '',
            raw_snippet_start: raw.raw_snippet_start,
            raw_snippet_end: raw.raw_snippet_end,
        }));

        // Diagnostic logging: track flight facts vs 'other' for debugging
        const flightFacts = facts.filter(f => f.fact_type.startsWith('flight_'));
        const otherFacts = facts.filter(f => f.fact_type === 'other');
        
        if (request.current_section === 'flights') {
            logger.info('Parsed flight section facts', {
                job_id: request.job_id,
                chunk_index: request.chunk_index,
                total: facts.length,
                flightFacts: flightFacts.length,
                otherFacts: otherFacts.length,
                flightFactTypes: flightFacts.map(f => f.fact_type),
                otherFactsPreview: otherFacts.slice(0, 5).map(f => ({
                    rawSnippet: f.raw_snippet?.slice(0, 50),
                    valueText: f.value_text?.slice(0, 30),
                })),
            });

            // Warn if we have lots of 'other' facts in the flights section
            if (otherFacts.length > 0 && flightFacts.length === 0) {
                logger.warn('Flights section produced only "other" facts - possible LLM fact_type issue', {
                    job_id: request.job_id,
                    chunk_index: request.chunk_index,
                    otherCount: otherFacts.length,
                    hint: 'Check if LLM is outputting non-standard fact_type strings',
                });
            }
        }

        return facts;
    } catch (error) {
        logger.error('Failed to parse LLM fact extraction response', { error, content });
        return [];
    }
}
