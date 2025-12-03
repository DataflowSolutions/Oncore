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
 * Dynamically generates realistic flight data for ANY flight number/date combination.
 * No need to maintain a static database - just generates consistent mock data on the fly.
 */
class MockFlightProvider implements FlightAPIProvider {
  name = 'mock';

  /**
   * Extract airline code from flight number (e.g., "TK67" -> "TK")
   */
  private extractAirlineCode(flightNumber: string): string {
    const match = flightNumber.match(/^([A-Z]{2})/);
    return match ? match[1] : 'XX';
  }

  /**
   * Get airline name from IATA code
   */
  private getAirlineName(iataCode: string): string {
    const airlines: Record<string, string> = {
      'TK': 'Turkish Airlines',
      'LH': 'Lufthansa',
      'BA': 'British Airways',
      'AF': 'Air France',
      'KL': 'KLM',
      'EK': 'Emirates',
      'QR': 'Qatar Airways',
      'AA': 'American Airlines',
      'DL': 'Delta Air Lines',
      'UA': 'United Airlines',
    };
    return airlines[iataCode] || `${iataCode} Airlines`;
  }

  /**
   * Generate consistent mock data for any flight
   */
  private generateMockFlight(flightNumber: string, date: string): FlightEnrichmentData {
    const airlineIATA = this.extractAirlineCode(flightNumber);
    const airline = this.getAirlineName(airlineIATA);

    // Generate consistent departure time based on flight number hash
    const flightNumeric = parseInt(flightNumber.replace(/\D/g, '')) || 0;
    const departureHour = 6 + (flightNumeric % 18); // 6:00 - 23:59
    const departureMinute = (flightNumeric % 12) * 5; // :00, :05, :10, etc.

    const departureTime = `${date}T${String(departureHour).padStart(2, '0')}:${String(departureMinute).padStart(2, '0')}:00Z`;
    
    // Flight duration: 6-12 hours based on hash
    const flightDurationHours = 6 + (flightNumeric % 7);
    const flightDurationMinutes = (flightNumeric % 6) * 10;
    
    // Calculate arrival time
    const departureDate = new Date(departureTime);
    departureDate.setHours(departureDate.getHours() + flightDurationHours);
    departureDate.setMinutes(departureDate.getMinutes() + flightDurationMinutes);
    const arrivalTime = departureDate.toISOString();

    // Format flight time
    const flightTime = `${flightDurationHours}h ${flightDurationMinutes}m`;

    // Consistent airport pairs based on flight number
    const routes = [
      { from: 'IST', fromCity: 'Istanbul', fromCountry: 'Turkey', to: 'JFK', toCity: 'New York', toCountry: 'USA' },
      { from: 'LHR', fromCity: 'London', fromCountry: 'UK', to: 'DXB', toCity: 'Dubai', toCountry: 'UAE' },
      { from: 'CDG', fromCity: 'Paris', fromCountry: 'France', to: 'LAX', toCity: 'Los Angeles', toCountry: 'USA' },
      { from: 'FRA', fromCity: 'Frankfurt', fromCountry: 'Germany', to: 'SIN', toCity: 'Singapore', toCountry: 'Singapore' },
      { from: 'AMS', fromCity: 'Amsterdam', fromCountry: 'Netherlands', to: 'NRT', toCity: 'Tokyo', toCountry: 'Japan' },
    ];
    const route = routes[flightNumeric % routes.length];

    // Consistent aircraft based on hash
    const aircraftTypes = [
      'Boeing 787-9',
      'Airbus A350-900',
      'Boeing 777-300ER',
      'Airbus A330-300',
      'Boeing 737-800',
    ];
    const aircraft = aircraftTypes[flightNumeric % aircraftTypes.length];

    return {
      airline,
      airlineIATA,
      flightNumber,
      fromAirport: route.from,
      fromCity: route.fromCity,
      fromCountry: route.fromCountry,
      toAirport: route.to,
      toCity: route.toCity,
      toCountry: route.toCountry,
      departureTime,
      arrivalTime,
      flightTime,
      aircraft,
      status: 'scheduled',
    };
  }

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

    // Generate mock data dynamically
    const flightData = this.generateMockFlight(normalizedFlightNumber, normalizedDate);

    logger.info('Mock flight lookup: SUCCESS (dynamic generation)', {
      flightNumber: normalizedFlightNumber,
      date: normalizedDate,
      route: `${flightData.fromCity} → ${flightData.toCity}`
    });

    return flightData;
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
