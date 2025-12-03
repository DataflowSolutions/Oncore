/**
 * Flight Enrichment Service (Stage F3)
 * 
 * Treats flights as IDs (airline + flightNumber + date) and enriches them
 * with deterministic data from external flight APIs.
 * 
 * Pipeline:
 * - Stage F1: Extract flight keys (flightNumber, date, passenger data)
 * - Stage F2: Resolve duplicates, group by flight number
 * - Stage F3: THIS MODULE - Enrich with airports, times, etc. from APIs
 * 
 * WHY: LLMs are terrible at extracting structured flight data. APIs are perfect.
 */

import { logger } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

/**
 * Flight key extracted from documents (Stage F1 output)
 */
export interface ExtractedFlightKey {
  flightNumber: string;      // "TK67", "LH1234" (required)
  date?: string;             // "2025-02-03" (ISO date, required for API lookup)
  passengerName?: string;
  ticketNumber?: string;
  bookingReference?: string;
  seat?: string;
  travelClass?: string;      // Economy/Business/First
  notes?: string;
}

/**
 * Flight details from external API (Stage F3 enrichment)
 */
export interface FlightEnrichmentData {
  airline: string;           // "Turkish Airlines"
  airlineIATA: string;       // "TK"
  flightNumber: string;      // "TK67" (includes airline code)

  fromAirport: string;       // "IST" (IATA code)
  fromCity: string;          // "Istanbul"
  fromCountry?: string;      // "Turkey"

  toAirport: string;         // "DXB" (IATA code)
  toCity: string;            // "Dubai"
  toCountry?: string;        // "UAE"

  departureTime: string;     // ISO datetime
  arrivalTime: string;       // ISO datetime
  flightTime?: string;       // "6h 30m"

  aircraft?: string;         // "Boeing 777-300ER"
  status?: string;           // "scheduled", "delayed", "cancelled"
  terminal?: string;         // Departure terminal
  gate?: string;             // Gate number
}

/**
 * Enriched flight combining extracted keys + API data
 */
export interface EnrichedFlight {
  // Flight keys (from extraction)
  flightNumber: string;
  date?: string;
  passengerName?: string;
  ticketNumber?: string;
  bookingReference?: string;
  seat?: string;
  travelClass?: string;
  notes?: string;

  // API-enriched fields
  airline?: string;
  airlineIATA?: string;
  fromAirport?: string;
  fromCity?: string;
  fromCountry?: string;
  toAirport?: string;
  toCity?: string;
  toCountry?: string;
  departureTime?: string;
  arrivalTime?: string;
  flightTime?: string;
  aircraft?: string;
  status?: string;
  terminal?: string;
  gate?: string;

  // Enrichment metadata
  enrichmentStatus: 'not_attempted' | 'success' | 'failed' | 'partial';
  enrichmentError?: string;
  enrichmentSource?: string;
}

// =============================================================================
// Flight API Providers (extensible architecture)
// =============================================================================

export interface FlightAPIProvider {
  name: string;
  lookup(flightNumber: string, date: string): Promise<FlightEnrichmentData | null>;
}

/**
 * Mock provider for development/testing
 * 
 * Returns realistic flight data for known flights in the test database.
 * Acts like a real API: only returns data when both flightNumber and date match.
 */
class MockFlightProvider implements FlightAPIProvider {
  name = 'mock';

  /**
   * Mock flight database
   * Key: "FLIGHTNUMBER_YYYY-MM-DD"
   */
  private readonly MOCK_FLIGHTS: Record<string, FlightEnrichmentData> = {
    // TK67: Istanbul (IST) → New York JFK on 2026-03-21
    'TK67_2026-03-21': {
      airline: 'Turkish Airlines',
      airlineIATA: 'TK',
      flightNumber: 'TK67',
      fromAirport: 'IST',
      fromCity: 'Istanbul',
      fromCountry: 'Turkey',
      toAirport: 'JFK',
      toCity: 'New York',
      toCountry: 'USA',
      departureTime: '2026-03-21T13:55:00Z',
      arrivalTime: '2026-03-21T17:30:00Z',
      flightTime: '11h 35m',
      aircraft: 'Boeing 787-9',
      status: 'scheduled',
    },

    // TK1793: New York JFK → Istanbul (IST) on 2026-03-22
    'TK1793_2026-03-22': {
      airline: 'Turkish Airlines',
      airlineIATA: 'TK',
      flightNumber: 'TK1793',
      fromAirport: 'JFK',
      fromCity: 'New York',
      fromCountry: 'USA',
      toAirport: 'IST',
      toCity: 'Istanbul',
      toCountry: 'Turkey',
      departureTime: '2026-03-22T20:30:00Z',
      arrivalTime: '2026-03-23T14:10:00Z',
      flightTime: '10h 40m',
      aircraft: 'Airbus A350-900',
      status: 'scheduled',
    },
  };

  async lookup(flightNumber: string, date: string): Promise<FlightEnrichmentData | null> {
    // Validate required fields
    if (!flightNumber || !date) {
      logger.debug('Mock flight lookup: missing required fields', { flightNumber, date });
      return null;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Normalize inputs
    const normalizedFlightNumber = flightNumber.toUpperCase().trim();
    const normalizedDate = date.trim(); // Expect YYYY-MM-DD format

    // Generate lookup key
    const lookupKey = `${normalizedFlightNumber}_${normalizedDate}`;

    // Check if we have this flight in our mock database
    const flightData = this.MOCK_FLIGHTS[lookupKey];

    if (flightData) {
      logger.info('Mock flight lookup: SUCCESS', {
        flightNumber: normalizedFlightNumber,
        date: normalizedDate,
        route: `${flightData.fromCity} → ${flightData.toCity}`
      });
      return flightData;
    }

    // Flight not found in mock database
    logger.debug('Mock flight lookup: NOT FOUND', {
      flightNumber: normalizedFlightNumber,
      date: normalizedDate,
      hint: 'Add this flight to MOCK_FLIGHTS if you want mock data for it'
    });
    return null;
  }
}

// =============================================================================
// Enrichment Orchestrator
// =============================================================================

/**
 * Flight enrichment service
 * 
 * Uses a provider chain - tries each provider in order until one succeeds.
 */
export class FlightEnrichmentService {
  private providers: FlightAPIProvider[];

  constructor(providers?: FlightAPIProvider[]) {
    this.providers = providers || [
      // Default: use mock provider for development
      new MockFlightProvider(),

      // Add real providers here when API keys are available:
      // new AviationStackProvider(process.env.AVIATIONSTACK_API_KEY || ''),
    ];
  }

  /**
   * Enrich a single flight key with API data
   */
  async enrichFlight(flightKey: ExtractedFlightKey): Promise<EnrichedFlight> {
    const { flightNumber, date } = flightKey;

    // Validation
    if (!flightNumber) {
      return {
        ...flightKey,
        enrichmentStatus: 'failed',
        enrichmentError: 'Missing flight number',
      };
    }

    if (!date) {
      logger.warn('Flight missing date - cannot enrich', { flightNumber });
      return {
        ...flightKey,
        enrichmentStatus: 'failed',
        enrichmentError: 'Missing flight date (required for API lookup)',
      };
    }

    // Try each provider in order
    for (const provider of this.providers) {
      try {
        logger.info('Attempting flight enrichment', { provider: provider.name, flightNumber, date });

        const enrichmentData = await provider.lookup(flightNumber, date);

        if (enrichmentData) {
          logger.info('Flight enrichment successful', { provider: provider.name, flightNumber });

          return {
            ...flightKey,
            ...enrichmentData,
            enrichmentStatus: 'success',
            enrichmentSource: provider.name,
          };
        }
      } catch (error) {
        logger.warn('Flight enrichment provider failed', { provider: provider.name, error, flightNumber });
        continue;
      }
    }

    // All providers failed
    logger.warn('All flight enrichment providers failed', { flightNumber, date });

    return {
      ...flightKey,
      enrichmentStatus: 'failed',
      enrichmentError: 'No provider could enrich this flight',
    };
  }

  /**
   * Enrich multiple flights (with optional batching/rate limiting)
   */
  async enrichFlights(flightKeys: ExtractedFlightKey[]): Promise<EnrichedFlight[]> {
    logger.info('Enriching flights', { count: flightKeys.length });

    // Simple sequential processing (can be parallelized with rate limiting later)
    const enriched: EnrichedFlight[] = [];

    for (const key of flightKeys) {
      const result = await this.enrichFlight(key);
      enriched.push(result);
    }

    const successCount = enriched.filter(f => f.enrichmentStatus === 'success').length;
    logger.info('Flight enrichment complete', { total: flightKeys.length, successful: successCount });

    return enriched;
  }
}

// =============================================================================
// Singleton instance
// =============================================================================

let _enrichmentService: FlightEnrichmentService | null = null;

export function getFlightEnrichmentService(): FlightEnrichmentService {
  if (!_enrichmentService) {
    _enrichmentService = new FlightEnrichmentService();
  }
  return _enrichmentService;
}

/**
 * Set a custom enrichment service (useful for testing)
 */
export function setFlightEnrichmentService(service: FlightEnrichmentService): void {
  _enrichmentService = service;
}
