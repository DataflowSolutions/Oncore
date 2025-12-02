/**
 * Stage 3.5: Data Enrichment
 * 
 * Derives additional fields using deterministic logic (NO AI).
 * This fills gaps that extraction/resolution cannot handle, such as:
 * - City lookups from IATA codes
 * - Flight time calculations
 * - Constructed display names
 * - Booking reference propagation across flight legs
 * 
 * Pure logic layer - no LLM calls, no database queries.
 */

import type { ImportData, ImportedFlight } from '@/components/import/types';

// =============================================================================
// IATA Airport Code → City Mapping
// =============================================================================

/**
 * Major airport codes mapped to cities.
 * This is the same map used in post-processing for consistency.
 */
const IATA_TO_CITY: Record<string, string> = {
  // North America
  'JFK': 'New York', 'LGA': 'New York', 'EWR': 'Newark',
  'LAX': 'Los Angeles', 'SFO': 'San Francisco', 'ORD': 'Chicago',
  'DFW': 'Dallas', 'ATL': 'Atlanta', 'MIA': 'Miami',
  'LAS': 'Las Vegas', 'SEA': 'Seattle', 'BOS': 'Boston',
  'YYZ': 'Toronto', 'YVR': 'Vancouver', 'YUL': 'Montreal',
  'MEX': 'Mexico City', 'CUN': 'Cancun',
  
  // Europe
  'LHR': 'London', 'LGW': 'London', 'STN': 'London',
  'CDG': 'Paris', 'ORY': 'Paris',
  'FRA': 'Frankfurt', 'MUC': 'Munich', 'BER': 'Berlin',
  'AMS': 'Amsterdam', 'BRU': 'Brussels',
  'MAD': 'Madrid', 'BCN': 'Barcelona',
  'FCO': 'Rome', 'MXP': 'Milan',
  'VIE': 'Vienna', 'ZRH': 'Zurich', 'GVA': 'Geneva',
  'CPH': 'Copenhagen', 'OSL': 'Oslo', 'STO': 'Stockholm',
  'HEL': 'Helsinki', 'ATH': 'Athens',
  'DUB': 'Dublin', 'EDI': 'Edinburgh', 'MAN': 'Manchester',
  'LIS': 'Lisbon', 'PRG': 'Prague', 'BUD': 'Budapest',
  'WAW': 'Warsaw', 'KRK': 'Krakow',
  
  // Middle East
  'DXB': 'Dubai', 'AUH': 'Abu Dhabi', 'DOH': 'Doha',
  'IST': 'Istanbul',
  'TLV': 'Tel Aviv', 'AMM': 'Amman', 'CAI': 'Cairo',
  'RUH': 'Riyadh', 'JED': 'Jeddah',
  'BEY': 'Beirut', 'KWI': 'Kuwait',
  
  // Asia Pacific
  'HKG': 'Hong Kong', 'SIN': 'Singapore', 'BKK': 'Bangkok',
  'NRT': 'Tokyo', 'HND': 'Tokyo', 'KIX': 'Osaka',
  'ICN': 'Seoul', 'PVG': 'Shanghai', 'PEK': 'Beijing',
  'DEL': 'Delhi', 'BOM': 'Mumbai', 'BLR': 'Bangalore',
  'SYD': 'Sydney', 'MEL': 'Melbourne', 'AKL': 'Auckland',
  'MNL': 'Manila', 'CGK': 'Jakarta', 'KUL': 'Kuala Lumpur',
  'TPE': 'Taipei', 'HAN': 'Hanoi', 'SGN': 'Ho Chi Minh City',
  
  // Indonesia
  'DPS': 'Bali',  'SUB': 'Surabaya',
  
  // South America
  'GRU': 'São Paulo', 'GIG': 'Rio de Janeiro',
  'EZE': 'Buenos Aires', 'BOG': 'Bogota', 'LIM': 'Lima',
  'SCL': 'Santiago',
  
  // Africa
  'JNB': 'Johannesburg', 'CPT': 'Cape Town',
  'ADD': 'Addis Ababa',
  'NBO': 'Nairobi', 'LOS': 'Lagos',
};

/**
 * Lookup city from IATA airport code
 */
function lookupCityFromIATA(iataCode: string): string | undefined {
  if (!iataCode || iataCode.length !== 3) return undefined;
  return IATA_TO_CITY[iataCode.toUpperCase()];
}

// =============================================================================
// Flight Time Parsing
// =============================================================================

/**
 * Parse flight duration from various formats
 * Examples: "3h 15m", "3h15m", "3 hours 15 minutes", "195 minutes"
 */
function parseFlightDuration(text: string): string | null {
  if (!text) return null;
  
  // Match patterns like "3h 15m", "3h15m"
  const hourMinPattern = /(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:ute)?s?)?/i;
  const match = text.match(hourMinPattern);
  if (match) {
    return `${match[1]}h ${match[2]}m`;
  }
  
  // Just hours: "3h", "3 hours"
  const hoursOnly = text.match(/(\d+)\s*h(?:ours?)?/i);
  if (hoursOnly) {
    return `${hoursOnly[1]}h 0m`;
  }
  
  // Just minutes: "195 minutes", "195m"
  const minutesOnly = text.match(/(\d+)\s*m(?:in(?:ute)?s?)?/i);
  if (minutesOnly) {
    const totalMinutes = parseInt(minutesOnly[1]);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
  
  return null;
}

/**
 * Calculate flight duration from departure and arrival times
 * Simplified - doesn't handle timezone or date changes
 */
function calculateFlightDuration(departureTime: string, arrivalTime: string): string | null {
  if (!departureTime || !arrivalTime) return null;
  
  // Parse HH:MM format
  const parseTime = (time: string): { hours: number; minutes: number } | null => {
    const match = time.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return {
      hours: parseInt(match[1]),
      minutes: parseInt(match[2]),
    };
  };
  
  const dept = parseTime(departureTime);
  const arr = parseTime(arrivalTime);
  
  if (!dept || !arr) return null;
  
  // Simple calculation (doesn't handle overnight flights correctly)
  let totalMinutes = (arr.hours * 60 + arr.minutes) - (dept.hours * 60 + dept.minutes);
  
  // If negative, assume overnight
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}h ${minutes}m`;
}

// =============================================================================
// Flight Enrichment
// =============================================================================

/**
 * Enrich a single flight with derived fields
 */
function enrichFlight(flight: ImportedFlight, allFlights: ImportedFlight[]): ImportedFlight {
  const enriched = { ...flight };
  
  // 1. Derive fromCity from fromAirport IATA code
  if (!enriched.fromCity && enriched.fromAirport) {
    const city = lookupCityFromIATA(enriched.fromAirport);
    if (city) {
      enriched.fromCity = city;
    }
  }
  
  // 2. Derive toCity from toAirport IATA code
  if (!enriched.toCity && enriched.toAirport) {
    const city = lookupCityFromIATA(enriched.toAirport);
    if (city) {
      enriched.toCity = city;
    }
  }
  
  // 3. Parse flightTime if it's in text format
  if (enriched.flightTime && /[a-z]/i.test(enriched.flightTime)) {
    const parsed = parseFlightDuration(enriched.flightTime);
    if (parsed) {
      enriched.flightTime = parsed;
    }
  }
  
  // 4. Calculate flightTime from departure/arrival if missing
  if (!enriched.flightTime && enriched.departureTime && enriched.arrivalTime) {
    const calculated = calculateFlightDuration(enriched.departureTime, enriched.arrivalTime);
    if (calculated) {
      enriched.flightTime = calculated;
    }
  }
  
  // 5. Propagate bookingReference across flight legs if missing
  if (!enriched.bookingReference && allFlights.length > 0) {
    // Find first flight with a booking reference
    const flightWithRef = allFlights.find(f => f.bookingReference);
    if (flightWithRef) {
      enriched.bookingReference = flightWithRef.bookingReference;
    }
  }
  
  // 6. Propagate travelClass across flight legs if missing (same booking = same class)
  if (!enriched.travelClass && allFlights.length > 0) {
    const flightWithClass = allFlights.find(f => f.travelClass);
    if (flightWithClass) {
      enriched.travelClass = flightWithClass.travelClass;
    }
  }
  
  // 7. Propagate fullName (passenger name) across flight legs
  if (!enriched.fullName && allFlights.length > 0) {
    const flightWithName = allFlights.find(f => f.fullName);
    if (flightWithName) {
      enriched.fullName = flightWithName.fullName;
    }
  }
  
  // 8. Propagate ticketNumber across flight legs
  if (!enriched.ticketNumber && allFlights.length > 0) {
    const flightWithTicket = allFlights.find(f => f.ticketNumber);
    if (flightWithTicket) {
      enriched.ticketNumber = flightWithTicket.ticketNumber;
    }
  }
  
  return enriched;
}

// =============================================================================
// Deal Inference (Rule Engine)
// =============================================================================

/**
 * Infer deal type from payment terms or fee structure
 */
function inferDealType(fee: string, paymentTerms: string, notes: string): string | undefined {
  const combined = `${fee} ${paymentTerms} ${notes}`.toLowerCase();
  
  // Guarantee pattern
  if (combined.match(/guarantee|guaranteed|minimum\s+guarantee/)) {
    return 'Guarantee';
  }
  
  // Flat fee pattern
  if (combined.match(/flat\s+fee|fixed\s+fee|lump\s+sum/)) {
    return 'Flat fee';
  }
  
  // Percentage/door deal pattern
  if (combined.match(/percentage|%|door\s+deal|revenue\s+share|split/)) {
    return 'Percentage';
  }
  
  // Versus deal (greater of guarantee or percentage)
  if (combined.match(/versus|vs\.?|whichever\s+is\s+(?:greater|higher)|greater\s+of/)) {
    return 'Versus deal';
  }
  
  return undefined;
}

/**
 * Parse payment terms for structured information
 */
function enrichPaymentTerms(paymentTerms: string): string {
  if (!paymentTerms) return '';
  
  // Already structured - don't modify
  if (paymentTerms.length < 200) return paymentTerms;
  
  // Extract key phrases
  const terms: string[] = [];
  
  if (/(\d+)%\s*(?:deposit|advance|upfront)/i.test(paymentTerms)) {
    const match = paymentTerms.match(/(\d+)%\s*(?:deposit|advance|upfront)/i);
    if (match) terms.push(`${match[1]}% deposit`);
  }
  
  if (/(\d+)%\s*(?:on|upon|at)\s*(?:completion|settlement|final)/i.test(paymentTerms)) {
    const match = paymentTerms.match(/(\d+)%\s*(?:on|upon|at)\s*(?:completion|settlement|final)/i);
    if (match) terms.push(`${match[1]}% on completion`);
  }
  
  if (terms.length > 0) {
    return terms.join(', ');
  }
  
  return paymentTerms;
}

// =============================================================================
// Main Enrichment Function
// =============================================================================

/**
 * Enrich ImportData with derived fields using deterministic logic
 */
export function enrichImportData(data: ImportData): ImportData {
  const enriched = { ...data };
  
  // ===================================================================
  // FLIGHT ENRICHMENT
  // ===================================================================
  
  if (enriched.flights && enriched.flights.length > 0) {
    enriched.flights = enriched.flights.map(flight => 
      enrichFlight(flight, enriched.flights || [])
    );
  }
  
  // ===================================================================
  // DEAL ENRICHMENT
  // ===================================================================
  
  if (enriched.deal) {
    // Infer deal type if missing
    if (!enriched.deal.dealType) {
      const inferred = inferDealType(
        enriched.deal.fee || '',
        enriched.deal.paymentTerms || '',
        enriched.deal.notes || ''
      );
      if (inferred) {
        enriched.deal.dealType = inferred;
      }
    }
    
    // Structure payment terms if verbose
    if (enriched.deal.paymentTerms) {
      enriched.deal.paymentTerms = enrichPaymentTerms(enriched.deal.paymentTerms);
    }
  }
  
  // ===================================================================
  // GENERAL INFO ENRICHMENT
  // ===================================================================
  
  // Extract city from venue name if missing (e.g., "Sohho Dubai" → Dubai)
  if (!enriched.general?.city && enriched.general?.venue) {
    const venueWords = enriched.general.venue.split(/\s+/);
    const lastWord = venueWords[venueWords.length - 1];
    
    // Check if last word is a known city
    const knownCities = new Set(Object.values(IATA_TO_CITY));
    if (knownCities.has(lastWord)) {
      enriched.general = {
        ...enriched.general,
        city: lastWord,
      };
    }
  }
  
  return enriched;
}

/**
 * Get enrichment statistics for logging
 */
export function getEnrichmentStats(
  before: ImportData,
  after: ImportData
): {
  flightFieldsAdded: number;
  dealFieldsAdded: number;
  generalFieldsAdded: number;
  totalFieldsAdded: number;
} {
  let flightFieldsAdded = 0;
  let dealFieldsAdded = 0;
  let generalFieldsAdded = 0;
  
  // Count flight fields
  if (before.flights && after.flights) {
    for (let i = 0; i < Math.min(before.flights.length, after.flights.length); i++) {
      const beforeFlight = before.flights[i];
      const afterFlight = after.flights[i];
      
      const flightFields: (keyof ImportedFlight)[] = [
        'fromCity', 'toCity', 'flightTime', 'bookingReference',
        'travelClass', 'fullName', 'ticketNumber',
      ];
      
      for (const field of flightFields) {
        if (!beforeFlight[field] && afterFlight[field]) {
          flightFieldsAdded++;
        }
      }
    }
  }
  
  // Count deal fields
  if (before.deal && after.deal) {
    if (!before.deal.dealType && after.deal.dealType) dealFieldsAdded++;
    if (before.deal.paymentTerms !== after.deal.paymentTerms) dealFieldsAdded++;
  }
  
  // Count general fields
  if (before.general && after.general) {
    if (!before.general.city && after.general.city) generalFieldsAdded++;
  }
  
  return {
    flightFieldsAdded,
    dealFieldsAdded,
    generalFieldsAdded,
    totalFieldsAdded: flightFieldsAdded + dealFieldsAdded + generalFieldsAdded,
  };
}
