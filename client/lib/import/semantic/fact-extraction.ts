/**
 * Stage 1: Candidate Fact Extraction
 * 
 * This module extracts candidate facts from source text chunks.
 * It does NOT make final decisions - it extracts ALL potential facts
 * with their negotiation status and context.
 */

import { logger } from '@/lib/logger';
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
// LLM Prompts for Fact Extraction
// =============================================================================

const FACT_EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting factual claims from event/show advancement documents.
You must respond with valid JSON only.

Your task is to identify ALL candidate facts from the text, NOT to decide which is correct.
Each fact represents a CLAIM made in the source.

STEP 1 - DETERMINE DOCUMENT TYPE (CRITICAL):
Look at the filename and content to classify the document:

CONFIRMATION/RECORD DOCUMENTS → use "final" status:
- Airline booking confirmations (e.g., "Turkish Airlines", "Booking Reference: ABC123")
- Flight itineraries with PNR codes
- Hotel reservations with confirmation numbers  
- Signed contracts
- Invoices and receipts
- Tickets (boarding passes, event tickets)

NEGOTIATION DOCUMENTS → use negotiation statuses (offer/counter_offer/accepted/rejected):
- Email threads with back-and-forth discussion
- Messages containing "we can offer", "how about", "our proposal"
- Documents with explicit negotiation language

INFORMATIONAL DOCUMENTS → use "info" status:
- General descriptions, venue info
- FYI messages, notes
- Reference material without commitments

STATUS CLASSIFICATION:
- "final": CONFIRMED data - flight bookings, hotel reservations, signed deals (DEFAULT FOR CONFIRMATIONS!)
- "info": Informational statements without negotiation context
- "accepted": Explicit agreement to a PRIOR offer in the conversation
- "offer": Initial proposal being made TO someone else
- "counter_offer": Response to an offer with different terms
- "rejected": Explicit decline of a proposal
- "question": Inquiry, not a statement

CRITICAL RULE: If the document is a confirmation, itinerary, ticket, or booking - ALWAYS use status "final".
Do NOT use "offer" for confirmed bookings. A flight confirmation is NOT an offer - it's a FINAL fact.

SOURCE SCOPE (set per fact):
- contract_main: primary show contract / offer / deal doc
- itinerary: schedules, travel plans, run-of-show
- confirmation: airline/hotel confirmations, bookings, tickets
- rider_example: riders that look generic or reference other cities
- general_info: bios, FYI, reference material
- unknown: fallback

FACT DOMAIN RULES:
- Flights: fact_domain = flight_leg_1, flight_leg_2, ... (per leg)
- Contacts: fact_domain = contact_promoter, contact_agent, contact_tour_manager, ...
- Hotels: fact_domain = hotel_main, hotel_alt1, ...
- If unsure, leave fact_domain null.

FACT TYPES - be precise:
- Flights (use fact_domain = flight_leg_1, flight_leg_2, ...):
  - flight_origin_city, flight_origin_airport
  - flight_destination_city, flight_destination_airport
  - flight_departure_datetime, flight_arrival_datetime (ISO datetime if possible)
  - flight_airline, flight_passenger_name, flight_booking_reference
  - flight_number (legacy), flight_departure (legacy), flight_arrival (legacy)
- artist_fee: Money paid TO the artist for performing
- venue_cost: Cost of the venue itself
- production_cost: Sound, lights, staging equipment
- catering_cost: Food and beverages
- accommodation_cost: Hotels, lodging
- travel_cost: Flights, ground transport
- other_cost: Anything else
- hotel_name, hotel_address, hotel_checkin, hotel_checkout: Hotel details (use fact_domain = hotel_main, hotel_alt1, ...)
- event_date, event_time, set_time: Show timing
- venue_name, venue_city, venue_country, venue_capacity: Venue info
- artist_name, event_name: Show identification
- contact_name, contact_email, contact_phone, contact_role: People (use fact_domain = contact_promoter, contact_agent, contact_tour_manager, etc.)

OUTPUT FORMAT (respond with JSON only):
{
  "facts": [
    {
      "fact_type": "flight_number",
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

STEP 1 - Document Type Analysis (DO THIS FIRST):
Look at the source filename "{source_file_name}" and the content.

Assign source_scope for each fact (keep consistent across facts from this document):
- contract_main: primary show contract / offer / deal doc
- itinerary: schedules, travel plans, run-of-show
- confirmation: airline/hotel confirmations, bookings, tickets
- rider_example: riders that look generic or reference other cities
- general_info: bios, FYI, reference material
- unknown: fallback

Filename hints: "Flight", airline names, "Booking", "Confirmation" -> confirmation; "rider" -> rider_example.

Is this filename suggesting a confirmation/booking/ticket/itinerary?
- Contains "Turkish Airlines", "Flight", "Booking", "Confirmation" -> CONFIRMATION document
- Contains "Contract", "Agreement", "Signed" -> CONTRACT document  
- Contains "@" (like email format) or looks like correspondence -> might be NEGOTIATION

For CONFIRMATION documents: ALL facts should use status "final"
For CONTRACT documents: Use "final" for agreed terms, "accepted" for signatures
For NEGOTIATION documents: Use appropriate status (offer, counter_offer, accepted, rejected)
For INFORMATIONAL documents: Use "info" status

FACT DOMAIN RULES (CRITICAL):
- Flights: fact_domain = flight_leg_1, flight_leg_2, ... (per leg)
- Contacts: fact_domain = contact_promoter, contact_agent, contact_tour_manager, ... Keep name/email/phone/role for the same person in the same domain.
- Hotels: fact_domain = hotel_main, hotel_alt1, ...
- If unsure, leave fact_domain null (do NOT invent new patterns).

GRANULAR FLIGHT FIELDS (emit when available):
- flight_origin_city / flight_origin_airport
- flight_destination_city / flight_destination_airport
- flight_departure_datetime / flight_arrival_datetime (ISO if possible)
- flight_airline, flight_passenger_name, flight_booking_reference
- flight_number, flight_departure (legacy), flight_arrival (legacy)

Previous facts for context (to detect counter-offers):
{previous_facts}

Text to analyze (chunk {chunk_index} from {source_file_name}):
---
{chunk_text}
---

REMINDER: If this is a flight booking confirmation, all flight facts MUST have status "final", NOT "offer".
Return valid JSON with a "facts" array.`;

// =============================================================================
// Fact Type Classification
// =============================================================================

/**
 * Keywords that help classify fact types
 */
const FACT_TYPE_KEYWORDS: Record<string, ImportFactType[]> = {
  // Artist fee indicators
  'fee': ['artist_fee'],
  'artist fee': ['artist_fee'],
  'performance fee': ['artist_fee'],
  'guarantee': ['artist_fee'],
  'flat fee': ['artist_fee'],
  'pay the artist': ['artist_fee'],
  'offer': ['artist_fee'],
  
  // Venue cost indicators
  'venue cost': ['venue_cost'],
  'venue rental': ['venue_cost'],
  'room rental': ['venue_cost'],
  'hall rental': ['venue_cost'],
  'venue fee': ['venue_cost'],
  
  // Production cost indicators
  'production': ['production_cost'],
  'sound': ['production_cost', 'technical_requirement'],
  'lighting': ['production_cost', 'technical_requirement'],
  'backline': ['production_cost', 'technical_requirement'],
  'staging': ['production_cost', 'technical_requirement'],
  
  // Catering indicators
  'catering': ['catering_cost', 'catering_detail'],
  'food': ['catering_cost', 'catering_detail'],
  'meal': ['catering_cost', 'catering_detail'],
  'buyout': ['catering_cost'],
  
  // Accommodation indicators
  'hotel': ['accommodation_cost', 'hotel_name'],
  'lodging': ['accommodation_cost'],
  'accommodation': ['accommodation_cost'],
  'room': ['accommodation_cost', 'hotel_name'],
  'check-in': ['hotel_checkin'],
  'check-out': ['hotel_checkout'],
  
  // Travel indicators
  'flight': ['travel_cost', 'flight_number'],
  'travel': ['travel_cost'],
  'transport': ['travel_cost'],
  'ground': ['travel_cost'],
  
  // Date/time indicators
  'date': ['event_date'],
  'time': ['event_time'],
  'set time': ['set_time'],
  'showtime': ['set_time'],
  'doors': ['event_time'],
  
  // Contact indicators
  'contact': ['contact_name'],
  'phone': ['contact_phone'],
  'email': ['contact_email'],
  'role': ['contact_role'],
  
  // Deal indicators
  'payment': ['payment_terms'],
  'terms': ['payment_terms'],
  'deposit': ['payment_terms'],
  'deal': ['deal_type'],
  'currency': ['currency'],
};

/**
 * Keywords that indicate negotiation status
 */
const STATUS_KEYWORDS: Record<string, ImportFactStatus[]> = {
  'offer': ['offer'],
  'propose': ['offer'],
  'we can do': ['offer'],
  'how about': ['offer', 'counter_offer'],
  
  'counter': ['counter_offer'],
  'instead': ['counter_offer'],
  'alternatively': ['counter_offer'],
  'what if': ['counter_offer'],
  
  'agreed': ['accepted'],
  'accept': ['accepted'],
  'confirmed': ['accepted'],
  'deal': ['accepted'],
  'done': ['accepted'],
  'sounds good': ['accepted'],
  'perfect': ['accepted'],
  
  'decline': ['rejected'],
  'reject': ['rejected'],
  'can\'t': ['rejected'],
  'won\'t work': ['rejected'],
  'no longer': ['withdrawn'],
  'withdraw': ['withdrawn'],
  
  'fyi': ['info'],
  'note': ['info'],
  'btw': ['info'],
  'reminder': ['info'],
  
  'question': ['question'],
  '?': ['question'],
  'could you': ['question'],
  'is it possible': ['question'],
};

/**
 * Keywords that indicate speaker role
 */
const SPEAKER_KEYWORDS: Record<string, ImportFactSpeaker[]> = {
  'artist': ['artist'],
  'band': ['artist'],
  'performer': ['artist'],
  'we (artist)': ['artist'],
  
  'agent': ['artist_agent'],
  'manager': ['artist_agent'],
  'booking': ['artist_agent'],
  
  'promoter': ['promoter'],
  'presenter': ['promoter'],
  'organizer': ['promoter'],
  'festival': ['promoter'],
  
  'venue': ['venue'],
  'club': ['venue'],
  'hall': ['venue'],
  'theater': ['venue'],
  
  'production': ['production'],
  'tech': ['production'],
  'sound engineer': ['production'],
};

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
        temperature: 0.1, // Low temperature for more consistent extraction
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
  
  const validTypes: ImportFactType[] = [
    'artist_fee', 'venue_cost', 'production_cost', 'catering_cost',
    'accommodation_cost', 'travel_cost', 'other_cost', 'event_date',
    'event_time', 'set_time', 'venue_name', 'venue_city', 'venue_country',
    'venue_capacity', 'artist_name', 'event_name', 'hotel_name',
    'hotel_address', 'hotel_checkin', 'hotel_checkout', 'flight_number',
    'flight_origin_city', 'flight_origin_airport',
    'flight_destination_city', 'flight_destination_airport',
    'flight_departure_datetime', 'flight_arrival_datetime',
    'flight_airline', 'flight_passenger_name', 'flight_booking_reference',
    'flight_departure', 'flight_arrival', 'contact_name', 'contact_email',
    'contact_phone', 'contact_role', 'currency', 'payment_terms',
    'deal_type', 'technical_requirement', 'catering_detail',
    'activity_detail', 'general_note', 'other',
  ];
  
  if (validTypes.includes(normalized as ImportFactType)) {
    return normalized as ImportFactType;
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
  'flight_number',
  'flight_origin_city',
  'flight_origin_airport',
  'flight_destination_city',
  'flight_destination_airport',
  'flight_departure_datetime',
  'flight_arrival_datetime',
  'flight_airline',
  'flight_passenger_name',
  'flight_booking_reference',
  'flight_departure', 
  'flight_arrival',
  'hotel_name',
  'hotel_address',
  'hotel_checkin',
  'hotel_checkout',
  'contact_name',
  'contact_email',
  'contact_phone',
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
