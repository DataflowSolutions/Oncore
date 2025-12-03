/**
 * Application Layer
 * 
 * Handles applying resolved facts to the ImportData structure.
 * This includes:
 * - Mapping fact types to ImportData fields
 * - Managing array items (flights, hotels, contacts, etc.)
 * - Domain-based grouping
 * - Field normalization
 */

import { logger } from '@/lib/logger';
import type { ImportData } from '@/components/import/types';
import {
  createEmptyImportData,
  createEmptyHotel,
  createEmptyFood,
  createEmptyFlight,
  createEmptyActivity,
  createEmptyContact,
  createEmptyDocument,
} from '@/components/import/types';
import type {
  ImportFact,
  FactResolution,
  ImportFactType,
  ImportSourceScope,
} from './types';
import { FACT_TYPE_TO_IMPORT_FIELD } from './types';

// =============================================================================
// Singleton Informational Fields
// =============================================================================

/**
 * Fields that should be treated as resolved if they have exactly one informational fact
 */
const SINGLETON_INFORMATIONAL_FIELDS = new Set<ImportFactType>([
  'general_artist',
  'general_venue',
  'general_date',
  'general_eventName',
  'general_city',
  'general_country',
  'deal_fee',
  'deal_currency',
  'deal_dealType',
]);

// =============================================================================
// Application
// =============================================================================

/**
 * Build a map of fact_type -> count for quick lookups
 */
function buildFactCountMap(facts: ImportFact[]): Map<ImportFactType, number> {
  const counts = new Map<ImportFactType, number>();
  for (const fact of facts) {
    counts.set(fact.fact_type, (counts.get(fact.fact_type) || 0) + 1);
  }
  return counts;
}

/**
 * Apply resolved facts to ImportData structure
 */
export function applyResolutionsToImportData(
  resolutions: FactResolution[],
  selectedFacts: ImportFact[]
): ImportData {
  const data = createEmptyImportData();

  const factsById = new Map<string, ImportFact>();
  for (const fact of selectedFacts) {
    factsById.set(fact.id, fact);
  }

  const factCounts = buildFactCountMap(selectedFacts);

  // Diagnostic logging
  const infoResolutions = resolutions.filter(r => r.state === 'informational');
  logger.info(`[Semantic] Applying resolutions: ${resolutions.length} total, ${infoResolutions.length} informational`);

  for (let resolution of resolutions) {
    // =================================================================
    // SINGLETON INFORMATIONAL RULE:
    // For singleton fields with exactly one informational fact, treat as resolved
    // =================================================================
    if (
      resolution.state === 'informational' &&
      SINGLETON_INFORMATIONAL_FIELDS.has(resolution.fact_type) &&
      (factCounts.get(resolution.fact_type) || 0) === 1
    ) {
      logger.info(
        `[Semantic] ${resolution.fact_type}: singleton informational fact - treating as resolved`
      );
      // Create new resolution with state overridden
      resolution = { ...resolution, state: 'resolved' };
    }

    // =================================================================
    // HARD RULE: Only 'resolved' and 'informational' states write to data
    // 'unagreed' and 'missing' are VALID OUTCOMES that produce NO data
    // =================================================================
    if (resolution.state === 'unagreed' || resolution.state === 'missing') {
      logger.debug(
        `[Semantic] ${resolution.fact_type}: state='${resolution.state}' - NOT writing (expected)`
      );
      continue;
    }

    // Allow 'informational' state to proceed (it acts like resolved for data application)
    if (resolution.state !== 'resolved' && resolution.state !== 'informational') {
      logger.warn(
        `[Semantic] Unexpected resolution state '${resolution.state}' for ${resolution.fact_type} - skipping`
      );
      continue;
    }

    const fact =
      resolution.selected_fact_id && factsById.get(resolution.selected_fact_id)
        ? (factsById.get(resolution.selected_fact_id) as ImportFact)
        : null;

    // Case 1: No selected fact ID (LLM provided value directly)
    if (!resolution.selected_fact_id) {
      applyFactToImportData(data, undefined, resolution);
      continue;
    }

    // Case 2: Selected fact ID exists, but fact not found in DB/map
    // This happens if the fact wasn't correctly marked as selected in DB or fetch failed
    if (!fact) {
      // Fallback: Use the resolution's final values if present
      if (resolution.final_value_text || resolution.final_value_number || resolution.final_value_date) {
        logger.warn(
          `[Semantic] Selected fact ${resolution.selected_fact_id} not found in map, but resolution has values - applying fallback`,
          { factType: resolution.fact_type, value: resolution.final_value_text }
        );
        applyFactToImportData(data, undefined, resolution);
      } else {
        logger.warn(
          `[Semantic] Selected fact ${resolution.selected_fact_id} not found in map and no fallback values - skipping`
        );
      }
      continue;
    }

    if (fact.status === 'rejected' || fact.status === 'withdrawn' || fact.status === 'question') {
      logger.error(
        `[Semantic] HARD RULE VIOLATION: Attempting to apply fact ${fact.id} with ` +
        `status '${fact.status}' to canonical data. This should have been caught by validation.`
      );
      continue;
    }

    applyFactToImportData(data, fact, resolution);
  }

  normalizeGeneralLocation(data);
  return data;
}

/**
 * Normalize location fields in general section
 */
function normalizeGeneralLocation(data: ImportData): void {
  const city = (data.general.city || '').toLowerCase();
  const venue = (data.general.venue || '').toLowerCase();
  const country = (data.general.country || '').toLowerCase();

  const mentionsDubai = city.includes('dubai') || venue.includes('dubai') || venue.includes('uae');
  if (mentionsDubai && !country.includes('uae')) {
    data.general.country = 'UAE';
  }

  if (!data.general.eventName) {
    const artist = data.general.artist || '';
    const primaryLocation = data.general.venue || data.general.city || '';
    if (artist && primaryLocation) {
      data.general.eventName = `${artist} @ ${primaryLocation}`;
    }
  }
}

// =============================================================================
// Fact Application
// =============================================================================

/**
 * Apply a single fact to ImportData
 */
function applyFactToImportData(
  data: ImportData,
  fact: ImportFact | undefined,
  resolution: FactResolution
): void {
  const factType = fact?.fact_type ?? resolution.fact_type;
  const resolvedNumber = resolution.final_value_number ?? fact?.value_number;
  const resolvedDate = resolution.final_value_date ?? fact?.value_date;
  const resolvedText = resolution.final_value_text ?? fact?.value_text;

  let value: string | undefined;
  // For date fields, prefer date/text over number
  if (factType === 'general_date' || factType.includes('Date')) {
    value =
      resolvedDate ||
      resolvedText ||
      (resolvedNumber !== undefined ? String(resolvedNumber) : undefined) ||
      fact?.value_date ||
      fact?.value_text ||
      (fact?.value_number !== undefined ? String(fact.value_number) : undefined);
  } else {
    value =
      resolvedText ||
      (resolvedNumber !== undefined ? String(resolvedNumber) : undefined) ||
      resolvedDate ||
      fact?.value_text ||
      (fact?.value_number !== undefined ? String(fact.value_number) : undefined) ||
      fact?.value_date;
  }

  if (!value) return;

  const factDomain = resolution.fact_domain ?? fact?.fact_domain ?? null;
  const factSourceScope = (fact?.source_scope as ImportSourceScope | undefined) ?? 'unknown';

  const fieldPath = FACT_TYPE_TO_IMPORT_FIELD[factType];

  if (fieldPath) {
    applyValueToField(data, fieldPath, value, factType, factDomain, factSourceScope);
  }
}

/**
 * Apply a value to a specific field path in ImportData
 */
function applyValueToField(
  data: ImportData,
  fieldPath: string,
  value: string,
  factType: ImportFactType,
  factDomain: string | null,
  factSourceScope: ImportSourceScope
): void {
  const parts = fieldPath.split('.');
  if (parts.length === 2) {
    const [section, field] = parts;
    if (section === 'general' || section === 'deal' || section === 'technical') {
      (data[section] as any)[field] = value;
      return;
    }
  }

  if (parts.length === 3) {
    const [arrayKey, arrayField, itemField] = parts;
    const array = (data as any)[arrayKey];
    if (!Array.isArray(array)) {
      logger.warn(`Field path ${fieldPath} does not point to an array`);
      return;
    }

    const index = resolveArrayIndex(arrayKey, factDomain, factType, value, array);

    // Ensure array has an element at the target index
    while (array.length <= index) {
      const newItem = createEmptyArrayItem(arrayKey);
      if (arrayKey === 'flights' || arrayKey === 'hotels' || arrayKey === 'contacts') {
        (newItem as any)._domain = factDomain || `${arrayKey.slice(0, -1)}_${array.length + 1}`;
        (newItem as any)._source_scope = factSourceScope;
      }
      array.push(newItem);
    }

    const item = array[index];
    if (!item) {
      logger.warn(`Could not find or create item at index ${index} for ${arrayKey}`);
      return;
    }

    // Update metadata
    if ('_domain' in item && !item._domain) {
      item._domain = factDomain || `${arrayKey.slice(0, -1)}_${index + 1}`;
    }
    if ('_source_scope' in item && factSourceScope !== 'unknown') {
      const currentScope = item._source_scope as ImportSourceScope | undefined;
      if (!currentScope || scopePriority(factSourceScope) > scopePriority(currentScope)) {
        item._source_scope = factSourceScope;
      }
    }

    // Set the field value
    (item as any)[itemField] = value;
  }
}

/**
 * Create an empty array item based on array key
 */
function createEmptyArrayItem(arrayKey: string): object {
  switch (arrayKey) {
    case 'flights':
      return createEmptyFlight();
    case 'hotels':
      return createEmptyHotel();
    case 'food':
      return createEmptyFood();
    case 'activities':
      return createEmptyActivity();
    case 'contacts':
      return createEmptyContact();
    case 'documents':
      return createEmptyDocument();
    default:
      return {};
  }
}

// =============================================================================
// Domain & Index Resolution
// =============================================================================

/**
 * Normalize domain strings for consistent matching
 */
function normalizeDomain(arrayKey: string, factDomain: string | null): string | null {
  if (!factDomain) return null;
  const lower = factDomain.toLowerCase().trim();
  if (arrayKey === 'flights' && lower.startsWith('flight_leg_')) return lower;
  if (arrayKey === 'flights' && lower.startsWith('flight_')) return lower.replace('flight_', 'flight_leg_');
  if (arrayKey === 'hotels' && lower === 'hotel_main') return 'hotel_main';
  return lower;
}

/**
 * Map domain to array index (for known domain patterns)
 */
function domainToIndex(arrayKey: string, domain: string | null): number {
  if (!domain) return 0;
  const lower = domain.toLowerCase();
  if (arrayKey === 'flights') {
    if (lower.startsWith('flight_leg_')) {
      const suffix = Number(lower.replace('flight_leg_', ''));
      return Number.isFinite(suffix) && suffix >= 1 ? suffix - 1 : 0;
    }
  }
  if (arrayKey === 'hotels' && domain === 'hotel_main') return 0;
  if (arrayKey === 'contacts' && domain.startsWith('contact_')) {
    const map: Record<string, number> = {
      contact_promoter: 0,
      contact_main: 0,
      contact_agent: 1,
      contact_tour_manager: 2,
      contact_manager: 2,
    };
    if (domain in map) return map[domain];
    const suffix = Number(domain.replace('contact_', ''));
    return Number.isFinite(suffix) && suffix >= 1 ? suffix - 1 : 0;
  }
  return 0;
}

/**
 * Resolve which array index to apply a fact to
 */
function resolveArrayIndex(
  arrayKey: string,
  domain: string | null,
  factType: ImportFactType,
  value: string,
  array: any[]
): number {
  if (arrayKey === 'flights') {
    if (domain) {
      const existing = array.findIndex((i: any) => i._domain === domain);
      if (existing >= 0) return existing;
      if (domain.startsWith('flight_leg_') || domain.startsWith('flight_')) return domainToIndex(arrayKey, domain);
      return array.length;
    }
    // No domain: if this is a flight number, try to place by unique number
    if (factType === 'flight_flightNumber' && value) {
      const existingIdx = array.findIndex((f: any) => (f.flightNumber || '').toLowerCase() === value.toLowerCase());
      if (existingIdx >= 0) return existingIdx;
      return array.length; // new flight leg
    }
    // For other flight fields without domain, attach to the most recent leg
    if (array.length > 0) return array.length - 1;
    return 0;
  }
  if (arrayKey === 'hotels' || arrayKey === 'contacts') {
    if (domain) return domainToIndex(arrayKey, domain);
  }
  return 0;
}

/**
 * Get priority of a source scope (higher = more authoritative)
 */
function scopePriority(scope: ImportSourceScope): number {
  const order: Record<ImportSourceScope, number> = {
    contract_main: 100,
    itinerary: 90,
    confirmation: 80,
    rider_example: 30,
    general_info: 20,
    unknown: 10,
  };
  return order[scope] || 10;
}
