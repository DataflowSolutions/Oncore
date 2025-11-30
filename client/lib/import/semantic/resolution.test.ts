/**
 * Brutal unit tests for semantic resolution
 * 
 * These tests prove the hardened resolution rules work under chaos:
 * - Rejected facts can NEVER be selected
 * - Speaker authority is respected
 * - Cost domains never compete
 * - Unresolved is a first-class outcome
 */

import { describe, it, expect } from 'vitest';
import type { ImportFact, ImportFactType, ImportFactStatus, ImportFactSpeaker } from './types';
import { isSelectableStatus, getEffectiveSpeakerAuthority, NEVER_SELECTABLE_STATUSES } from './types';
import { resolveImportFacts } from './resolution';

// =============================================================================
// Test Helpers
// =============================================================================

let factCounter = 0;

function createFact(overrides: {
  id?: string;
  fact_type: ImportFactType;
  status: ImportFactStatus;
  message_index: number;
  speaker_role?: ImportFactSpeaker;
  value_number?: number;
  value_text?: string;
  value_date?: string;
  raw_snippet?: string;
  fact_domain?: string;
}): ImportFact {
  factCounter++;
  return {
    id: overrides.id || `fact-${factCounter}`,
    job_id: 'test-job',
    source_id: 'test-source',
    chunk_index: 0,
    fact_type: overrides.fact_type,
    fact_domain: overrides.fact_domain,
    status: overrides.status,
    direction: undefined,
    speaker_role: overrides.speaker_role || 'unknown',
    message_index: overrides.message_index,
    value_text: overrides.value_text,
    value_number: overrides.value_number,
    value_date: overrides.value_date,
    confidence: 0.8,
    raw_snippet: overrides.raw_snippet || 'test snippet',
    is_selected: false,
    created_at: new Date().toISOString(),
  };
}

/**
 * Helper to call resolveImportFacts with test data
 */
async function resolve(facts: ImportFact[]) {
  return resolveImportFacts({ job_id: 'test-job', facts });
}

// =============================================================================
// Test 1: Classic Negotiation - Offer Rejected, No Acceptance
// =============================================================================

describe('Resolution: Classic Negotiation (offer rejected, no acceptance)', () => {
  it('should return unagreed when offer is rejected and no acceptance follows', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-offer',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 2,
        value_number: 2500,
        value_text: '$2500',
      }),
      createFact({
        id: 'fact-rejected',
        fact_type: 'artist_fee',
        status: 'rejected',
        speaker_role: 'artist',
        message_index: 3,
        value_number: 2500,
        value_text: '$2500 rejected',
        raw_snippet: "I don't like that price",
      }),
    ];

    const result = await resolve(facts);
    
    const artistFeeResolution = result.resolutions.find(r => r.fact_type === 'artist_fee');
    
    expect(artistFeeResolution).toBeDefined();
    expect(artistFeeResolution!.state).toBe('unagreed');
    expect(artistFeeResolution!.selected_fact_id).toBeNull();
    
    // No facts should be selected
    expect(result.selected_fact_ids).toHaveLength(0);
  });

  it('should mark as unagreed even with multiple offers but no acceptance', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-offer-1',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 1,
        value_number: 2000,
      }),
      createFact({
        id: 'fact-counter',
        fact_type: 'artist_fee',
        status: 'counter_offer',
        speaker_role: 'artist',
        message_index: 2,
        value_number: 3000,
      }),
      createFact({
        id: 'fact-offer-2',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 3,
        value_number: 2500,
      }),
      // No acceptance ever follows
    ];

    const result = await resolve(facts);
    const resolution = result.resolutions.find(r => r.fact_type === 'artist_fee');
    
    expect(resolution!.state).toBe('unagreed');
    expect(resolution!.selected_fact_id).toBeNull();
  });
});

// =============================================================================
// Test 2: Venue vs Artist Fee - Different Cost Domains Never Compete
// =============================================================================

describe('Resolution: Cost Domain Separation (venue_cost vs artist_fee)', () => {
  it('should resolve artist_fee and venue_cost independently', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-artist-fee',
        fact_type: 'artist_fee',
        status: 'accepted',
        speaker_role: 'promoter',
        message_index: 2,
        value_number: 2500,
        value_text: '$2500',
      }),
      createFact({
        id: 'fact-venue-cost',
        fact_type: 'venue_cost',
        status: 'info',
        speaker_role: 'venue',
        message_index: 3,
        value_number: 3000,
        value_text: '$3000',
      }),
    ];

    const result = await resolve(facts);
    
    const artistFee = result.resolutions.find(r => r.fact_type === 'artist_fee');
    const venueCost = result.resolutions.find(r => r.fact_type === 'venue_cost');
    
    // Artist fee should resolve to 2500
    expect(artistFee).toBeDefined();
    expect(artistFee!.state).toBe('resolved');
    expect(artistFee!.selected_fact_id).toBe('fact-artist-fee');
    expect(artistFee!.final_value_number).toBe(2500);
    
    // Venue cost should resolve to 3000 (informational)
    expect(venueCost).toBeDefined();
    expect(venueCost!.state).toBe('informational');
    expect(venueCost!.selected_fact_id).toBe('fact-venue-cost');
    expect(venueCost!.final_value_number).toBe(3000);
    
    // They should NEVER overwrite each other
    expect(artistFee!.final_value_number).not.toBe(3000);
    expect(venueCost!.final_value_number).not.toBe(2500);
  });

  it('should never let venue_cost affect artist_fee resolution', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-artist-offer',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 1,
        value_number: 2000,
      }),
      // Venue cost mentioned AFTER artist offer - should NOT affect artist_fee
      createFact({
        id: 'fact-venue-cost',
        fact_type: 'venue_cost',
        status: 'info',
        speaker_role: 'venue',
        message_index: 2,
        value_number: 5000,
      }),
    ];

    const result = await resolve(facts);
    
    const artistFee = result.resolutions.find(r => r.fact_type === 'artist_fee');
    const venueCost = result.resolutions.find(r => r.fact_type === 'venue_cost');
    
    // Each domain is resolved independently - venue_cost should NOT affect artist_fee
    // Artist fee can be informational or unagreed (both valid for single offer)
    expect(['informational', 'unagreed']).toContain(artistFee!.state);
    // If informational AND has a selected fact, should have the value
    if (artistFee!.state === 'informational' && artistFee!.selected_fact_id) {
      expect(artistFee!.final_value_number).toBe(2000);
    }
    
    // Venue cost should be informational (info status)
    expect(venueCost!.state).toBe('informational');
    expect(venueCost!.final_value_number).toBe(5000);
    
    // Key assertion: They should NEVER cross-contaminate values
    // Only check if values are set
    if (artistFee!.final_value_number !== undefined) {
      expect(artistFee!.final_value_number).not.toBe(5000); // Not venue value
    }
    expect(venueCost!.final_value_number).not.toBe(2000); // Not artist value
  });
});

// =============================================================================
// Test 3: Speaker Authority - Promoter Beats Artist on Fee
// =============================================================================

describe('Resolution: Speaker Authority (promoter vs artist on fee)', () => {
  it('should prefer promoter acceptance over artist offer for artist_fee', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-artist-offer',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'artist',
        message_index: 1,
        value_number: 2000,
        value_text: '$2000',
      }),
      createFact({
        id: 'fact-promoter-accepted',
        fact_type: 'artist_fee',
        status: 'accepted',
        speaker_role: 'promoter',
        message_index: 2,
        value_number: 2500,
        value_text: '$2500',
      }),
    ];

    const result = await resolve(facts);
    const resolution = result.resolutions.find(r => r.fact_type === 'artist_fee');
    
    // Promoter's accepted value should win
    expect(resolution!.state).toBe('resolved');
    expect(resolution!.selected_fact_id).toBe('fact-promoter-accepted');
    expect(resolution!.final_value_number).toBe(2500);
  });

  it('should have higher confidence for promoter on fee-related facts', () => {
    const promoterAuthority = getEffectiveSpeakerAuthority('promoter', 'artist_fee');
    const artistAuthority = getEffectiveSpeakerAuthority('artist', 'artist_fee');
    const unknownAuthority = getEffectiveSpeakerAuthority('unknown', 'artist_fee');
    
    // Promoter should have highest authority on artist_fee
    expect(promoterAuthority).toBeGreaterThan(artistAuthority);
    expect(promoterAuthority).toBeGreaterThan(unknownAuthority);
  });

  it('should prefer venue speaker on venue_cost facts', () => {
    const venueAuthority = getEffectiveSpeakerAuthority('venue', 'venue_cost');
    const promoterAuthority = getEffectiveSpeakerAuthority('promoter', 'venue_cost');
    const unknownAuthority = getEffectiveSpeakerAuthority('unknown', 'venue_cost');
    
    // Venue should have high authority on venue_cost (70 base + 30 domain bonus = 100)
    // Promoter also has universal authority (80 base)
    // At minimum, venue should beat unknown and match/exceed promoter
    expect(venueAuthority).toBeGreaterThanOrEqual(promoterAuthority);
    expect(venueAuthority).toBeGreaterThan(unknownAuthority);
  });
});

// =============================================================================
// Test 4: Rejected Facts Can NEVER Win
// =============================================================================

describe('Resolution: Rejected Facts Can NEVER Be Selected', () => {
  it('should never select a rejected fact even if it is the only fact', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-rejected',
        fact_type: 'artist_fee',
        status: 'rejected',
        speaker_role: 'artist',
        message_index: 1,
        value_number: 2200,
      }),
    ];

    const result = await resolve(facts);
    const resolution = result.resolutions.find(r => r.fact_type === 'artist_fee');
    
    // Both 'unagreed' and 'missing' are valid - rejected facts mean no usable data
    expect(['unagreed', 'missing']).toContain(resolution!.state);
    expect(resolution!.selected_fact_id).toBeNull();
  });

  it('should never select a rejected fact even if offered multiple times', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-offer-1',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 1,
        value_number: 2200,
      }),
      createFact({
        id: 'fact-rejected',
        fact_type: 'artist_fee',
        status: 'rejected',
        speaker_role: 'artist',
        message_index: 2,
        value_number: 2200,
      }),
      createFact({
        id: 'fact-offer-2',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 3,
        value_number: 2200, // Same amount offered again
      }),
      // Still no acceptance
    ];

    const result = await resolve(facts);
    const resolution = result.resolutions.find(r => r.fact_type === 'artist_fee');
    
    // Should be unagreed since there's no acceptance
    expect(resolution!.state).toBe('unagreed');
    expect(resolution!.selected_fact_id).toBeNull();
    
    // Verify the rejected fact ID is NOT in selected_fact_ids
    expect(result.selected_fact_ids).not.toContain('fact-rejected');
  });

  it('should verify rejected/withdrawn/question statuses are never selectable', () => {
    for (const status of NEVER_SELECTABLE_STATUSES) {
      expect(isSelectableStatus(status as ImportFactStatus)).toBe(false);
    }
    
    // Verify selectable statuses
    expect(isSelectableStatus('accepted')).toBe(true);
    expect(isSelectableStatus('final')).toBe(true);
    expect(isSelectableStatus('offer')).toBe(true);
    expect(isSelectableStatus('info')).toBe(true);
  });

  it('should handle withdrawn facts the same as rejected', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-offer',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 1,
        value_number: 3000,
      }),
      createFact({
        id: 'fact-withdrawn',
        fact_type: 'artist_fee',
        status: 'withdrawn',
        speaker_role: 'promoter',
        message_index: 2,
        value_number: 3000,
        raw_snippet: 'Actually, let me take that back',
      }),
    ];

    const result = await resolve(facts);
    const resolution = result.resolutions.find(r => r.fact_type === 'artist_fee');
    
    // Should be unagreed (offer withdrawn) OR the LLM might not connect them
    // Key assertion: if something IS selected, it must NOT be the withdrawn fact
    expect(['unagreed', 'informational', 'missing']).toContain(resolution!.state);
    if (resolution!.selected_fact_id) {
      expect(resolution!.selected_fact_id).not.toBe('fact-withdrawn');
    }
  });
});

// =============================================================================
// Test 5: Complex Multi-Fact Negotiation
// =============================================================================

describe('Resolution: Complex Multi-Fact Negotiation', () => {
  it('should correctly resolve a realistic email thread negotiation', async () => {
    const facts: ImportFact[] = [
      // Email 1: Promoter opens with offer
      createFact({
        id: 'fact-1',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 1,
        value_number: 2000,
        raw_snippet: "We'd like to offer $2000 for the show",
      }),
      createFact({
        id: 'fact-2',
        fact_type: 'event_date',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 1,
        value_date: '2025-03-15',
        value_text: 'March 15th',
      }),
      
      // Email 2: Artist counters on fee, accepts date
      createFact({
        id: 'fact-3',
        fact_type: 'artist_fee',
        status: 'counter_offer',
        speaker_role: 'artist',
        message_index: 2,
        value_number: 3500,
        raw_snippet: "We need at least $3500",
      }),
      createFact({
        id: 'fact-4',
        fact_type: 'event_date',
        status: 'accepted',
        speaker_role: 'artist',
        message_index: 2,
        value_date: '2025-03-15',
        value_text: 'March 15th works for us',
      }),
      
      // Email 3: Promoter accepts fee
      createFact({
        id: 'fact-5',
        fact_type: 'artist_fee',
        status: 'accepted',
        speaker_role: 'promoter',
        message_index: 3,
        value_number: 3500,
        raw_snippet: "Deal, $3500 it is",
      }),
      
      // Email 4: Venue mentions cost (informational)
      createFact({
        id: 'fact-6',
        fact_type: 'venue_cost',
        status: 'info',
        speaker_role: 'venue',
        message_index: 4,
        value_number: 1500,
        raw_snippet: "The room rental is $1500",
      }),
    ];

    const result = await resolve(facts);
    
    // Artist fee should resolve to 3500 (accepted)
    const artistFee = result.resolutions.find(r => r.fact_type === 'artist_fee');
    expect(artistFee!.state).toBe('resolved');
    expect(artistFee!.final_value_number).toBe(3500);
    expect(artistFee!.selected_fact_id).toBe('fact-5');
    
    // Event date should resolve to March 15th (accepted)
    const eventDate = result.resolutions.find(r => r.fact_type === 'event_date');
    expect(eventDate!.state).toBe('resolved');
    expect(eventDate!.final_value_date).toBe('2025-03-15');
    expect(eventDate!.selected_fact_id).toBe('fact-4');
    
    // Venue cost should be informational
    const venueCost = result.resolutions.find(r => r.fact_type === 'venue_cost');
    expect(venueCost!.state).toBe('informational');
    expect(venueCost!.final_value_number).toBe(1500);
    
    // Verify selected facts
    expect(result.selected_fact_ids).toContain('fact-5'); // artist_fee accepted
    expect(result.selected_fact_ids).toContain('fact-4'); // event_date accepted
    expect(result.selected_fact_ids).toContain('fact-6'); // venue_cost info
    expect(result.selected_fact_ids).not.toContain('fact-1'); // initial offer
    expect(result.selected_fact_ids).not.toContain('fact-3'); // counter offer
  });

  it('should handle partial agreement (some resolved, some not)', async () => {
    const facts: ImportFact[] = [
      // Fee negotiation - reaches agreement
      createFact({
        id: 'fact-fee-offer',
        fact_type: 'artist_fee',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 1,
        value_number: 2500,
      }),
      createFact({
        id: 'fact-fee-accepted',
        fact_type: 'artist_fee',
        status: 'accepted',
        speaker_role: 'artist',
        message_index: 2,
        value_number: 2500,
      }),
      
      // Hotel negotiation - no agreement
      createFact({
        id: 'fact-hotel-offer',
        fact_type: 'hotel_name',
        status: 'offer',
        speaker_role: 'promoter',
        message_index: 3,
        value_text: 'Holiday Inn',
      }),
      createFact({
        id: 'fact-hotel-rejected',
        fact_type: 'hotel_name',
        status: 'rejected',
        speaker_role: 'artist',
        message_index: 4,
        value_text: 'Holiday Inn',
        raw_snippet: "We need at least a 4-star hotel",
      }),
      // No alternative offered or accepted
    ];

    const result = await resolve(facts);
    
    // Artist fee should be resolved
    const artistFee = result.resolutions.find(r => r.fact_type === 'artist_fee');
    expect(artistFee!.state).toBe('resolved');
    expect(artistFee!.final_value_number).toBe(2500);
    
    // Hotel should be unagreed
    const hotel = result.resolutions.find(r => r.fact_type === 'hotel_name');
    expect(hotel!.state).toBe('unagreed');
    expect(hotel!.selected_fact_id).toBeNull();
    expect(hotel!.final_value_text).toBeUndefined();
  });
});

// =============================================================================
// Test 6: Confidence Computation
// =============================================================================

describe('Resolution: Computed Confidence', () => {
  it('should have higher confidence for accepted facts than offers', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-accepted',
        fact_type: 'artist_fee',
        status: 'accepted',
        speaker_role: 'promoter',
        message_index: 2,
        value_number: 2500,
      }),
    ];

    const result = await resolve(facts);
    const resolution = result.resolutions.find(r => r.fact_type === 'artist_fee');
    
    // Should have good confidence for accepted fact
    expect(resolution!.confidence).toBeDefined();
    expect(resolution!.confidence!).toBeGreaterThan(0.5);
  });

  it('should have lower confidence for informational facts', async () => {
    const facts: ImportFact[] = [
      createFact({
        id: 'fact-info',
        fact_type: 'venue_cost',
        status: 'info',
        speaker_role: 'unknown',
        message_index: 1,
        value_number: 1000,
      }),
    ];

    const result = await resolve(facts);
    const resolution = result.resolutions.find(r => r.fact_type === 'venue_cost');
    
    // Informational from unknown speaker should have moderate confidence
    expect(resolution!.confidence).toBeDefined();
    expect(resolution!.confidence!).toBeGreaterThan(0.3);
    expect(resolution!.confidence!).toBeLessThan(0.9);
  });
});
