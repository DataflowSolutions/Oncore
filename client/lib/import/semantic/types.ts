/**
 * Semantic Import Types
 * 
 * Types for the two-stage semantic import pipeline:
 * - Stage 1: Candidate Fact Extraction (per chunk)
 * - Stage 2: Semantic Resolution (global reasoning)
 * 
 * IMPORTANT: Fact types are derived directly from the ImportData structure
 * in components/import/types.ts. Every field displayed in the import 
 * confirmation UI should be extractable by the AI.
 */

import type { ImportSection } from '@/components/import/types';

// =============================================================================
// Fact Types - Derived from ImportData fields
// =============================================================================

/**
 * Fact types map 1:1 with ImportData fields.
 * Format: {section}_{field_name} in snake_case
 * 
 * IMPORTANT: These MUST match the database enum exactly.
 * See migration: 20251204143114_reset_import_fact_type_enum.sql
 */
export type ImportFactType =
  // General section
  | 'general_artist'
  | 'general_event_name'
  | 'general_venue'
  | 'general_date'
  | 'general_set_time'
  | 'general_city'
  | 'general_country'
  
  // Deal section
  | 'deal_fee'
  | 'deal_currency'
  | 'deal_payment_terms'
  | 'deal_deal_type'
  | 'deal_notes'
  
  // Hotel section
  | 'hotel_name'
  | 'hotel_address'
  | 'hotel_city'
  | 'hotel_country'
  | 'hotel_checkin_date'
  | 'hotel_checkin_time'
  | 'hotel_checkout_date'
  | 'hotel_checkout_time'
  | 'hotel_booking_reference'
  | 'hotel_phone'
  | 'hotel_email'
  | 'hotel_notes'
  
  // Flight section (keys only - API enrichment handles details)
  | 'flight_number'
  | 'flight_date'
  | 'flight_passenger_name'
  | 'flight_ticket_number'
  | 'flight_booking_reference'
  | 'flight_seat'
  | 'flight_travel_class'
  | 'flight_notes'
  
  // Food/Catering section
  | 'food_name'
  | 'food_address'
  | 'food_city'
  | 'food_country'
  | 'food_booking_reference'
  | 'food_phone'
  | 'food_email'
  | 'food_service_date'
  | 'food_service_time'
  | 'food_guest_count'
  | 'food_notes'
  
  // Activity section
  | 'activity_name'
  | 'activity_location'
  | 'activity_start_time'
  | 'activity_end_time'
  | 'activity_has_destination'
  | 'activity_destination_name'
  | 'activity_destination_location'
  | 'activity_notes'
  
  // Contact section
  | 'contact_name'
  | 'contact_phone'
  | 'contact_email'
  | 'contact_role'
  
  // Technical section
  | 'technical_equipment'
  | 'technical_backline'
  | 'technical_stage_setup'
  | 'technical_lighting'
  | 'technical_soundcheck'
  | 'technical_other'
  
  // Document section
  | 'document_category'
  
  // Fallback
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
  
  /** Which section this fact was extracted from */
  section?: ImportSection;
  
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
  /** Current section being extracted (for section-focused passes) */
  current_section?: ImportSection;
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
 * Mapping from fact types to ImportData field paths.
 * 
 * Each fact type maps directly to a field in ImportData.
 * Array fields use [] notation (e.g., 'hotels[].name' means hotels array, name field)
 */
export const FACT_TYPE_TO_IMPORT_FIELD: Record<ImportFactType, string> = {
  // General section
  general_artist: 'general.artist',
  general_event_name: 'general.eventName',
  general_venue: 'general.venue',
  general_date: 'general.date',
  general_set_time: 'general.setTime',
  general_city: 'general.city',
  general_country: 'general.country',
  
  // Deal section
  deal_fee: 'deal.fee',
  deal_currency: 'deal.currency',
  deal_payment_terms: 'deal.paymentTerms',
  deal_deal_type: 'deal.dealType',
  deal_notes: 'deal.notes',
  
  // Hotel section (array)
  hotel_name: 'hotels[].name',
  hotel_address: 'hotels[].address',
  hotel_city: 'hotels[].city',
  hotel_country: 'hotels[].country',
  hotel_checkin_date: 'hotels[].checkInDate',
  hotel_checkin_time: 'hotels[].checkInTime',
  hotel_checkout_date: 'hotels[].checkOutDate',
  hotel_checkout_time: 'hotels[].checkOutTime',
  hotel_booking_reference: 'hotels[].bookingReference',
  hotel_phone: 'hotels[].phone',
  hotel_email: 'hotels[].email',
  hotel_notes: 'hotels[].notes',
  
  // Flight section (array) - keys only, API enrichment handles details
  flight_number: 'flights[].flightNumber',
  flight_date: 'flights[].date',
  flight_passenger_name: 'flights[].fullName',
  flight_ticket_number: 'flights[].ticketNumber',
  flight_booking_reference: 'flights[].bookingReference',
  flight_seat: 'flights[].seat',
  flight_travel_class: 'flights[].travelClass',
  flight_notes: 'flights[].notes',
  
  // Food/Catering section (array)
  food_name: 'food[].name',
  food_address: 'food[].address',
  food_city: 'food[].city',
  food_country: 'food[].country',
  food_booking_reference: 'food[].bookingReference',
  food_phone: 'food[].phone',
  food_email: 'food[].email',
  food_service_date: 'food[].serviceDate',
  food_service_time: 'food[].serviceTime',
  food_guest_count: 'food[].guestCount',
  food_notes: 'food[].notes',
  
  // Activity section (array)
  activity_name: 'activities[].name',
  activity_location: 'activities[].location',
  activity_start_time: 'activities[].startTime',
  activity_end_time: 'activities[].endTime',
  activity_has_destination: 'activities[].hasDestination',
  activity_destination_name: 'activities[].destinationName',
  activity_destination_location: 'activities[].destinationLocation',
  activity_notes: 'activities[].notes',
  
  // Contact section (array)
  contact_name: 'contacts[].name',
  contact_phone: 'contacts[].phone',
  contact_email: 'contacts[].email',
  contact_role: 'contacts[].role',
  
  // Technical section
  technical_equipment: 'technical.equipment',
  technical_backline: 'technical.backline',
  technical_stage_setup: 'technical.stageSetup',
  technical_lighting: 'technical.lightingRequirements',
  technical_soundcheck: 'technical.soundcheck',
  technical_other: 'technical.other',
  
  // Document section
  document_category: 'documents[].category',
  
  // Fallback
  other: 'notes',
};

/**
 * Get all fact types for a given section
 */
export function getFactTypesForSection(section: string): ImportFactType[] {
  const prefix = section === 'hotels' ? 'hotel_' 
    : section === 'food' ? 'food_'
    : section === 'flights' ? 'flight_'
    : section === 'activities' ? 'activity_'
    : section === 'contacts' ? 'contact_'
    : section === 'documents' ? 'document_'
    : `${section}_`;
  
  return (Object.keys(FACT_TYPE_TO_IMPORT_FIELD) as ImportFactType[])
    .filter(ft => ft.startsWith(prefix));
}

/**
 * Check if a fact type is for an array field
 */
export function isArrayFactType(factType: ImportFactType): boolean {
  const path = FACT_TYPE_TO_IMPORT_FIELD[factType];
  return path.includes('[]');
}

/**
 * Get the array key for a fact type (e.g., 'hotel_name' -> 'hotels')
 */
export function getArrayKeyForFactType(factType: ImportFactType): string | null {
  const path = FACT_TYPE_TO_IMPORT_FIELD[factType];
  if (!path.includes('[]')) return null;
  return path.split('[]')[0];
}

/**
 * Get the field name within the array item (e.g., 'hotel_name' -> 'name')
 */
export function getFieldNameForFactType(factType: ImportFactType): string {
  const path = FACT_TYPE_TO_IMPORT_FIELD[factType];
  if (path.includes('[].')) {
    return path.split('[].')[1];
  }
  return path.split('.').pop() || '';
}

/**
 * Get the section name from a fact type (e.g., 'hotel_name' -> 'hotel')
 */
export function getSectionFromFactType(factType: ImportFactType): string {
  return factType.split('_')[0];
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
 * Check if a speaker has authority to provide information for a fact type.
 * Returns true if the speaker can speak to this fact type authoritatively.
 */
export function speakerHasAuthority(speaker: ImportFactSpeaker, factType: ImportFactType): boolean {
  // Promoter, artist, and artist_agent have universal authority
  if (speaker === 'promoter' || speaker === 'artist' || speaker === 'artist_agent') {
    return true;
  }
  
  const section = getSectionFromFactType(factType);
  
  // Venue can speak authoritatively about general (venue info) and technical
  if (speaker === 'venue') {
    return section === 'general' || section === 'technical';
  }
  
  // Production can speak authoritatively about technical
  if (speaker === 'production') {
    return section === 'technical';
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
  
  return baseAuthority;
}
