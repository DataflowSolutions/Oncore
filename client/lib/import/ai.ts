import { logger } from "@/lib/logger";
import {
  ImportData,
  ImportSection,
  ImportedActivity,
  ImportedContact,
  ImportedDeal,
  ImportedFood,
  ImportedFlight,
  ImportedGeneral,
  ImportedHotel,
  ImportedTechnical,
  ImportedDocument,
} from "@/components/import/types";

export interface SectionChunkRequest {
  section: ImportSection;
  sourceId: string;
  chunkIndex: number;
  chunkText: string;
  existingPartial?: Partial<ImportData>;
}

export interface SectionChunkResult {
  section: ImportSection;
  sourceId: string;
  chunkIndex: number;
  partialData: Partial<ImportData>;
  confidenceByField?: Record<string, ConfidenceEntry>;
}

interface LLMResponse {
  content: string | null;
  error?: string;
}

export type ConfidenceEntry =
  | number
  | {
      score: number;
      reason?: string;
    };

/**
 * Entry point for section-wise extraction of a single chunk.
 * Builds prompts, calls the LLM (or a safe fallback), parses JSON, maps into ImportData shape,
 * and emits a confidence map keyed by field paths (e.g., "hotels[0].name").
 */
export async function extractSectionFromChunk(
  req: SectionChunkRequest
): Promise<SectionChunkResult> {
  logger.info("LLM extraction begin", {
    section: req.section,
    sourceId: req.sourceId,
    chunkIndex: req.chunkIndex,
  });
  const systemPrompt = buildSectionSystemPrompt(req.section);
  const userPrompt = buildSectionUserPrompt(req.section, req.chunkText, req.existingPartial);

  const llmResponse = await callLLM({
    systemPrompt,
    userPrompt,
  });

  const parsed = parseLLMJson(llmResponse.content ?? "");
  const mapped = mapSectionJsonToPartial(req.section, parsed.parsed);
  const confidenceFromModel = parsed.confidence ?? {};
  const derivedConfidence = deriveConfidenceFromPartial(req.section, mapped, confidenceFromModel);
  const confidenceByField = mergeConfidenceMaps(confidenceFromModel, derivedConfidence);

  if (llmResponse.error || parsed.error) {
    logger.warn("LLM extraction warning", {
      section: req.section,
      sourceId: req.sourceId,
      chunkIndex: req.chunkIndex,
      llmError: llmResponse.error,
      parseError: parsed.error,
    });
  }

  // Summarize mapped keys for quick diagnostics
  const summary: Record<string, unknown> = {};
  const sectionKey: string = req.section;
  const partial = (mapped as any)[sectionKey];
  if (Array.isArray(partial)) {
    summary.items = partial.length;
  } else if (partial && typeof partial === "object") {
    summary.fields = Object.values(partial).filter((v) => !!v && String(v).trim().length > 0).length;
  }
  logger.info("LLM extraction end", {
    section: req.section,
    sourceId: req.sourceId,
    chunkIndex: req.chunkIndex,
    ...summary,
  });

  return {
    section: req.section,
    sourceId: req.sourceId,
    chunkIndex: req.chunkIndex,
    partialData: mapped,
    confidenceByField,
  };
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------
function buildSectionSystemPrompt(section: ImportSection): string {
  const sectionTitle = sectionLabel(section);
  return [
    "You are an assistant that extracts structured data for event advancing.",
    `Focus ONLY on the ${sectionTitle} section and ignore all unrelated details.`,
    "Output STRICT JSON that matches the specified schema. Do not include prose.",
    "Prefer null/empty for unknown fields; do not hallucinate.",
  ].join(" ");
}

function buildSectionUserPrompt(
  section: ImportSection,
  chunkText: string,
  existingPartial?: Partial<ImportData>
): string {
  const schemaHint = sectionSchemaHint(section);
  const existingSummary = existingPartial
    ? `Existing extracted data (for context, avoid duplicates): ${JSON.stringify(existingPartial)}`
    : "No existing extracted data.";

  return [
    "Extract data for the specified section from the following text chunk.",
    schemaHint,
    "Return JSON ONLY. Include a _confidence object mapping field paths to scores (0-1) and optional reasons.",
    'Example: { "<section>": {...}, "_confidence": { "hotels[0].name": 0.95, "hotels[0].city": { "score": 0.8, "reason": "city referenced twice" } } }',
    existingSummary,
    "Return JSON ONLY. Example shape:",
    JSON.stringify(exampleShapeForSection(section)),
    "Chunk text:",
    chunkText,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// LLM call + parsing helpers
// ---------------------------------------------------------------------------
interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
}

async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Safe deterministic fallback for local/dev environments without keys.
    return { content: "{}", error: "OPENAI_API_KEY not set; returning empty result" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.userPrompt },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      return { content: "{}", error: `LLM HTTP error: ${response.status} ${message}` };
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM error";
    return { content: "{}", error: message };
  }
}

interface ParsedJsonResult {
  parsed: Record<string, unknown> | null;
  confidence?: Record<string, ConfidenceEntry>;
  error?: string;
}

function parseLLMJson(raw: string): ParsedJsonResult {
  if (!raw) return { parsed: {}, error: "Empty response" };

  const tryParse = (text: string) => {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch (e) {
      return null;
    }
  };

  let parsed = tryParse(raw);
  let parseError: string | undefined;

  if (!parsed) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = tryParse(match[0]);
    }
  }

  if (!parsed) {
    parseError = "Failed to parse JSON response";
    parsed = {};
  }

  const confidence =
    (parsed?._confidence as Record<string, ConfidenceEntry> | undefined) ||
    (parsed?.confidence as Record<string, ConfidenceEntry> | undefined) ||
    (parsed?.confidence_by_field as Record<string, ConfidenceEntry> | undefined);

  return { parsed, confidence, error: parseError };
}

// ---------------------------------------------------------------------------
// Mapping from model JSON to ImportData partials
// ---------------------------------------------------------------------------
function mapSectionJsonToPartial(
  section: ImportSection,
  payload: Record<string, unknown> | null
): Partial<ImportData> {
  const source = payload || {};

  switch (section) {
    case "general":
      return { general: mapGeneral(source.general || source) };
    case "deal":
      return { deal: mapDeal(source.deal || source) };
    case "technical":
      return { technical: mapTechnical(source.technical || source) };
    case "hotels":
      return { hotels: mapHotels(source.hotels) };
    case "food":
      return { food: mapFood(source.food) };
    case "flights":
      return { flights: mapFlights(source.flights) };
    case "activities":
      return { activities: mapActivities(source.activities) };
    case "contacts":
      return { contacts: mapContacts(source.contacts) };
    case "documents":
      return { documents: mapDocuments(source.documents) };
  }
}

function mapGeneral(input: unknown): ImportedGeneral {
  const i = (input as Record<string, unknown>) || {};
  return {
    artist: toString(i.artist),
    eventName: toString(i.event_name || i.eventName),
    venue: toString(i.venue),
    date: toString(i.date),
    setTime: toString(i.set_time || i.setTime),
    city: toString(i.city),
    country: toString(i.country),
  };
}

function mapDeal(input: unknown): ImportedDeal {
  const i = (input as Record<string, unknown>) || {};
  return {
    fee: toString(i.fee),
    paymentTerms: toString(i.payment_terms || i.paymentTerms),
    dealType: toString(i.deal_type || i.dealType),
    currency: toString(i.currency),
    notes: toString(i.notes),
  };
}

function mapTechnical(input: unknown): ImportedTechnical {
  const i = (input as Record<string, unknown>) || {};
  return {
    equipment: toString(i.equipment),
    backline: toString(i.backline),
    stageSetup: toString(i.stage_setup || i.stageSetup),
    lightingRequirements: toString(i.lighting_requirements || i.lightingRequirements),
    soundcheck: toString(i.soundcheck),
    other: toString(i.other),
  };
}

function mapHotels(input: unknown): ImportedHotel[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const i = (item as Record<string, unknown>) || {};
    return {
      id: toOptionalString(i.id),
      name: toString(i.name),
      address: toString(i.address),
      city: toString(i.city),
      country: toString(i.country),
      checkInDate: toString(i.check_in_date || i.checkInDate),
      checkInTime: toString(i.check_in_time || i.checkInTime),
      checkOutDate: toString(i.check_out_date || i.checkOutDate),
      checkOutTime: toString(i.check_out_time || i.checkOutTime),
      bookingReference: toString(i.booking_reference || i.bookingReference),
      phone: toString(i.phone),
      email: toString(i.email),
      notes: toString(i.notes),
    };
  });
}

function mapFood(input: unknown): ImportedFood[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const i = (item as Record<string, unknown>) || {};
    // Parse guest count as number
    const guestCountRaw = i.guest_count || i.guestCount || i.guests || i.pax;
    const guestCount = typeof guestCountRaw === "number" 
      ? guestCountRaw 
      : typeof guestCountRaw === "string" 
        ? parseInt(guestCountRaw, 10) || undefined
        : undefined;
    return {
      id: toOptionalString(i.id),
      name: toString(i.name || i.provider_name || i.providerName),
      address: toString(i.address),
      city: toString(i.city),
      country: toString(i.country),
      bookingReference: toString(i.booking_reference || i.bookingReference),
      phone: toString(i.phone),
      email: toString(i.email),
      notes: toString(i.notes),
      serviceDate: toString(i.service_date || i.serviceDate || i.date),
      serviceTime: toString(i.service_time || i.serviceTime || i.time),
      guestCount: guestCount,
    };
  });
}

function mapFlights(input: unknown): ImportedFlight[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const i = (item as Record<string, unknown>) || {};
    // Map direction from AI output - can be "arrival", "departure", "inbound", "outbound"
    const rawDirection = toString(i.direction).toLowerCase();
    const direction = rawDirection === "departure" || rawDirection === "outbound" 
      ? "departure" as const 
      : "arrival" as const;
    return {
      id: toOptionalString(i.id),
      airline: toString(i.airline),
      flightNumber: toString(i.flight_number || i.flightNumber),
      aircraft: toString(i.aircraft),
      fullName: toString(i.full_name || i.fullName || i.passenger_name || i.passengerName),
      bookingReference: toString(i.booking_reference || i.bookingReference || i.booking_ref || i.bookingRef),
      ticketNumber: toString(i.ticket_number || i.ticketNumber),
      fromCity: toString(i.from_city || i.fromCity),
      fromAirport: toString(i.from_airport || i.fromAirport),
      departureTime: toString(i.departure_time || i.departureTime || i.depart_at || i.departAt),
      toCity: toString(i.to_city || i.toCity),
      toAirport: toString(i.to_airport || i.toAirport),
      arrivalTime: toString(i.arrival_time || i.arrivalTime || i.arrival_at || i.arrivalAt),
      seat: toString(i.seat || i.seat_number || i.seatNumber),
      travelClass: toString(i.travel_class || i.travelClass),
      flightTime: toString(i.flight_time || i.flightTime),
      direction: rawDirection ? direction : undefined,
      notes: toString(i.notes),
    };
  });
}

function mapActivities(input: unknown): ImportedActivity[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const i = (item as Record<string, unknown>) || {};
    return {
      id: toOptionalString(i.id),
      name: toString(i.name),
      location: toString(i.location),
      startTime: toString(i.start_time || i.startTime),
      endTime: toString(i.end_time || i.endTime),
      notes: toString(i.notes),
      hasDestination: toBoolean(i.has_destination || i.hasDestination),
      destinationName: toString(i.destination_name || i.destinationName),
      destinationLocation: toString(i.destination_location || i.destinationLocation),
    };
  });
}

function mapContacts(input: unknown): ImportedContact[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const i = (item as Record<string, unknown>) || {};
    return {
      id: toOptionalString(i.id),
      name: toString(i.name),
      phone: toString(i.phone),
      email: toString(i.email),
      role: toString(i.role),
    };
  });
}

function mapDocuments(input: unknown): ImportedDocument[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const i = (item as Record<string, unknown>) || {};
    const fileSize = toNumber(i.file_size || i.fileSize);
    const category = toString(i.category);
    return {
      id: toOptionalString(i.id),
      fileName: toString(i.file_name || i.fileName),
      fileSize: Number.isFinite(fileSize) ? fileSize : 0,
      category: (category || "other") as import("@/components/import/types").DocumentCategory,
    };
  });
}

// ---------------------------------------------------------------------------
// Confidence helpers
// ---------------------------------------------------------------------------
function deriveConfidenceFromPartial(
  section: ImportSection,
  partial: Partial<ImportData>,
  existing: Record<string, ConfidenceEntry>
): Record<string, ConfidenceEntry> {
  const confidence: Record<string, ConfidenceEntry> = {};

  const addIfMissing = (path: string, value?: string | boolean | number) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && !value.trim()) return;
    if (existing[path] !== undefined) return;
    confidence[path] = 0.8;
  };

  switch (section) {
    case "general":
      if (partial.general) {
        Object.entries(partial.general).forEach(([k, v]) => addIfMissing(`general.${k}`, v as string));
      }
      break;
    case "deal":
      if (partial.deal) {
        Object.entries(partial.deal).forEach(([k, v]) => addIfMissing(`deal.${k}`, v as string));
      }
      break;
    case "technical":
      if (partial.technical) {
        Object.entries(partial.technical).forEach(([k, v]) => addIfMissing(`technical.${k}`, v as string));
      }
      break;
    case "hotels":
      (partial.hotels || []).forEach((h, idx) => {
        Object.entries(h).forEach(([k, v]) => addIfMissing(`hotels[${idx}].${k}`, v as string));
      });
      break;
    case "food":
      (partial.food || []).forEach((f, idx) => {
        Object.entries(f).forEach(([k, v]) => addIfMissing(`food[${idx}].${k}`, v as string));
      });
      break;
    case "flights":
      (partial.flights || []).forEach((f, idx) => {
        Object.entries(f).forEach(([k, v]) => addIfMissing(`flights[${idx}].${k}`, v as string));
      });
      break;
    case "activities":
      (partial.activities || []).forEach((a, idx) => {
        Object.entries(a).forEach(([k, v]) => addIfMissing(`activities[${idx}].${k}`, v as string));
      });
      break;
    case "contacts":
      (partial.contacts || []).forEach((c, idx) => {
        Object.entries(c).forEach(([k, v]) => addIfMissing(`contacts[${idx}].${k}`, v as string));
      });
      break;
    case "documents":
      (partial.documents || []).forEach((d, idx) => {
        Object.entries(d).forEach(([k, v]) => addIfMissing(`documents[${idx}].${k}`, v as string));
      });
      break;
  }

  return confidence;
}

function mergeConfidenceMaps(
  existing: Record<string, ConfidenceEntry> | undefined,
  incoming: Record<string, ConfidenceEntry> | undefined
): Record<string, ConfidenceEntry> {
  const result: Record<string, ConfidenceEntry> = { ...(existing || {}) };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    const current = result[key];
    const incomingScore = getConfidenceScore(value);
    const currentScore = getConfidenceScore(current);
    if (incomingScore === undefined) return;
    if (currentScore === undefined || incomingScore >= currentScore) {
      result[key] = value;
    }
  });
  return result;
}

export function getConfidenceScore(entry?: ConfidenceEntry): number | undefined {
  if (entry === undefined || entry === null) return undefined;
  if (typeof entry === "number") return entry;
  if (typeof entry === "object" && typeof entry.score === "number") return entry.score;
  return undefined;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function toString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value ?? "");
}

function toOptionalString(value: unknown): string | undefined {
  const str = toString(value);
  return str ? str : undefined;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "yes", "1"].includes(value.toLowerCase());
  if (typeof value === "number") return value !== 0;
  return false;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function sectionLabel(section: ImportSection): string {
  switch (section) {
    case "general":
      return "General (artist, event, venue, date, set time, city, country)";
    case "deal":
      return "Deal (fee, currency, payment terms, deal type, notes)";
    case "hotels":
      return "Hotels/lodging";
    case "food":
      return "Catering/food";
    case "flights":
      return "Flights";
    case "activities":
      return "Activities/transfers";
    case "contacts":
      return "Contacts";
    case "technical":
      return "Technical requirements";
    case "documents":
      return "Documents";
  }
}

function sectionSchemaHint(section: ImportSection): string {
  switch (section) {
    case "general":
      return "Return { \"general\": { \"artist\": string, \"eventName\": string, \"venue\": string, \"date\": string, \"setTime\": string, \"city\": string, \"country\": string }, \"_confidence\": { \"general.artist\": number } }";
    case "deal":
      return "Return { \"deal\": { \"fee\": string, \"currency\": string, \"paymentTerms\": string, \"dealType\": string, \"notes\": string }, \"_confidence\": { \"deal.fee\": number } }";
    case "technical":
      return "Return { \"technical\": { \"equipment\": string, \"backline\": string, \"stageSetup\": string, \"lightingRequirements\": string, \"soundcheck\": string, \"other\": string }, \"_confidence\": { \"technical.equipment\": number } }";
    case "hotels":
      return "Return { \"hotels\": [ { \"name\": string, \"address\": string, \"city\": string, \"country\": string, \"check_in_date\": string, \"check_in_time\": string, \"check_out_date\": string, \"check_out_time\": string, \"booking_reference\": string, \"phone\": string, \"email\": string, \"notes\": string } ], \"_confidence\": { \"hotels[0].name\": number } }";
    case "food":
      return "Return { \"food\": [ { \"name\": string, \"address\": string, \"city\": string, \"country\": string, \"booking_reference\": string, \"phone\": string, \"email\": string, \"notes\": string } ], \"_confidence\": { \"food[0].name\": number } }";
    case "flights":
      return "Return { \"flights\": [ { \"airline\": string, \"flight_number\": string, \"aircraft\": string, \"full_name\": string, \"booking_reference\": string, \"ticket_number\": string, \"from_city\": string, \"from_airport\": string, \"departure_time\": string, \"to_city\": string, \"to_airport\": string, \"arrival_time\": string, \"seat\": string, \"travel_class\": string, \"flight_time\": string } ], \"_confidence\": { \"flights[0].flight_number\": number } }";
    case "activities":
      return "Return { \"activities\": [ { \"name\": string, \"location\": string, \"start_time\": string, \"end_time\": string, \"notes\": string, \"has_destination\": boolean, \"destination_name\": string, \"destination_location\": string } ], \"_confidence\": { \"activities[0].name\": number } }";
    case "contacts":
      return "Return { \"contacts\": [ { \"name\": string, \"phone\": string, \"email\": string, \"role\": string } ], \"_confidence\": { \"contacts[0].email\": number } }";
    case "documents":
      return "Return { \"documents\": [ { \"file_name\": string, \"file_size\": number, \"category\": string } ], \"_confidence\": { \"documents[0].file_name\": number } }";
  }
}

function exampleShapeForSection(section: ImportSection): Record<string, unknown> {
  switch (section) {
    case "general":
      return { general: { artist: "", eventName: "", venue: "", date: "", setTime: "", city: "", country: "" } };
    case "deal":
      return { deal: { fee: "", currency: "", paymentTerms: "", dealType: "", notes: "" } };
    case "technical":
      return { technical: { equipment: "", backline: "", stageSetup: "", lightingRequirements: "", soundcheck: "", other: "" } };
    case "hotels":
      return { hotels: [{ name: "", address: "", city: "", country: "", check_in_date: "", check_out_date: "" }] };
    case "food":
      return { food: [{ name: "", address: "", city: "", country: "" }] };
    case "flights":
      return { flights: [{ airline: "", flight_number: "", from_city: "", to_city: "", departure_time: "", arrival_time: "" }] };
    case "activities":
      return { activities: [{ name: "", location: "", start_time: "", end_time: "" }] };
    case "contacts":
      return { contacts: [{ name: "", phone: "", email: "", role: "" }] };
    case "documents":
      return { documents: [{ file_name: "", file_size: 0, category: "other" }] };
  }
}
