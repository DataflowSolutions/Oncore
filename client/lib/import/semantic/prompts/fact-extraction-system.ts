/**
 * Fact Extraction Prompts
 * 
 * Section-specific prompts for targeted extraction.
 * Each section has its own focused prompt to reduce hallucination.
 */

import type { ImportSection } from '@/components/import/types';

/**
 * Get the system prompt for a specific section
 */
export function getFactExtractionSystemPrompt(section: ImportSection): string {
    const baseRules = getBaseExtractionRules();
    const sectionPrompt = getSectionPrompt(section);
    
    return `${sectionPrompt}

${baseRules}`;
}

/**
 * Base extraction rules that apply to all sections
 */
function getBaseExtractionRules(): string {
    return `OUTPUT FORMAT
------------
- Output MUST be valid JSON.
- The top-level object MUST be:
  {
    "facts": [ ... ]
  }
- Do NOT include markdown, comments, or any extra text.

FACT OBJECT SCHEMA
------------------
Each element in the "facts" array MUST follow this shape:

{
  "fact_type": string,        // one of the allowed fact types for this section
  "fact_domain": string,      // groups related fields (e.g. "flight_1", "hotel_1", "general")
  "status": string,           // one of: "final", "accepted", "offer", "counter_offer", "rejected", "question", "info"
  "source_scope": string,     // one of: "contract_main", "itinerary", "confirmation", "rider_example", "general_info", "unknown"
  "raw_snippet": string,      // short verbatim snippet from the input
  "value_text"?: string,      // use for free text values
  "value_number"?: number,    // use for numeric values
  "value_date"?: string,      // use format YYYY-MM-DD
  "value_time"?: string       // use format HH:MM or HH:MM:SS
}

EXTRACTION RULES
----------------
1. Extract ONLY what is explicitly written in the text.
2. NEVER infer, guess, or fill in missing details.
3. Prefer omitting a fact over inventing data.
4. Preserve spelling and formatting exactly as in source.
5. If no facts match this section, return: { "facts": [] }

STATUS RULES
------------
- "final":         Confirmed bookings, tickets, signed contracts
- "accepted":      Explicit agreement to a prior offer
- "offer":         Proposal not yet accepted
- "counter_offer": Response with changed terms
- "rejected":      Explicit decline
- "question":      Direct questions
- "info":          Informational, non-negotiated content

SOURCE_SCOPE RULES
------------------
- "contract_main":  Primary contract, main offer, deal sheet
- "itinerary":      Schedules, run-of-show, travel plans
- "confirmation":   Bookings, tickets, confirmations, boarding passes
- "rider_example":  Generic riders referencing other cities
- "general_info":   Bios, FYI info, reference material
- "unknown":        Use only when cannot assign above`;
}

/**
 * Get section-specific prompt
 */
function getSectionPrompt(section: ImportSection): string {
    switch (section) {
        case 'general':
            return `You extract GENERAL event information from documents.

Extract ONLY these fact types:
- general_artist:      Artist/performer name
- general_event_name:  Event title
- general_venue:       Venue name
- general_date:        Event date (YYYY-MM-DD)
- general_set_time:    Set time, stage time, doors (HH:MM)
- general_city:        City
- general_country:     Country

IGNORE everything else (flights, hotels, deals, contacts, technical, etc.).
If text contains no general event info, return empty facts array.`;

        case 'deal':
            return `You extract DEAL and financial information from documents.

Extract ONLY these fact types:
- deal_fee:            Artist fee amount (number)
- deal_currency:       Currency (USD, EUR, GBP, etc.)
- deal_payment_terms:  Payment schedule, deposit terms
- deal_deal_type:      Type (guarantee, door deal, etc.)
- deal_notes:          Deal notes and special terms

IGNORE everything else (flights, hotels, general, contacts, technical, etc.).
If text contains no deal info, return empty facts array.`;

        case 'flights':
            return `You extract FLIGHT identifier information from documents.

Extract ONLY these fact types (API enrichment handles the rest):
- flight_number:            Flight number (e.g., "TK67", "BA123", "LH456")
- flight_date:              Flight date (YYYY-MM-DD)
- flight_passenger_name:    Passenger name
- flight_ticket_number:     Ticket number
- flight_booking_reference: Booking reference/PNR
- flight_seat:              Seat number (e.g., "12A")
- flight_travel_class:      Economy/Business/First
- flight_notes:             Flight notes

CRITICAL: The "fact_type" field MUST be EXACTLY as listed above (e.g., "flight_number", NOT "flightNumber" or "flight_no").

DO NOT extract airlines, airports, cities, times, or aircraft.
Use fact_domain to group fields for same flight: "flight_1", "flight_2", etc.

EXAMPLE INPUT:
"Turkish Airlines - TK67 | Ticket no 2352279024704 | Mr. JOHN SMITH | Economy Class | PNR: QKS | Seat: 14A"

EXAMPLE OUTPUT:
{
  "facts": [
    { "fact_type": "flight_number", "fact_domain": "flight_1", "status": "final", "source_scope": "confirmation", "raw_snippet": "Turkish Airlines - TK67", "value_text": "TK67" },
    { "fact_type": "flight_ticket_number", "fact_domain": "flight_1", "status": "final", "source_scope": "confirmation", "raw_snippet": "Ticket no 2352279024704", "value_text": "2352279024704" },
    { "fact_type": "flight_passenger_name", "fact_domain": "flight_1", "status": "final", "source_scope": "confirmation", "raw_snippet": "Mr. JOHN SMITH", "value_text": "JOHN SMITH" },
    { "fact_type": "flight_travel_class", "fact_domain": "flight_1", "status": "final", "source_scope": "confirmation", "raw_snippet": "Economy Class", "value_text": "Economy" },
    { "fact_type": "flight_booking_reference", "fact_domain": "flight_1", "status": "final", "source_scope": "confirmation", "raw_snippet": "PNR: QKS", "value_text": "QKS" },
    { "fact_type": "flight_seat", "fact_domain": "flight_1", "status": "final", "source_scope": "confirmation", "raw_snippet": "Seat: 14A", "value_text": "14A" }
  ]
}

IGNORE everything else (hotels, deals, general, contacts, technical, etc.).
If text contains no flight info, return empty facts array.`;

        case 'hotels':
            return `You extract HOTEL accommodation information from documents.

Extract ONLY these fact types:
- hotel_name:              Actual hotel name ONLY (e.g., "Hilton Dubai")
- hotel_address:           Street address
- hotel_city:              City
- hotel_country:           Country
- hotel_checkin_date:      Check-in date (YYYY-MM-DD)
- hotel_checkin_time:      Check-in time (HH:MM)
- hotel_checkout_date:     Check-out date (YYYY-MM-DD)
- hotel_checkout_time:     Check-out time (HH:MM)
- hotel_booking_reference: Booking reference
- hotel_phone:             Contact phone
- hotel_email:             Contact email
- hotel_notes:             Room descriptions, guest names, special requests

CRITICAL: hotel_name is the actual hotel name ONLY.
Room descriptions like "2 double rooms" or "5 star hotel" go in hotel_notes.

Use fact_domain to group fields for same hotel: "hotel_1", "hotel_2", etc.

IGNORE everything else (flights, deals, general, contacts, technical, etc.).
If text contains no hotel info, return empty facts array.`;

        case 'food':
            return `You extract FOOD and catering information from documents.

Extract ONLY these fact types:
- food_name:              Restaurant/catering company name
- food_address:           Address
- food_city:              City
- food_country:           Country
- food_booking_reference: Booking reference
- food_phone:             Contact phone
- food_email:             Contact email
- food_service_date:      Service date (YYYY-MM-DD)
- food_service_time:      Service time (HH:MM)
- food_guest_count:       Number of guests (number)
- food_notes:             Meal descriptions, dietary requirements

This is for EXTERNAL food services (restaurants, caterers).
DO NOT extract stage drinks or dressing room snacks (those are technical_other).

Use fact_domain to group fields: "food_1", "food_2", etc.

IGNORE everything else (flights, hotels, deals, contacts, technical, etc.).
If text contains no food info, return empty facts array.`;

        case 'activities':
            return `You extract ACTIVITY and schedule information from documents.

Extract ONLY these fact types for scheduled events (NOT the main performance):
- activity_name:                 Activity type (Soundcheck, Meet & Greet, Interview, etc.)
- activity_location:             Where it takes place
- activity_start_time:           Start time (HH:MM)
- activity_end_time:             End time (HH:MM)
- activity_has_destination:      Has destination (true/false)
- activity_destination_name:     Destination name
- activity_destination_location: Destination location
- activity_notes:                Additional details

Examples: Soundcheck, Photo session, Radio appearance, Load-in, Transfer

Use fact_domain to group fields: "activity_1", "activity_2", etc.

IGNORE everything else (flights, hotels, deals, contacts, technical, etc.).
If text contains no activity info, return empty facts array.`;

        case 'contacts':
            return `You extract CONTACT information from documents.

Extract ONLY these fact types:
- contact_name:  Contact person name
- contact_phone: Phone number
- contact_email: Email address
- contact_role:  Role/title (promoter, agent, tour manager, venue staff, etc.)

Extract contacts for promoters, agents, managers, venue staff, etc.

Use fact_domain to group fields for same person: "contact_1", "contact_2", etc.

IGNORE everything else (flights, hotels, deals, general, technical, etc.).
If text contains no contact info, return empty facts array.`;

        case 'technical':
            return `You extract TECHNICAL requirements and rider information from documents.

Extract ONLY these fact types:
- technical_equipment:   DJ/band equipment (CDJs, mixers, instruments)
- technical_backline:    Backline (amps, drums, etc.)
- technical_stage_setup: Stage setup requirements
- technical_lighting:    Lighting requirements
- technical_soundcheck:  Soundcheck time/requirements
- technical_other:       Stage drinks, dressing room items, towels, etc.

For stage drinks and dressing room items, use technical_other (NOT food_*).

Examples:
- "3x Pioneer CDJ-3000" → technical_equipment
- "1x Premium Vodka, 4x Still water" → technical_other
- "Soundcheck 17:00" → technical_soundcheck

Use fact_domain: "technical"

IGNORE everything else (flights, hotels, deals, general, contacts, etc.).
If text contains no technical info, return empty facts array.`;

        case 'documents':
            return `You extract DOCUMENT metadata from documents.

Extract ONLY these fact types:
- document_category: Document category/type

This is for tracking uploaded files and their properties.

Use fact_domain: "document_1", "document_2", etc.

IGNORE everything else (flights, hotels, deals, general, technical, etc.).
If text contains no document metadata, return empty facts array.`;

        default:
            return `You extract facts from documents. Extract only explicit information, never infer or guess.`;
    }
}
