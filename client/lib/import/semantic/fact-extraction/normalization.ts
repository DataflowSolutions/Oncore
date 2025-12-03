/**
 * Normalization logic for extracted facts
 */

import { FACT_TYPE_TO_IMPORT_FIELD } from '../types';
import type {
    ImportFactType,
    ImportFactDirection,
    ImportFactStatus,
    ImportFactSpeaker,
    ImportSourceScope,
} from '../types';

/**
 * Validate and normalize a fact type from LLM output
 */
export function normalizeFactType(raw?: string): ImportFactType {
    if (!raw) return 'other';

    const normalized = raw.toLowerCase().replace(/[^a-z_]/g, '_');
    const validTypes = Object.keys(FACT_TYPE_TO_IMPORT_FIELD) as ImportFactType[];

    return validTypes.includes(normalized as ImportFactType)
        ? (normalized as ImportFactType)
        : 'other';
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
