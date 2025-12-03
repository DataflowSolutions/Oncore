// Shared types for import confirmation page

export interface ImportedGeneral {
  artist: string;
  eventName: string;
  venue: string;
  date: string;
  setTime: string;
  city: string;
  country: string;
}

export interface ImportedDeal {
  fee: string;
  paymentTerms: string;
  dealType: string;
  currency: string;
  notes: string;
}

export interface ImportedHotel {
  id?: string;
  name: string;
  address: string;
  city: string;
  country: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  bookingReference: string;
  phone: string;
  email: string;
  notes: string;
}

export interface ImportedFood {
  id?: string;
  name: string;
  address: string;
  city: string;
  country: string;
  bookingReference: string;
  phone: string;
  email: string;
  notes: string;
  // Extended fields for full persistence
  serviceDate?: string;
  serviceTime?: string;
  guestCount?: number;
}

export interface ImportedFlight {
  id?: string;
  // Flight Keys (extracted from documents)
  flightNumber: string;          // PRIMARY KEY: "TK67", "LH1234"
  date?: string;                  // Flight date (ISO, required for API enrichment)
  fullName?: string;              // Passenger name
  ticketNumber?: string;
  bookingReference?: string;
  seat?: string;
  travelClass?: string;
  // API-Enriched Fields (populated in Stage F3, not extracted)
  airline?: string;               // Fetched from flight APIs
  fromAirport?: string;           // IATA code (IST, DXB, etc.)
  fromCity?: string;
  toAirport?: string;
  toCity?: string;
  departureTime?: string;         // ISO datetime
  arrivalTime?: string;           // ISO datetime
  flightTime?: string;            // Duration string
  aircraft?: string;
  // Extended fields for full persistence
  direction?: "arrival" | "departure";
  notes?: string;
}

export interface ImportedActivity {
  id?: string;
  name: string;
  location: string;
  startTime: string;
  endTime: string;
  notes: string;
  // For transfers with destination
  hasDestination?: boolean;
  destinationName?: string;
  destinationLocation?: string;
}

export interface ImportedDocument {
  id?: string;
  fileName: string;
  fileSize: number;
  category: DocumentCategory;
  file?: File;
}

export type DocumentCategory = 
  | "contract"
  | "rider"
  | "visa"
  | "boarding_pass"
  | "other";

export interface ImportedContact {
  id?: string;
  name: string;
  phone: string;
  email: string;
  role: string;
}

export interface ImportedTechnical {
  equipment: string;
  backline: string;
  stageSetup: string;
  lightingRequirements: string;
  soundcheck: string;
  other: string;
}

export interface ImportWarning {
  code: string;
  message: string;
  sources?: string[];
}

export interface ImportData {
  general: ImportedGeneral;
  deal: ImportedDeal;
  hotels: ImportedHotel[];
  food: ImportedFood[];
  flights: ImportedFlight[];
  activities: ImportedActivity[];
  documents: ImportedDocument[];
  contacts: ImportedContact[];
  technical: ImportedTechnical;
  warnings?: ImportWarning[];
}

// Section navigation helpers
export type ImportSection =
  | "general"
  | "deal"
  | "hotels"
  | "food"
  | "flights"
  | "activities"
  | "contacts"
  | "technical"
  | "documents";

// Backward compatibility alias for navigation helpers
export type ImportSectionKey = ImportSection;

export const IMPORT_SECTIONS: { key: ImportSectionKey; label: string }[] = [
  { key: "general", label: "General" },
  { key: "deal", label: "Deal" },
  { key: "hotels", label: "Hotel" },
  { key: "food", label: "Food" },
  { key: "flights", label: "Flights" },
  { key: "activities", label: "Activities & Transfers" },
  { key: "documents", label: "Documents" },
  { key: "contacts", label: "Contacts" },
  { key: "technical", label: "Technical" },
];

// Document category options
export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "contract", label: "Contract" },
  { value: "rider", label: "Rider" },
  { value: "visa", label: "Visa" },
  { value: "boarding_pass", label: "Boarding Pass" },
  { value: "other", label: "Other" },
];

// Empty/default data creators
export function createEmptyGeneral(): ImportedGeneral {
  return {
    artist: "",
    eventName: "",
    venue: "",
    date: "",
    setTime: "",
    city: "",
    country: "",
  };
}

export function createEmptyDeal(): ImportedDeal {
  return {
    fee: "",
    paymentTerms: "",
    dealType: "",
    currency: "",
    notes: "",
  };
}

export function createEmptyHotel(): ImportedHotel {
  return {
    id: crypto.randomUUID(),
    name: "",
    address: "",
    city: "",
    country: "",
    checkInDate: "",
    checkInTime: "",
    checkOutDate: "",
    checkOutTime: "",
    bookingReference: "",
    phone: "",
    email: "",
    notes: "",
  };
}

export function createEmptyFood(): ImportedFood {
  return {
    id: crypto.randomUUID(),
    name: "",
    address: "",
    city: "",
    country: "",
    bookingReference: "",
    phone: "",
    email: "",
    notes: "",
  };
}

export function createEmptyFlight(): ImportedFlight {
  return {
    id: crypto.randomUUID(),
    flightNumber: "",
    // All other fields are optional and will be filled by extraction or enrichment
  };
}

export function createEmptyActivity(): ImportedActivity {
  return {
    id: crypto.randomUUID(),
    name: "",
    location: "",
    startTime: "",
    endTime: "",
    notes: "",
    hasDestination: false,
    destinationName: "",
    destinationLocation: "",
  };
}

export function createEmptyDocument(): ImportedDocument {
  return {
    id: crypto.randomUUID(),
    fileName: "",
    fileSize: 0,
    category: "other",
  };
}

export function createEmptyContact(): ImportedContact {
  return {
    id: crypto.randomUUID(),
    name: "",
    phone: "",
    email: "",
    role: "",
  };
}

export function createEmptyTechnical(): ImportedTechnical {
  return {
    equipment: "",
    backline: "",
    stageSetup: "",
    lightingRequirements: "",
    soundcheck: "",
    other: "",
  };
}

export function createEmptyImportData(): ImportData {
  return {
    general: createEmptyGeneral(),
    deal: createEmptyDeal(),
    hotels: [],
    food: [],
    flights: [],
    activities: [],
    documents: [],
    contacts: [],
    technical: createEmptyTechnical(),
    warnings: [],
  };
}

/**
 * Sanitize imported data to ensure all fields have defined values.
 * This prevents React controlled/uncontrolled input warnings when
 * fields are undefined instead of empty strings.
 */
export function sanitizeImportData(data: Partial<ImportData>): ImportData {
  const empty = createEmptyImportData();
  
  // Helper to merge with defaults, ensuring no undefined values
  const mergeWithDefaults = <T extends object>(item: Partial<T>, defaults: T): T => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      if (item[key] !== undefined && item[key] !== null) {
        result[key] = item[key] as T[keyof T];
      }
    }
    return result;
  };
  
  return {
    general: mergeWithDefaults(data.general || {}, empty.general),
    deal: mergeWithDefaults(data.deal || {}, empty.deal),
    technical: mergeWithDefaults(data.technical || {}, empty.technical),
    // For arrays, ensure each item has all required fields
    hotels: (data.hotels || []).map(h => mergeWithDefaults(h, createEmptyHotel())),
    food: (data.food || []).map(f => mergeWithDefaults(f, createEmptyFood())),
    flights: (data.flights || []).map(f => mergeWithDefaults(f, createEmptyFlight())),
    activities: (data.activities || []).map(a => mergeWithDefaults(a, createEmptyActivity())),
    documents: (data.documents || []).map(d => mergeWithDefaults(d, createEmptyDocument())),
    contacts: (data.contacts || []).map(c => mergeWithDefaults(c, createEmptyContact())),
    warnings: data.warnings && Array.isArray(data.warnings) ? data.warnings : [],
  };
}
