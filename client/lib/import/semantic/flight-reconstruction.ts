/**
 * Stage 2.5: Flight Instance Reconstruction
 * 
 * Groups related flight facts into coherent flight instances before application.
 * This bridges the gap between atomic fact extraction and structured ImportData.
 * 
 * Why this matters:
 * - Facts are extracted atomically (flightNumber, fromAirport, seat, etc.)
 * - ImportData expects grouped flight legs (flights[0].flightNumber, flights[0].seat)
 * - Without grouping, we lose the association between related facts
 * 
 * Grouping strategy:
 * 1. fact_domain (explicit grouping from LLM: flight_1, flight_2, etc.)
 * 2. flightNumber proximity (facts within same chunk mentioning same flight)
 * 3. Chunk proximity (fallback: facts from same text chunk)
 */

import type { FactResolution, ImportFactType, ImportFact } from './types';
import type { ImportData } from '@/components/import/types';

// =============================================================================
// Flight Group Structure
// =============================================================================

export interface FlightGroup {
  // Group metadata
  groupId: string; // e.g., "flight_1", "TK67_chunk3", "chunk_5"
  groupingStrategy: 'fact_domain' | 'flight_number' | 'chunk_proximity';
  
  // Resolved flight facts
  airline?: string;
  flightNumber?: string;
  aircraft?: string;
  
  fromCity?: string;
  fromAirport?: string;
  departureTime?: string;
  
  toCity?: string;
  toAirport?: string;
  arrivalTime?: string;
  
  viaAirport?: string;
  
  seat?: string;
  travelClass?: string;
  flightTime?: string;
  
  fullName?: string;
  bookingReference?: string;
  ticketNumber?: string;
  date?: string; // Flight date (YYYY-MM-DD)
  notes?: string; // Additional notes
  
  direction?: string; // e.g., "DPS to IST via ARN"
  
  // Source tracking
  sourceFactIds: string[];
  confidence: number;
}

// Flight-related fact types
// NOTE: Only includes types that are extracted from documents
// Types like flight_airline, flight_aircraft, etc. are fetched via API in Stage F3
const FLIGHT_FACT_TYPES: Set<ImportFactType> = new Set([
  'flight_number',
  'flight_date',
  'flight_passenger_name',
  'flight_booking_reference',
  'flight_ticket_number',
  'flight_seat',
  'flight_travel_class',
  'flight_notes',
]);

// =============================================================================
// Grouping Logic
// =============================================================================

/**
 * Extract grouping key from fact_domain or fact metadata
 */
function extractFlightDomain(
  resolution: FactResolution,
  getSelectedFact: (resolution: FactResolution) => ImportFact | null
): string | null {
  // Try fact_domain first (explicit grouping from LLM)
  const selectedFact = getSelectedFact(resolution);
  
  if (selectedFact?.fact_domain?.startsWith('flight_')) {
    return selectedFact.fact_domain;
  }
  
  return null;
}

/**
 * Extract flight number from resolution for proximity grouping
 */
function extractFlightNumber(resolution: FactResolution): string | null {
  if (resolution.fact_type !== 'flight_number') {
    return null;
  }
  
  return resolution.final_value_text?.toUpperCase() || null;
}

/**
 * Get chunk identifier from resolution facts
 */
function getChunkId(
  resolution: FactResolution,
  getSelectedFact: (resolution: FactResolution) => ImportFact | null
): string | null {
  const selectedFact = getSelectedFact(resolution);
  
  if (!selectedFact) return null;
  
  return `${selectedFact.source_id}_chunk_${selectedFact.chunk_index}`;
}

/**
 * Group flight resolutions into flight instances
 * 
 * @param resolutions - All fact resolutions
 * @param allFacts - All import facts (for accessing fact metadata)
 */
export function reconstructFlightInstances(
  resolutions: FactResolution[],
  allFacts: ImportFact[]
): FlightGroup[] {
  // Build fact map for lookups
  const factsById = new Map(allFacts.map(f => [f.id, f]));
  
  // Filter to flight-related resolutions (resolved OR informational)
  const flightResolutions = resolutions.filter(r => 
    FLIGHT_FACT_TYPES.has(r.fact_type) && (r.state === 'resolved' || r.state === 'informational')
  );
  
  if (flightResolutions.length === 0) {
    return [];
  }
  
  // Helper to get selected fact
  const getSelectedFact = (resolution: FactResolution): ImportFact | null => 
    resolution.selected_fact_id ? (factsById.get(resolution.selected_fact_id) || null) : null;
  
  // Strategy 1: Group by fact_domain (most reliable)
  const domainGroups = new Map<string, FactResolution[]>();
  const ungrouped: FactResolution[] = [];
  
  for (const resolution of flightResolutions) {
    const domain = extractFlightDomain(resolution, getSelectedFact);
    if (domain) {
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain)!.push(resolution);
    } else {
      ungrouped.push(resolution);
    }
  }
  
  // Strategy 2: Group ungrouped facts by flight number proximity
  const flightNumberGroups = new Map<string, FactResolution[]>();
  const stillUngrouped: FactResolution[] = [];
  
  for (const resolution of ungrouped) {
    // Look for flight number in same chunk
    const chunkId = getChunkId(resolution, getSelectedFact);
    if (!chunkId) {
      stillUngrouped.push(resolution);
      continue;
    }
    
    // Find flight number in same chunk
    const sameChunkFlightNumbers = ungrouped.filter(r => 
      r.fact_type === 'flight_number' && 
      getChunkId(r, getSelectedFact) === chunkId
    );
    
    if (sameChunkFlightNumbers.length > 0) {
      const flightNum = extractFlightNumber(sameChunkFlightNumbers[0]);
      if (flightNum) {
        const key = `${flightNum}_${chunkId}`;
        if (!flightNumberGroups.has(key)) {
          flightNumberGroups.set(key, []);
        }
        flightNumberGroups.get(key)!.push(resolution);
        continue;
      }
    }
    
    stillUngrouped.push(resolution);
  }
  
  // Strategy 3: Group remaining by chunk proximity
  const chunkGroups = new Map<string, FactResolution[]>();
  
  for (const resolution of stillUngrouped) {
    const chunkId = getChunkId(resolution, getSelectedFact);
    if (chunkId) {
      if (!chunkGroups.has(chunkId)) {
        chunkGroups.set(chunkId, []);
      }
      chunkGroups.get(chunkId)!.push(resolution);
    }
  }
  
  // Build flight groups
  const flightGroups: FlightGroup[] = [];
  
  // Add domain-based groups
  for (const [domain, resolutions] of domainGroups) {
    flightGroups.push(buildFlightGroup(domain, resolutions, 'fact_domain', getSelectedFact));
  }
  
  // Add flight number groups
  for (const [key, resolutions] of flightNumberGroups) {
    flightGroups.push(buildFlightGroup(key, resolutions, 'flight_number', getSelectedFact));
  }
  
  // Add chunk-based groups
  for (const [chunkId, resolutions] of chunkGroups) {
    flightGroups.push(buildFlightGroup(chunkId, resolutions, 'chunk_proximity', getSelectedFact));
  }
  
  return flightGroups;
}

/**
 * Build a FlightGroup from a set of resolutions
 */
function buildFlightGroup(
  groupId: string,
  resolutions: FactResolution[],
  strategy: FlightGroup['groupingStrategy'],
  getSelectedFact: (resolution: FactResolution) => ImportFact | null
): FlightGroup {
  const group: FlightGroup = {
    groupId,
    groupingStrategy: strategy,
    sourceFactIds: [],
    confidence: 0,
  };
  
  let confidenceSum = 0;
  let confidenceCount = 0;
  
  for (const resolution of resolutions) {
    // Track source facts
    if (resolution.selected_fact_id) {
      group.sourceFactIds.push(resolution.selected_fact_id);
    }
    
    // Accumulate confidence
    const selectedFact = getSelectedFact(resolution);
    
    if (selectedFact) {
      confidenceSum += selectedFact.confidence;
      confidenceCount++;
    }
    
    // Map fact to group field
    const value = resolution.final_value_text || 
                  resolution.final_value_number?.toString() ||
                  resolution.final_value_date;
    
    if (!value) continue;
    
    switch (resolution.fact_type) {
      case 'flight_number':
        group.flightNumber = value;
        break;
      case 'flight_seat':
        group.seat = value;
        break;
      case 'flight_travel_class':
        group.travelClass = value;
        break;
      case 'flight_passenger_name':
        group.fullName = value;
        break;
      case 'flight_booking_reference':
        group.bookingReference = value;
        break;
      case 'flight_ticket_number':
        group.ticketNumber = value;
        break;
      case 'flight_date':
        group.date = value;
        break;
      case 'flight_notes':
        group.notes = value;
        break;
    }
  }
  
  // Calculate average confidence
  group.confidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;
  
  return group;
}

// =============================================================================
// Application to ImportData
// =============================================================================

/**
 * Apply flight groups to ImportData.flights array
 */
export function applyFlightGroupsToImportData(
  importData: ImportData,
  flightGroups: FlightGroup[]
): ImportData {
  // Sort groups by confidence (highest first)
  const sortedGroups = [...flightGroups].sort((a, b) => b.confidence - a.confidence);
  
  // Initialize flights array if needed
  if (!importData.flights) {
    importData.flights = [];
  }
  
  // Apply each group as a flight leg
  for (const group of sortedGroups) {
    importData.flights.push({
      airline: group.airline ?? '',
      flightNumber: group.flightNumber ?? '',
      aircraft: group.aircraft ?? '',
      
      fromCity: group.fromCity ?? '',
      fromAirport: group.fromAirport ?? '',
      departureTime: group.departureTime ?? '',
      
      toCity: group.toCity ?? '',
      toAirport: group.toAirport ?? '',
      arrivalTime: group.arrivalTime ?? '',
      
      seat: group.seat ?? '',
      travelClass: group.travelClass ?? '',
      flightTime: group.flightTime ?? '',
      
      fullName: group.fullName ?? '',
      bookingReference: group.bookingReference ?? '',
      ticketNumber: group.ticketNumber ?? '',
      date: group.date ?? '',
      notes: group.notes ?? '',
    })
  }
  
  return importData;
}

/**
 * Get flight fact type IDs that were consumed by reconstruction
 */
export function getConsumedFlightFactTypes(): Set<ImportFactType> {
  return new Set(FLIGHT_FACT_TYPES);
}
