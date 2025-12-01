/**
 * Semantic Import Types
 * 
 * Types for the two-stage semantic import pipeline:
 * - Stage 1: Candidate Fact Extraction (per chunk)
 * - Stage 2: Semantic Resolution (global reasoning)
 */

// =============================================================================
// Fact Types (matching database enums)
// =============================================================================

export type ImportFactType =
  | 'artist_fee'
  | 'venue_cost'
  | 'production_cost'
  | 'catering_cost'
  | 'accommodation_cost'
  | 'travel_cost'
  | 'other_cost'
  | 'event_date'
  | 'event_time'
  | 'set_time'
  | 'venue_name'
  | 'venue_city'
  | 'venue_country'
  | 'venue_capacity'
  | 'artist_name'
  | 'event_name'
  // Hotel fields
  | 'hotel_name'
  | 'hotel_address'
  | 'hotel_city'
  | 'hotel_country'
  | 'hotel_checkin'
  | 'hotel_checkout'
  | 'hotel_booking_reference'
  | 'hotel_phone'
  | 'hotel_email'
  | 'hotel_notes'
  // Flight fields
  | 'flight_number'
  | 'flight_origin_city'
  | 'flight_origin_airport'
  | 'flight_destination_city'
  | 'flight_destination_airport'
  | 'flight_departure_datetime'
  | 'flight_arrival_datetime'
  | 'flight_airline'
  | 'flight_passenger_name'
  | 'flight_booking_reference'
  | 'flight_ticket_number'
  | 'flight_seat'
  | 'flight_class'
  | 'flight_aircraft_model'
  | 'flight_duration'
  | 'flight_departure'  // Legacy
  | 'flight_arrival'    // Legacy
  // Contact fields
  | 'contact_name'
  | 'contact_email'
  | 'contact_phone'
  | 'contact_role'
  // Deal fields
  | 'currency'
  | 'payment_terms'
  | 'deal_type'
  | 'deal_notes'
  // Technical fields
  | 'technical_requirement'
  | 'technical_equipment_summary'
  | 'technical_backline_summary'
  | 'technical_stage_setup_summary'
  | 'technical_lighting_summary'
  | 'technical_soundcheck_summary'
  | 'technical_other_summary'
  // Catering / food provider fields
  | 'catering_detail'
  | 'catering_summary'
  | 'catering_provider_name'
  | 'catering_provider_address'
  | 'catering_provider_city'
  | 'catering_provider_country'
  | 'catering_provider_phone'
  | 'catering_provider_email'
  | 'catering_booking_reference'
  // Activities / transfers
  | 'transfer_summary'
  | 'ground_transport_summary'
  | 'activity_detail'
  | 'general_note'
  | 'other';

export type ImportFactDirection =
  | 'we_pay'
  | 'they_pay'
  | 'included'
  | 'external_cost'
  | 'split'
  | 'unknown';

export type ImportFactStatus =
  | 'offer'
  | 'counter_offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'info'
  | 'question'
  | 'final'
  | 'unknown';

export type ImportFactSpeaker =
  | 'artist'
  | 'artist_agent'
  | 'promoter'
  | 'venue'
  | 'production'
  | 'unknown';

export type ExtractionStage =
  | 'pending'
  | 'extracting_facts'
  | 'facts_complete'
  | 'resolving'
  | 'resolved'
  | 'applying'
  | 'completed';

// =============================================================================
// Source Scope (provenance of a fact)
// =============================================================================

export type ImportSourceScope =
  | 'contract_main'
  | 'itinerary'
  | 'confirmation'
  | 'rider_example'
  | 'general_info'
  | 'unknown';

// =============================================================================
// Extracted Fact (from LLM during Stage 1)
// =============================================================================

/**
 * A single candidate fact extracted from source text.
 * This represents one claim made in the source material.
 */
export interface ExtractedFact {
  /** Ordering within the source for respecting conversation order */
  message_index: number;
  /** Chunk index within the source */
  chunk_index: number;
  /** Source file/document ID */
  source_id?: string;
  /** Source file name for display */
  source_file_name?: string;
  /** Provenance classification for the source document */
  source_scope?: ImportSourceScope;
  
  /** Who made this statement */
  speaker_role: ImportFactSpeaker;
  /** Speaker's name if known */
  speaker_name?: string;
  
  /** What domain this fact belongs to */
  fact_type: ImportFactType;
  /** Optional grouping key (e.g., "hotel_1", "flight_artist") */
  fact_domain?: string;
  
  /** The actual value - one of these will be set */
  value_text?: string;
  value_number?: number;
  value_boolean?: boolean;
  value_date?: string; // ISO date string
  value_time?: string; // HH:MM format
  value_datetime?: string; // ISO datetime string
  
  /** Currency code if applicable (USD, EUR, GBP, etc.) */
  currency?: string;
  /** Unit if applicable (nights, people, kg, etc.) */
  unit?: string;
  
  /** Who pays for this (for costs) */
  direction: ImportFactDirection;
  
  /** Negotiation state of this fact */
  status: ImportFactStatus;
  
  /** AI confidence in this extraction (0-1) */
  confidence: number;
  /** Why the AI extracted this fact */
  extraction_reason?: string;
  
  /** Original text slice for auditability */
  raw_snippet: string;
  /** Character offset start in source */
  raw_snippet_start?: number;
  /** Character offset end in source */
  raw_snippet_end?: number;
}

/**
 * Database representation of an extracted fact
 */
export interface ImportFact extends ExtractedFact {
  id: string;
  job_id: string;
  show_id?: string | null;
  
  /** References to related facts */
  supersedes_fact_id?: string | null;
  related_fact_ids?: string[];
  
  /** Selection state (set during Stage 2) */
  is_selected: boolean;
  selection_reason?: string | null;
  selected_at?: string | null;
  
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Stage 1: Fact Extraction Request/Response
// =============================================================================

/**
 * Request to extract facts from a chunk of text
 */
export interface FactExtractionRequest {
  /** Job ID for context */
  job_id: string;
  /** Source document ID */
  source_id: string;
  /** Source file name */
  source_file_name: string;
  /** Chunk index within source */
  chunk_index: number;
  /** The text to extract from */
  chunk_text: string;
  /** Previous facts for context (to detect counter-offers, etc.) */
  previous_facts?: ExtractedFact[];
  /** Message index for ordering */
  message_index: number;
}

/**
 * Result from fact extraction
 */
export interface FactExtractionResult {
  /** Extracted facts from this chunk */
  facts: ExtractedFact[];
  /** Any extraction warnings/errors */
  warnings?: string[];
}

// =============================================================================
// Stage 2: Semantic Resolution Types
// =============================================================================

/**
 * Resolution state for a fact type/domain
 */
export type ResolutionState =
  | 'resolved'       // A final value was determined
  | 'unagreed'       // Offers exist but none accepted
  | 'conflicting'    // Multiple conflicting final values
  | 'missing'        // No facts found for this type
  | 'informational'; // Value is informational, not negotiated

/**
 * A single resolution decision
 */
export interface FactResolution {
  /** What type of fact this resolves */
  fact_type: ImportFactType;
  /** Optional domain grouping */
  fact_domain?: string;
  /** The selected fact ID (null if unresolved) */
  selected_fact_id: string | null;
  /** Resolution state */
  state: ResolutionState;
  /** Human-readable reason for this decision */
  reason: string;
  /** The final value if resolved */
  final_value_text?: string;
  final_value_number?: number;
  final_value_date?: string;
  /** 
   * Computed confidence score (0-1).
   * This is COMPUTED from objective signals (repetition, status, speaker authority, 
   * contradictions, confirmation phrases) - NOT model self-reported confidence.
   */
  confidence?: number;
  /** AI reasoning trace for debugging */
  reasoning_trace?: ReasoningStep[];
}

/**
 * A step in the AI's reasoning process
 */
export interface ReasoningStep {
  step: number;
  action: string;
  observation: string;
  conclusion?: string;
}

/**
 * Request for semantic resolution
 */
export interface ResolutionRequest {
  /** Job ID */
  job_id: string;
  /** All facts extracted for this job */
  facts: ImportFact[];
}

/**
 * Result from semantic resolution
 */
export interface ResolutionResult {
  /** Resolution decisions for each fact type */
  resolutions: FactResolution[];
  /** Facts marked as selected */
  selected_fact_ids: string[];
  /** Any resolution warnings */
  warnings?: string[];
}

// =============================================================================
// Mapped Import Data (for applying resolved facts to canonical structure)
// =============================================================================

/**
 * Mapping from fact types to ImportData fields
 */
export const FACT_TYPE_TO_IMPORT_FIELD: Record<ImportFactType, string[]> = {
  // Deal / costs
  artist_fee: ['deal.fee'],
  venue_cost: [],
  production_cost: [],
  catering_cost: [],
  accommodation_cost: [],
  travel_cost: [],
  other_cost: [],
  currency: ['deal.currency'],
  payment_terms: ['deal.paymentTerms'],
  deal_type: ['deal.dealType'],
  deal_notes: ['deal.notes'],
  
  // Event / general
  event_date: ['general.date'],
  event_time: ['general.setTime'],
  set_time: ['general.setTime'],
  venue_name: ['general.venue'],
  venue_city: ['general.city'],
  venue_country: ['general.country'],
  venue_capacity: ['technical.other'],
  artist_name: ['general.artist'],
  event_name: ['general.eventName'],
  
  // Hotels
  hotel_name: ['hotels[].name'],
  hotel_address: ['hotels[].address'],
  hotel_city: ['hotels[].city'],
  hotel_country: ['hotels[].country'],
  hotel_checkin: ['hotels[].checkInDate', 'hotels[].checkInTime'],
  hotel_checkout: ['hotels[].checkOutDate', 'hotels[].checkOutTime'],
  hotel_booking_reference: ['hotels[].bookingReference'],
  hotel_phone: ['hotels[].phone'],
  hotel_email: ['hotels[].email'],
  hotel_notes: ['hotels[].notes'],
  
  // Flights
  flight_number: ['flights[].flightNumber'],
  flight_airline: ['flights[].airline'],
  flight_passenger_name: ['flights[].fullName'],
  flight_booking_reference: ['flights[].bookingReference'],
  flight_ticket_number: ['flights[].ticketNumber'],
  flight_seat: ['flights[].seat'],
  flight_class: ['flights[].travelClass'],
  flight_aircraft_model: ['flights[].aircraft'],
  flight_duration: ['flights[].flightTime'],
  flight_origin_city: ['flights[].fromCity'],
  flight_origin_airport: ['flights[].fromAirport'],
  flight_destination_city: ['flights[].toCity'],
  flight_destination_airport: ['flights[].toAirport'],
  flight_departure_datetime: ['flights[].departureDate', 'flights[].departureTime'],
  flight_arrival_datetime: ['flights[].arrivalDate', 'flights[].arrivalTime'],
  // Legacy fields: only apply to time/date when parseable; do NOT map to airports anymore
  flight_departure: ['flights[].departureDate', 'flights[].departureTime'],
  flight_arrival: ['flights[].arrivalDate', 'flights[].arrivalTime'],
  
  // Contacts
  contact_name: ['contacts[].name'],
  contact_email: ['contacts[].email'],
  contact_phone: ['contacts[].phone'],
  contact_role: ['contacts[].role'],
  
  // Technical
  technical_requirement: ['technical.equipment', 'technical.other'],
  technical_equipment_summary: ['technical.equipment'],
  technical_backline_summary: ['technical.backline'],
  technical_stage_setup_summary: ['technical.stageSetup'],
  technical_lighting_summary: ['technical.lightingRequirements'],
  technical_soundcheck_summary: ['technical.soundcheck'],
  technical_other_summary: ['technical.other'],
  
  // Catering / food
  catering_detail: ['food[].notes'],
  catering_summary: ['food[].notes'],
  catering_provider_name: ['food[].name'],
  catering_provider_address: ['food[].address'],
  catering_provider_city: ['food[].city'],
  catering_provider_country: ['food[].country'],
  catering_provider_phone: ['food[].phone'],
  catering_provider_email: ['food[].email'],
  catering_booking_reference: ['food[].bookingReference'],
  
  // Activities / transfers
  transfer_summary: ['activities[].notes'],
  ground_transport_summary: ['activities[].notes'],
  activity_detail: ['activities[].notes'],
  
  // Misc
  general_note: ['deal.notes'],
  other: [],
};

// =============================================================================
// Cost Domain Classification
// =============================================================================

/**
 * Groups related fact types into cost domains to prevent
 * incorrect merging (e.g., artist fee vs venue cost)
 */
export const COST_DOMAINS: Record<string, ImportFactType[]> = {
  artist: ['artist_fee'],
  venue: ['venue_cost'],
  production: ['production_cost'],
  catering: ['catering_cost'],
  accommodation: ['accommodation_cost'],
  travel: ['travel_cost'],
  other: ['other_cost'],
};

/**
 * Get the cost domain for a fact type
 */
export function getCostDomain(factType: ImportFactType): string | null {
  for (const [domain, types] of Object.entries(COST_DOMAINS)) {
    if (types.includes(factType)) {
      return domain;
    }
  }
  return null;
}

/**
 * Check if two fact types are in competing cost domains
 * (should never be merged or confused)
 */
export function areCompetingCostDomains(type1: ImportFactType, type2: ImportFactType): boolean {
  const domain1 = getCostDomain(type1);
  const domain2 = getCostDomain(type2);
  
  // If neither is a cost, they don't compete
  if (!domain1 || !domain2) return false;
  
  // If they're the same domain, they don't compete
  if (domain1 === domain2) return false;
  
  // Different cost domains = competing
  return true;
}

// =============================================================================
// Negotiation Priority Rules
// =============================================================================

/**
 * Priority order for fact status during resolution.
 * Higher number = higher priority when selecting final value.
 * 
 * CRITICAL: These are HARD RULES enforced server-side, not suggestions.
 */
export const STATUS_PRIORITY: Record<ImportFactStatus, number> = {
  final: 100,
  accepted: 90,
  counter_offer: 40,
  offer: 30,
  info: 20,
  question: 10,
  withdrawn: 5,
  rejected: 0, // Rejected facts should never be selected
  unknown: 15,
};

/**
 * Statuses that can NEVER be selected as final truth.
 * This is a HARD RULE - LLM cannot override this.
 */
export const NEVER_SELECTABLE_STATUSES: ImportFactStatus[] = [
  'rejected',
  'withdrawn',
  'question',
];

/**
 * Check if a fact status can be considered final
 */
export function isFinalizableStatus(status: ImportFactStatus): boolean {
  return status === 'accepted' || status === 'final';
}

/**
 * Check if a fact status indicates rejection
 */
export function isRejectedStatus(status: ImportFactStatus): boolean {
  return status === 'rejected' || status === 'withdrawn';
}

/**
 * HARD RULE: Check if a status can EVER be selected.
 * This is enforced server-side regardless of what LLM says.
 */
export function isSelectableStatus(status: ImportFactStatus): boolean {
  return !NEVER_SELECTABLE_STATUSES.includes(status);
}

// =============================================================================
// Speaker Role Authority Rules
// =============================================================================

/**
 * Speaker authority weight for different contexts.
 * Higher weight = more authority for acceptance/decision.
 */
export const SPEAKER_AUTHORITY: Record<ImportFactSpeaker, number> = {
  promoter: 100,      // Promoter acceptance is highest authority
  artist_agent: 90,   // Agent speaks for artist
  artist: 85,         // Artist direct communication
  venue: 70,          // Venue has authority on venue matters
  production: 60,     // Production has authority on technical
  unknown: 30,        // Unknown speakers get low priority
};

/**
 * Speaker role restrictions - which speakers can provide authoritative
 * information for which fact types.
 */
export const SPEAKER_FACT_AUTHORITY: Partial<Record<ImportFactSpeaker, ImportFactType[]>> = {
  venue: [
    'venue_cost', 'venue_name', 'venue_city', 'venue_country', 
    'venue_capacity', 'technical_requirement',
  ],
  production: [
    'production_cost', 'technical_requirement',
  ],
  // promoter, artist, artist_agent can speak to all fact types
};

/**
 * Check if a speaker has authority to provide information for a fact type.
 * Returns true if the speaker can speak to this fact type authoritatively.
 */
export function speakerHasAuthority(speaker: ImportFactSpeaker, factType: ImportFactType): boolean {
  // Promoter, artist, and artist_agent have universal authority
  if (speaker === 'promoter' || speaker === 'artist' || speaker === 'artist_agent') {
    return true;
  }
  
  // Check if speaker has specific authority for this fact type
  const authorizedTypes = SPEAKER_FACT_AUTHORITY[speaker];
  if (authorizedTypes && authorizedTypes.includes(factType)) {
    return true;
  }
  
  // Venue can only speak authoritatively about venue matters
  if (speaker === 'venue') {
    const costDomain = getCostDomain(factType);
    return costDomain === 'venue' || factType.startsWith('venue_');
  }
  
  // Production can only speak authoritatively about production/technical
  if (speaker === 'production') {
    const costDomain = getCostDomain(factType);
    return costDomain === 'production' || factType === 'technical_requirement';
  }
  
  // Unknown speakers have no special authority
  return false;
}

/**
 * Get the effective authority weight for a fact based on speaker and fact type.
 */
export function getEffectiveSpeakerAuthority(
  speaker: ImportFactSpeaker, 
  factType: ImportFactType
): number {
  const baseAuthority = SPEAKER_AUTHORITY[speaker];
  
  // If speaker doesn't have authority for this fact type, reduce weight significantly
  if (!speakerHasAuthority(speaker, factType)) {
    return Math.floor(baseAuthority * 0.3); // 70% penalty
  }
  
  // Boost for domain-specific authority
  const authorizedTypes = SPEAKER_FACT_AUTHORITY[speaker];
  if (authorizedTypes && authorizedTypes.includes(factType)) {
    // Speaker has EXPLICIT authority for this fact type - boost them
    return baseAuthority + 30; // Venue (70+30=100) beats promoter (80) on venue_cost
  }
  
  return baseAuthority;
}
