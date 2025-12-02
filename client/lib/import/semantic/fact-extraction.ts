/**
 * Stage 1: Candidate Fact Extraction
 * 
 * This module extracts candidate facts from source text chunks.
 * It does NOT make final decisions - it extracts ALL potential facts
 * with their negotiation status and context.
 * 
 * IMPORTANT: Fact types are derived directly from the ImportData structure
 * in components/import/types.ts to ensure 1:1 mapping with the UI.
 */

import { logger } from '@/lib/logger';
import { FACT_TYPE_TO_IMPORT_FIELD } from './types';
import { logRawLLMResponse } from './diagnostics';
import type {
  ExtractedFact,
  FactExtractionRequest,
  FactExtractionResult,
  ImportFactType,
  ImportFactDirection,
  ImportFactStatus,
  ImportFactSpeaker,
  ImportSourceScope,
} from './types';

// =============================================================================
// Generate fact type documentation from the mapping
// =============================================================================

function generateFactTypeList(): string {
  const sections: Record<string, string[]> = {
    'GENERAL (event info)': [],
    'DEAL (financial terms)': [],
    'HOTEL (accommodation)': [],
    'FOOD (catering)': [],
    'FLIGHT (travel)': [],
    'ACTIVITY (transfers/activities)': [],
    'CONTACT (people)': [],
    'TECHNICAL (requirements)': [],
  };

  for (const [factType, fieldPath] of Object.entries(FACT_TYPE_TO_IMPORT_FIELD)) {
    const prefix = factType.split('_')[0];
    let section = '';
    switch (prefix) {
      case 'general': section = 'GENERAL (event info)'; break;
      case 'deal': section = 'DEAL (financial terms)'; break;
      case 'hotel': section = 'HOTEL (accommodation)'; break;
      case 'food': section = 'FOOD (catering)'; break;
      case 'flight': section = 'FLIGHT (travel)'; break;
      case 'activity': section = 'ACTIVITY (transfers/activities)'; break;
      case 'contact': section = 'CONTACT (people)'; break;
      case 'technical': section = 'TECHNICAL (requirements)'; break;
      default: continue;
    }
    
    const fieldName = fieldPath.includes('[].') 
      ? fieldPath.split('[].')[1] 
      : fieldPath.split('.').pop();
    sections[section].push(`  - ${factType}: maps to ${fieldName}`);
  }

  return Object.entries(sections)
    .filter(([, items]) => items.length > 0)
    .map(([section, items]) => `${section}:\n${items.join('\n')}`)
    .join('\n\n');
}

// =============================================================================
// LLM Prompts for Fact Extraction
// =============================================================================

const FACT_TYPE_LIST = generateFactTypeList();

const FACT_EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting factual claims from event/show advancement documents.
You must respond with valid JSON only.

Your task is to identify ALL candidate facts from the text, NOT to decide which is correct.
Each fact represents a CLAIM made in the source.

STEP 1 - DETERMINE DOCUMENT TYPE (CRITICAL):
Look at the filename and content to classify the document:

CONFIRMATION/RECORD DOCUMENTS → use "final" status:
- Airline booking confirmations, flight itineraries with PNR codes
- Hotel reservations with confirmation numbers  
- Signed contracts, invoices, receipts, tickets

NEGOTIATION DOCUMENTS → use negotiation statuses (offer/counter_offer/accepted/rejected):
- Email threads with back-and-forth discussion
- Messages containing "we can offer", "how about", "our proposal"

INFORMATIONAL DOCUMENTS → use "info" status:
- General descriptions, venue info, FYI messages, notes

STATUS CLASSIFICATION:
- "final": CONFIRMED data - flight bookings, hotel reservations, signed deals
- "info": Informational statements without negotiation context
- "accepted": Explicit agreement to a PRIOR offer
- "offer": Initial proposal being made
- "counter_offer": Response to an offer with different terms
- "rejected": Explicit decline of a proposal
- "question": Inquiry, not a statement

SOURCE SCOPE (set per fact):
- contract_main: primary show contract / offer / deal doc
- itinerary: schedules, travel plans, run-of-show
- confirmation: airline/hotel confirmations, bookings, tickets
- rider_example: riders that look generic or reference other cities
- general_info: bios, FYI, reference material
- unknown: fallback

FACT DOMAIN RULES (for grouping related facts):
- Flights: fact_domain = flight_1, flight_2, ... (per leg)
- Hotels: fact_domain = hotel_1, hotel_2, ...
- Food/Catering: fact_domain = food_1, food_2, ...
- Activities: fact_domain = activity_1, activity_2, ...
- Contacts: fact_domain = contact_1, contact_2, ...

FACT TYPES - Use these EXACT types:

${FACT_TYPE_LIST}

OUTPUT FORMAT (respond with JSON only):
{
  "facts": [
    {
      "fact_type": "flight_flightNumber",
      "fact_domain": "flight_1",
      "value_text": "TK1234",
      "status": "final",
      "speaker_role": "unknown",
      "confidence": 0.95,
      "extraction_reason": "Confirmed flight booking",
      "raw_snippet": "Flight TK1234 confirmed"
    }
  ]
}`;

const FACT_EXTRACTION_USER_PROMPT = `Extract ALL candidate facts from the following text chunk.
Respond with JSON containing your extracted facts.

STEP 1 - Document Type Analysis:
Look at the source filename "{source_file_name}" and the content.
- Contains airline names, "Booking", "Confirmation", "Itinerary" -> CONFIRMATION (use status "final")
- Contains "Contract", "Agreement" -> CONTRACT (use status "final" or "accepted")
- Contains "@" or looks like correspondence -> NEGOTIATION (use appropriate status)
- Otherwise -> INFORMATIONAL (use status "info")

FACT DOMAIN RULES (CRITICAL):
- Keep ALL facts for the same item in the same domain.
- Flights: fact_domain = flight_1, flight_2, ... (per flight leg)
- Hotels: fact_domain = hotel_1, hotel_2, ... (per hotel)
- Food: fact_domain = food_1, food_2, ... (per catering item)
- Activities: fact_domain = activity_1, activity_2, ... (per activity/transfer)
- Contacts: fact_domain = contact_1, contact_2, ... (per person)

ONE-SHOT EXAMPLES (Use these patterns):

Example 1: Flight Confirmation
Input: "Flight TK67 from Istanbul (IST) to Bali (DPS) departs 21:10. Ticket 235-1234567890."
Output:
[
  { "fact_type": "flight_airline", "value_text": "Turkish Airlines", "fact_domain": "flight_1" },
  { "fact_type": "flight_flightNumber", "value_text": "TK67", "fact_domain": "flight_1" },
  { "fact_type": "flight_fromAirport", "value_text": "IST", "fact_domain": "flight_1" },
  { "fact_type": "flight_fromCity", "value_text": "Istanbul", "fact_domain": "flight_1" },
  { "fact_type": "flight_toAirport", "value_text": "DPS", "fact_domain": "flight_1" },
  { "fact_type": "flight_toCity", "value_text": "Bali", "fact_domain": "flight_1" },
  { "fact_type": "flight_departureTime", "value_time": "21:10", "fact_domain": "flight_1" },
  { "fact_type": "flight_ticketNumber", "value_text": "235-1234567890", "fact_domain": "flight_1" }
]

Example 2: Contract Deal
Input: "Artist Fee: $5,000 USD flat fee. 50% deposit required."
Output:
[
  { "fact_type": "deal_fee", "value_number": 5000, "currency": "USD" },
  { "fact_type": "deal_dealType", "value_text": "flat fee" },
  { "fact_type": "deal_paymentTerms", "value_text": "50% deposit required" }
]

Example 3: Rider Venue Info
Input: "Venue: Sohho Dubai. Address: Meydan Racecourse."
Output:
[
  { "fact_type": "general_venue", "value_text": "Sohho Dubai" },
  { "fact_type": "general_city", "value_text": "Dubai" },
  { "fact_type": "hotel_address", "value_text": "Meydan Racecourse" }
]

EXTRACT ALL FIELDS YOU CAN FIND:

For FLIGHTS, extract all of these per leg:
- flight_airline, flight_flightNumber, flight_aircraft
- flight_fullName (passenger), flight_bookingReference, flight_ticketNumber
- flight_fromCity, flight_fromAirport, flight_departureTime
- flight_toCity, flight_toAirport, flight_arrivalTime
- flight_seat, flight_travelClass, flight_flightTime

For HOTELS, extract:
- hotel_name, hotel_address, hotel_city, hotel_country
- hotel_checkInDate, hotel_checkInTime, hotel_checkOutDate, hotel_checkOutTime
- hotel_bookingReference, hotel_phone, hotel_email, hotel_notes

For FOOD/CATERING, extract:
- food_name (provider), food_address, food_city, food_country
- food_bookingReference, food_phone, food_email, food_notes
- food_serviceDate, food_serviceTime, food_guestCount

For ACTIVITIES/TRANSFERS, extract:
- activity_name, activity_location, activity_startTime, activity_endTime
- activity_notes, activity_destinationName, activity_destinationLocation

For CONTACTS, extract:
- contact_name, contact_email, contact_phone, contact_role

For GENERAL event info:
- general_artist, general_eventName, general_venue
- general_date, general_setTime, general_city, general_country

For DEAL terms:
- deal_fee, deal_currency, deal_paymentTerms, deal_dealType, deal_notes

For TECHNICAL requirements:
- technical_equipment, technical_backline, technical_stageSetup
- technical_lightingRequirements, technical_soundcheck, technical_other

Previous facts for context (to detect counter-offers):
{previous_facts}

Text to analyze (chunk {chunk_index} from {source_file_name}):
---
{chunk_text}
---

REMINDER: If this is a flight/hotel confirmation, all facts MUST have status "final".
Extract as many facts as possible. Return valid JSON with a "facts" array.`;



// =============================================================================
// LLM Call
// =============================================================================

interface LLMResponse {
  content: string | null;
  error?: string;
}

async function callFactExtractionLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { content: '{"facts": []}', error: 'OPENAI_API_KEY not set' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0, // Zero temperature for deterministic extraction
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      return { content: '{"facts": []}', error: `LLM HTTP error: ${response.status} ${message}` };
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? '{"facts": []}';
    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown LLM error';
    return { content: '{"facts": []}', error: message };
  }
}

// =============================================================================
// Fact Parsing and Validation
// =============================================================================

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
 * Validate and normalize a fact type from LLM output
 */
function normalizeFactType(raw?: string): ImportFactType {
  if (!raw) return 'other';
  
  const normalized = raw.toLowerCase().replace(/[^a-z_]/g, '_');
  
  // Get valid types from the mapping
  const validTypes = Object.keys(FACT_TYPE_TO_IMPORT_FIELD) as ImportFactType[];
  
  if (validTypes.includes(normalized as ImportFactType)) {
    return normalized as ImportFactType;
  }
  
  // Handle legacy type mappings for backward compatibility
  const legacyMappings: Record<string, ImportFactType> = {
    'artist_fee': 'deal_fee',
    'flight_number': 'flight_flightNumber',
    'flight_origin_city': 'flight_fromCity',
    'flight_origin_airport': 'flight_fromAirport',
    'flight_destination_city': 'flight_toCity',
    'flight_destination_airport': 'flight_toAirport',
    'flight_departure_datetime': 'flight_departureTime',
    'flight_arrival_datetime': 'flight_arrivalTime',
    'flight_passenger_name': 'flight_fullName',
    'flight_ticket_number': 'flight_ticketNumber',
    'flight_class': 'flight_travelClass',
    'flight_aircraft_model': 'flight_aircraft',
    'flight_duration': 'flight_flightTime',
    'hotel_checkin': 'hotel_checkInDate',
    'hotel_checkout': 'hotel_checkOutDate',
    'hotel_booking_reference': 'hotel_bookingReference',
    'event_date': 'general_date',
    'event_time': 'general_setTime',
    'set_time': 'general_setTime',
    'venue_name': 'general_venue',
    'venue_city': 'general_city',
    'venue_country': 'general_country',
    'artist_name': 'general_artist',
    'event_name': 'general_eventName',
    'currency': 'deal_currency',
    'payment_terms': 'deal_paymentTerms',
    'deal_type': 'deal_dealType',
    'catering_provider_name': 'food_name',
    'catering_provider_address': 'food_address',
    'catering_provider_city': 'food_city',
    'catering_provider_country': 'food_country',
    'catering_provider_phone': 'food_phone',
    'catering_provider_email': 'food_email',
    'catering_booking_reference': 'food_bookingReference',
    'transfer_summary': 'activity_notes',
    'ground_transport_summary': 'activity_notes',
    'activity_detail': 'activity_notes',
    'technical_equipment_summary': 'technical_equipment',
    'technical_backline_summary': 'technical_backline',
    'technical_stage_setup_summary': 'technical_stageSetup',
    'technical_lighting_summary': 'technical_lightingRequirements',
    'technical_soundcheck_summary': 'technical_soundcheck',
    'technical_other_summary': 'technical_other',
  };
  
  if (normalized in legacyMappings) {
    return legacyMappings[normalized];
  }
  
  return 'other';
}

/**
 * Validate and normalize direction from LLM output
 */
function normalizeDirection(raw?: string): ImportFactDirection {
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
function normalizeStatus(raw?: string): ImportFactStatus {
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
function normalizeSpeakerRole(raw?: string): ImportFactSpeaker {
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
function normalizeSourceScope(raw?: string): ImportSourceScope {
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
function inferSourceScopeFromFilename(fileName: string): ImportSourceScope {
  const lower = (fileName || '').toLowerCase();

  if (lower.includes('rider')) return 'rider_example';
  if (lower.match(/itinerary|schedule|run[-_ ]?of[-_ ]?show/)) return 'itinerary';
  if (lower.match(/flight|airline|booking|confirmation|ticket|boarding|pnr/)) return 'confirmation';
  if (lower.match(/contract|agreement|offer/)) return 'contract_main';

  return 'unknown';
}

/**
 * Parse and validate facts from LLM response
 */
function parseLLMFacts(
  content: string,
  request: FactExtractionRequest
): ExtractedFact[] {
  try {
    const parsed = JSON.parse(content);
    const rawFacts: RawFactFromLLM[] = parsed.facts || [];
    
    return rawFacts.map((raw, index): ExtractedFact => ({
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
      value_date: raw.value_date,
      value_time: raw.value_time,
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
  } catch (error) {
    logger.error('Failed to parse LLM fact extraction response', { error, content });
    return [];
  }
}

// =============================================================================
// Filename-Based Status Upgrade (Safety Net)
// =============================================================================

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
  // Flight facts
  'flight_airline',
  'flight_flightNumber',
  'flight_aircraft',
  'flight_fullName',
  'flight_bookingReference',
  'flight_ticketNumber',
  'flight_fromCity',
  'flight_fromAirport',
  'flight_departureTime',
  'flight_toCity',
  'flight_toAirport',
  'flight_arrivalTime',
  'flight_seat',
  'flight_travelClass',
  'flight_flightTime',
  // Hotel facts
  'hotel_name',
  'hotel_address',
  'hotel_city',
  'hotel_country',
  'hotel_checkInDate',
  'hotel_checkInTime',
  'hotel_checkOutDate',
  'hotel_checkOutTime',
  'hotel_bookingReference',
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
function upgradeFactStatusesFromFilename(
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

// =============================================================================
// Main Extraction Function
// =============================================================================

/**
 * Extract candidate facts from a text chunk.
 * This is Stage 1 of the semantic import pipeline.
 */
export async function extractFactsFromChunk(
  request: FactExtractionRequest
): Promise<FactExtractionResult> {
  logger.info('Fact extraction starting', {
    job_id: request.job_id,
    source_id: request.source_id,
    chunk_index: request.chunk_index,
    text_length: request.chunk_text.length,
  });

  // Build user prompt with context
  const previousFactsSummary = request.previous_facts?.length
    ? JSON.stringify(
        request.previous_facts.slice(-10).map(f => ({
          type: f.fact_type,
          value: f.value_text || f.value_number,
          status: f.status,
          speaker: f.speaker_role,
        })),
        null,
        2
      )
    : 'None';

  const userPrompt = FACT_EXTRACTION_USER_PROMPT
    .replace('{previous_facts}', previousFactsSummary)
    .replace('{chunk_index}', String(request.chunk_index))
    .replace('{source_file_name}', request.source_file_name)
    .replace('{chunk_text}', request.chunk_text);

  // Call LLM
  const llmResponse = await callFactExtractionLLM(
    FACT_EXTRACTION_SYSTEM_PROMPT,
    userPrompt
  );

  const warnings: string[] = [];
  
  if (llmResponse.error) {
    warnings.push(`LLM error: ${llmResponse.error}`);
  }

  // Diagnostic: Log raw LLM response before parsing
  if (llmResponse.content) {
    logRawLLMResponse(
      request.job_id,
      request.source_id,
      request.chunk_index,
      llmResponse.content
    );
  }

  // Parse facts
  let facts = parseLLMFacts(llmResponse.content || '{"facts": []}', request);
  
  // Apply filename-based source_scope fallback when model did not set one
  const inferredScope = inferSourceScopeFromFilename(request.source_file_name);
  facts = facts.map(fact => ({
    ...fact,
    source_scope: fact.source_scope && fact.source_scope !== 'unknown'
      ? fact.source_scope
      : inferredScope,
  }));
  
  // Safety net: upgrade fact statuses based on filename patterns
  // This catches cases where the LLM misclassifies confirmation documents
  facts = upgradeFactStatusesFromFilename(facts, request.source_file_name);

  logger.info('Fact extraction complete', {
    job_id: request.job_id,
    source_id: request.source_id,
    chunk_index: request.chunk_index,
    facts_extracted: facts.length,
    warnings: warnings.length,
  });

  return { facts, warnings };
}

/**
 * Extract facts from all chunks of a source.
 * Maintains context across chunks for better counter-offer detection.
 */
export async function extractFactsFromSource(
  job_id: string,
  source_id: string,
  source_file_name: string,
  chunks: { index: number; text: string }[]
): Promise<FactExtractionResult> {
  const allFacts: ExtractedFact[] = [];
  const allWarnings: string[] = [];
  let previousFacts: ExtractedFact[] = [];

  for (const chunk of chunks) {
    const result = await extractFactsFromChunk({
      job_id,
      source_id,
      source_file_name,
      chunk_index: chunk.index,
      chunk_text: chunk.text,
      previous_facts: previousFacts,
      message_index: chunk.index, // Use chunk index as message index for now
    });

    allFacts.push(...result.facts);
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
    
    // Keep last 20 facts for context
    previousFacts = [...previousFacts, ...result.facts].slice(-20);
  }

  return {
    facts: allFacts,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
  };
}
