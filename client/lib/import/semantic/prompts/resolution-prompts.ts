/**
 * LLM Prompts for Semantic Resolution
 * 
 * System and user prompts for the resolution stage that determines
 * canonical truth from extracted facts.
 */

export const RESOLUTION_SYSTEM_PROMPT = `You are an expert at analyzing negotiation threads and determining the final agreed state.
You must respond with valid JSON only.

Your task is to review ALL extracted facts and determine:
1. Which facts represent the FINAL AGREED state (if any)
2. Which facts were superseded by counter-offers or rejections
3. Which fact domains remain UNRESOLVED (offers made but not accepted)

AVAILABLE STATES - choose the right one:
- "resolved" = Agreement reached. REQUIRES a fact with status="accepted" or "final"
- "unagreed" = Active negotiation but no agreement. Use when counter-offers or rejections exist but no acceptance
- "informational" = Data record without negotiation. Use for single offers/info WITHOUT counter-offers or rejections
- "missing" = No facts found for this type

CRITICAL SERVER-ENFORCED RULES:
1. state="resolved" REQUIRES selected_fact_id pointing to a fact with status "accepted" or "final"
2. REJECTED/WITHDRAWN facts can NEVER be selected - ignore them
3. Different cost domains (artist_fee vs venue_cost) are COMPLETELY SEPARATE
4. Single offers WITHOUT negotiation context (no counter-offers, no rejections) = "informational", NOT "unagreed"

OUTPUT FORMAT (respond with JSON only):
{
  "resolutions": [
    {
      "fact_type": "artist_fee",
      "fact_domain": null,
      "selected_fact_id": "uuid-of-the-ACCEPTED-fact",
      "state": "resolved",
      "reason": "Explicit acceptance found"
    },
    {
      "fact_type": "venue_cost",
      "selected_fact_id": "uuid-of-info-fact",
      "state": "informational",
      "reason": "Single info fact, no negotiation context"
    }
  ]
}`;

export const RESOLUTION_USER_PROMPT = `Analyze the following extracted facts and determine the final resolved state for each fact type.
Respond with JSON containing your resolutions.

IMPORTANT - Read the "status" field of each fact:
- If a fact has status="accepted" or status="final" → it CAN be selected, use state="resolved"
- If a fact has status="rejected" or status="withdrawn" → NEVER select it, ignore completely

STATE DECISION LOGIC:
1. If ANY fact has status="accepted" or "final" → state="resolved", select that fact
2. If ONLY offers exist WITH counter-offers/rejections → state="unagreed" (active negotiation)
3. If ONLY offers exist WITHOUT counter-offers/rejections → state="informational" (record/confirmation)
4. If ONLY info facts exist → state="informational"

The key distinction:
- "unagreed" = active negotiation with back-and-forth, no final agreement reached
- "informational" = data record (like a booking confirmation) - single offer without negotiation context

Facts to analyze (ordered by message_index):
{facts_json}

Return valid JSON with resolutions for each fact_type.`;
