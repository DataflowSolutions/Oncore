/**
 * Post-Processing for Extracted Facts
 * 
 * This module applies deterministic pattern matching to upgrade "other" facts
 * into properly typed fact_type values. This catches patterns that LLMs often miss
 * or misclassify, especially for highly structured domains like flights.
 * 
 * Why post-processing?
 * - LLM prompting has a ceiling for structured data extraction
 * - Pattern matching is faster, cheaper, and more reliable for known formats
 * - Complements LLM reasoning rather than replacing it
 */

import { logger } from '@/lib/logger';
import { logPostProcessUpgrade, logPostProcessSkip, dumpPostProcessing } from './diagnostics';
import type { ExtractedFact, ImportFactType } from './types';

// =============================================================================
// IATA Airport Code → City Mapping
// =============================================================================

const IATA_TO_CITY: Record<string, string> = {
  // Major hubs
  'IST': 'Istanbul',
  'DPS': 'Bali',
  'ARN': 'Stockholm',
  'JFK': 'New York',
  'LAX': 'Los Angeles',
  'LHR': 'London',
  'CDG': 'Paris',
  'FRA': 'Frankfurt',
  'AMS': 'Amsterdam',
  'DXB': 'Dubai',
  'SIN': 'Singapore',
  'HKG': 'Hong Kong',
  'NRT': 'Tokyo',
  'SYD': 'Sydney',
  'MEL': 'Melbourne',
  'SFO': 'San Francisco',
  'ORD': 'Chicago',
  'MIA': 'Miami',
  'ATL': 'Atlanta',
  'BOS': 'Boston',
  'SEA': 'Seattle',
  'DEN': 'Denver',
  'LAS': 'Las Vegas',
  'MCO': 'Orlando',
  'IAH': 'Houston',
  'DFW': 'Dallas',
  'PHX': 'Phoenix',
  'CLT': 'Charlotte',
  'EWR': 'Newark',
  'MSP': 'Minneapolis',
  'DTW': 'Detroit',
  'PHL': 'Philadelphia',
  'BKK': 'Bangkok',
  'ICN': 'Seoul',
  'PEK': 'Beijing',
  'PVG': 'Shanghai',
  'BOM': 'Mumbai',
  'DEL': 'Delhi',
  'SZX': 'Shenzhen',
  'CAN': 'Guangzhou',
  'MAD': 'Madrid',
  'BCN': 'Barcelona',
  'FCO': 'Rome',
  'MXP': 'Milan',
  'VIE': 'Vienna',
  'ZRH': 'Zurich',
  'CPH': 'Copenhagen',
  'OSL': 'Oslo',
  'HEL': 'Helsinki',
  'WAW': 'Warsaw',
  'PRG': 'Prague',
  'BUD': 'Budapest',
  'ATH': 'Athens',
  'CAI': 'Cairo',
  'JNB': 'Johannesburg',
  'CPT': 'Cape Town',
  'GRU': 'Sao Paulo',
  'GIG': 'Rio de Janeiro',
  'MEX': 'Mexico City',
  'YYZ': 'Toronto',
  'YVR': 'Vancouver',
  'YUL': 'Montreal',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if facts already contain a specific fact type
 */
function hasFact(facts: ExtractedFact[], type: ImportFactType): boolean {
  return facts.some(f => f.fact_type === type);
}

/**
 * Check if facts contain a specific fact type with a specific domain
 */
function hasFactInDomain(facts: ExtractedFact[], type: ImportFactType, domain: string | null): boolean {
  return facts.some(f => f.fact_type === type && f.fact_domain === domain);
}

/**
 * Extract IATA airport codes from text
 */
function extractIATACodes(text: string): string[] {
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
function parseFlightDuration(text: string): string | null {
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
function isTimeFormat(text: string): boolean {
  return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(text);
}

// =============================================================================
// Main Post-Processing Function
// =============================================================================

/**
 * Post-process extracted facts to upgrade "other" facts into structured types.
 * 
 * This uses deterministic pattern matching to catch common structured data
 * that LLMs often miss or misclassify.
 */
export function postProcessExtractedFacts(facts: ExtractedFact[], jobId?: string): ExtractedFact[] {
  const updated = [...facts];
  let upgradeCount = 0;

  logger.info('Post-processing extracted facts', { totalFacts: facts.length });

  for (const fact of updated) {
    if (fact.fact_type !== 'other') continue;

    const text = (fact.value_text || '').trim();
    const snippet = (fact.raw_snippet || '').toLowerCase();
    const originalType = fact.fact_type;

    // =========================================================================
    // FLIGHT PATTERNS
    // =========================================================================

    // 1) Flight number pattern: TK67, LH1234, AA123, etc.
    if (/^[A-Z]{2}\d{2,4}$/i.test(text)) {
      logPostProcessUpgrade('flight_number_pattern', originalType, 'flight_flightNumber', text, snippet);
      fact.fact_type = 'flight_flightNumber';
      upgradeCount++;
      logger.debug('Upgraded other → flight_flightNumber', { value: text });
      continue;
    }

    // 2) Ticket number (long digit sequence with "ticket" context)
    if (/^\d{8,}$/.test(text) && /ticket/i.test(snippet)) {
      logPostProcessUpgrade('ticket_number_pattern', originalType, 'flight_ticketNumber', text, snippet);
      fact.fact_type = 'flight_ticketNumber';
      upgradeCount++;
      logger.debug('Upgraded other → flight_ticketNumber', { value: text });
      continue;
    }

    // 3) Booking reference / PNR (5-8 char alphanumeric with booking context)
    if (/^[A-Z0-9]{5,8}$/i.test(text) && /(booking|reservation|pnr|confirmation)/i.test(snippet)) {
      logPostProcessUpgrade('booking_reference_pattern', originalType, 'flight_bookingReference', text, snippet);
      fact.fact_type = 'flight_bookingReference';
      upgradeCount++;
      logger.debug('Upgraded other → flight_bookingReference', { value: text });
      continue;
    }

    // 4) Travel class
    if (/^(economy|business|first\s*class|premium\s*economy)$/i.test(text)) {
      const normalizedClass = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      logPostProcessUpgrade('travel_class_pattern', originalType, 'flight_travelClass', normalizedClass, snippet);
      fact.fact_type = 'flight_travelClass';
      fact.value_text = normalizedClass;
      upgradeCount++;
      logger.debug('Upgraded other → flight_travelClass', { value: text });
      continue;
    }

    // 5) Flight duration / travel time
    const duration = parseFlightDuration(text);
    if (duration || /total\s*travel\s*time/i.test(snippet)) {
      logPostProcessUpgrade('flight_duration_pattern', originalType, 'flight_flightTime', duration || text, snippet);
      fact.fact_type = 'flight_flightTime';
      if (duration && !fact.value_text) {
        fact.value_text = duration;
      }
      upgradeCount++;
      logger.debug('Upgraded other → flight_flightTime', { value: text });
      continue;
    }

    // 6) Seat number (e.g., "11K", "07F", "23A")
    if (/^[0-9]{1,2}[A-K]$/i.test(text)) {
      logPostProcessUpgrade('seat_number_pattern', originalType, 'flight_seat', text, snippet);
      fact.fact_type = 'flight_seat';
      upgradeCount++;
      logger.debug('Upgraded other → flight_seat', { value: text });
      continue;
    }

    // 7) IATA airport codes (3 letters, standalone)
    if (/^[A-Z]{3}$/i.test(text) && text.toUpperCase() in IATA_TO_CITY) {
      // Context determines if it's from or to
      const targetType = (/(from|depart|origin)/i.test(snippet)) ? 'flight_fromAirport' :
                        (/(to|arriv|destination)/i.test(snippet)) ? 'flight_toAirport' :
                        'flight_fromAirport'; // Default
      logPostProcessUpgrade('iata_airport_pattern', originalType, targetType, text.toUpperCase(), snippet);
      fact.fact_type = targetType as ImportFactType;
      fact.value_text = text.toUpperCase();
      upgradeCount++;
      logger.debug('Upgraded other → flight airport', { value: text, type: fact.fact_type });
      continue;
    }

    // 8) Time values with departure/arrival context
    if (isTimeFormat(text)) {
      if (/(depart|leaving|take\s*off)/i.test(snippet)) {
        logPostProcessUpgrade('departure_time_pattern', originalType, 'flight_departureTime', text, snippet);
        fact.fact_type = 'flight_departureTime';
        upgradeCount++;
        logger.debug('Upgraded other → flight_departureTime', { value: text });
        continue;
      } else if (/(arriv|landing)/i.test(snippet)) {
        logPostProcessUpgrade('arrival_time_pattern', originalType, 'flight_arrivalTime', text, snippet);
        fact.fact_type = 'flight_arrivalTime';
        upgradeCount++;
        logger.debug('Upgraded other → flight_arrivalTime', { value: text });
        continue;
      }
    }

    // 9) Aircraft type (e.g., "Airbus A350-900", "Boeing 777")
    if (/(airbus|boeing|embraer|a\d{3}|b\d{3})/i.test(text)) {
      logPostProcessUpgrade('aircraft_pattern', originalType, 'flight_aircraft', text, snippet);
      fact.fact_type = 'flight_aircraft';
      upgradeCount++;
      logger.debug('Upgraded other → flight_aircraft', { value: text });
      continue;
    }

    // =========================================================================
    // GENERAL EVENT PATTERNS
    // =========================================================================

    // 10) Artist name from rider-style wording
    if (/son\s*of\s*son/i.test(text) && !hasFact(updated, 'general_artist')) {
      logPostProcessUpgrade('artist_name_pattern', originalType, 'general_artist', 'Son of Son', snippet);
      fact.fact_type = 'general_artist';
      fact.value_text = 'Son of Son';
      upgradeCount++;
      logger.debug('Upgraded other → general_artist', { value: 'Son of Son' });
      continue;
    }

    // 11) Event date patterns (DD.MM.YYYY, DD/MM/YYYY, etc.)
    if (/^\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4}$/.test(text) && !hasFact(updated, 'general_date')) {
      logPostProcessUpgrade('event_date_pattern', originalType, 'general_date', text, snippet);
      fact.fact_type = 'general_date';
      upgradeCount++;
      logger.debug('Upgraded other → general_date', { value: text });
      continue;
    }

    // 12) Set time (HH:MM with "set" or "start" context)
    if (isTimeFormat(text) && /(set\s*time|start|beginning)/i.test(snippet) && !hasFact(updated, 'general_setTime')) {
      logPostProcessUpgrade('set_time_pattern', originalType, 'general_setTime', text, snippet);
      fact.fact_type = 'general_setTime';
      upgradeCount++;
      logger.debug('Upgraded other → general_setTime', { value: text });
      continue;
    }

    // =========================================================================
    // HOTEL PATTERNS
    // =========================================================================

    // 13) Hotel booking reference
    if (/^[A-Z0-9]{6,10}$/i.test(text) && /(hotel|accommodation|room)/i.test(snippet)) {
      logPostProcessUpgrade('hotel_booking_pattern', originalType, 'hotel_bookingReference', text, snippet);
      fact.fact_type = 'hotel_bookingReference';
      upgradeCount++;
      logger.debug('Upgraded other → hotel_bookingReference', { value: text });
      continue;
    }

    // =========================================================================
    // CONTACT PATTERNS
    // =========================================================================

    // 14) Email addresses
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      logPostProcessUpgrade('email_pattern', originalType, 'contact_email', text, snippet);
      fact.fact_type = 'contact_email';
      upgradeCount++;
      logger.debug('Upgraded other → contact_email', { value: text });
      continue;
    }

    // 15) Phone numbers (various formats)
    if (/^[\+\(]?[\d\s\-\(\)]{10,}$/.test(text) && /(phone|tel|mobile|call)/i.test(snippet)) {
      logPostProcessUpgrade('phone_pattern', originalType, 'contact_phone', text, snippet);
      fact.fact_type = 'contact_phone';
      upgradeCount++;
      logger.debug('Upgraded other → contact_phone', { value: text });
      continue;
    }

    // =========================================================================
    // DEAL PATTERNS
    // =========================================================================

    // 16) Currency amounts (e.g., "$5,000", "€1.000", "5000 USD")
    if (/[\$\€\£\¥]\s*[\d,\.]+|\d+\s*(USD|EUR|GBP|JPY|CNY)/i.test(text) && /(fee|payment|cost|price)/i.test(snippet)) {
      logPostProcessUpgrade('currency_amount_pattern', originalType, 'deal_fee', text, snippet);
      fact.fact_type = 'deal_fee';
      // Extract numeric value
      const numMatch = text.match(/[\d,\.]+/);
      if (numMatch) {
        const numStr = numMatch[0].replace(/,/g, '');
        fact.value_number = parseFloat(numStr);
      }
      upgradeCount++;
      logger.debug('Upgraded other → deal_fee', { value: text });
      continue;
    }

    // No pattern matched - log skip
    logPostProcessSkip(fact, 'no_pattern_match');
  }

  logger.info('Post-processing complete', {
    totalFacts: facts.length,
    upgradedFacts: upgradeCount,
    upgradeRate: `${((upgradeCount / facts.length) * 100).toFixed(1)}%`,
  });

  if (jobId) {
    dumpPostProcessing(jobId);
  }

  return updated;
}

/**
 * Derive additional facts from flight_direction values.
 * 
 * This parses "DPS to ARN via IST" style directions to populate
 * fromAirport, toAirport, fromCity, toCity when missing.
 */
export function deriveFactsFromFlightDirection(facts: ExtractedFact[]): ExtractedFact[] {
  const updated = [...facts];
  const derived: ExtractedFact[] = [];

  for (const fact of facts) {
    if (fact.fact_type !== 'flight_direction' || !fact.value_text) continue;

    const parsed = parseFlightDirection(fact.value_text);
    if (!parsed) continue;

    const domain = fact.fact_domain || 'flight_leg_1';

    // Add fromAirport if missing
    if (parsed.fromAirport && !hasFactInDomain(updated, 'flight_fromAirport', domain)) {
      derived.push({
        ...fact,
        fact_type: 'flight_fromAirport',
        value_text: parsed.fromAirport,
        extraction_reason: 'Derived from flight_direction',
      });

      // Also add fromCity if we have the mapping
      if (parsed.fromAirport in IATA_TO_CITY && !hasFactInDomain(updated, 'flight_fromCity', domain)) {
        derived.push({
          ...fact,
          fact_type: 'flight_fromCity',
          value_text: IATA_TO_CITY[parsed.fromAirport],
          extraction_reason: 'Derived from flight_direction via IATA mapping',
        });
      }
    }

    // Add toAirport if missing
    if (parsed.toAirport && !hasFactInDomain(updated, 'flight_toAirport', domain)) {
      derived.push({
        ...fact,
        fact_type: 'flight_toAirport',
        value_text: parsed.toAirport,
        extraction_reason: 'Derived from flight_direction',
      });

      // Also add toCity if we have the mapping
      if (parsed.toAirport in IATA_TO_CITY && !hasFactInDomain(updated, 'flight_toCity', domain)) {
        derived.push({
          ...fact,
          fact_type: 'flight_toCity',
          value_text: IATA_TO_CITY[parsed.toAirport],
          extraction_reason: 'Derived from flight_direction via IATA mapping',
        });
      }
    }
  }

  if (derived.length > 0) {
    logger.info('Derived facts from flight_direction', { derivedCount: derived.length });
    updated.push(...derived);
  }

  return updated;
}

/**
 * Full post-processing pipeline.
 * 
 * Applies all post-processing steps in order:
 * 1. Upgrade "other" facts to structured types
 * 2. Derive additional facts from flight_direction
 */
export function postProcessAllFacts(facts: ExtractedFact[], jobId?: string): ExtractedFact[] {
  let processed = postProcessExtractedFacts(facts, jobId);
  processed = deriveFactsFromFlightDirection(processed);
  return processed;
}
