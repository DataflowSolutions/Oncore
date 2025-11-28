import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/database.types";
import crypto from "crypto";

export const runtime = "nodejs";

type ShowRow = Database["public"]["Tables"]["shows"]["Row"];

type StructuredField = {
  value: string | null;
  confidence: number;
  snippet?: string | null;
};

type StructuredGig = {
  core: {
    date: StructuredField;
    city: StructuredField;
    venue: StructuredField;
    event: StructuredField;
    promoter: StructuredField;
    artist: StructuredField;
  };
  deal: {
    fee: StructuredField;
    dealType: StructuredField;
    currency: StructuredField;
    paymentTerms: StructuredField;
  };
  hospitalityLogistics: {
    hotel: StructuredField;
    transport: StructuredField;
    catering: StructuredField;
    soundcheck: StructuredField;
    setTime: StructuredField;
  };
  tech: {
    equipment: StructuredField;
    backline: StructuredField;
    stage: StructuredField;
    light: StructuredField;
    sound: StructuredField;
  };
  travel: {
    flights: StructuredField;
    times: StructuredField;
    airportCodes: StructuredField;
  };
};

type DuplicateCandidate = {
  id: string;
  title: string | null;
  date: string | null;
  venue: string | null;
  city: string | null;
  score: number;
};

type GigCandidate = {
  candidateId: string;
  title: string | null;
  date: string | null;
  city: string | null;
  venueName: string | null;
  setTime: string | null;
  notes: string | null;
  structured: StructuredGig;
  duplicates: DuplicateCandidate[];
  confidenceMap: Record<string, number>;
};

type ImportJobRecord = {
  id: string;
  org_id: string;
  status: "processing" | "needs_review" | "completed";
  raw_text: string | null;
  normalized_text: string | null;
  parsed_json: unknown | null;
  confidence_map: Record<string, number> | null;
  duplicate_matches: DuplicateCandidate[] | null;
  source_file_metadata: Record<string, unknown> | null;
  extracted_artist?: string | null;
  extraction_mode?: "rule_based" | "ai_assisted";
  errors?: string[] | null;
  previous_attempts?: unknown[] | null;
  created_at?: string;
  updated_at?: string;
};

type ImportJobResponse = {
  id: string;
  status: ImportJobRecord["status"];
  rawText: string;
  normalizedText: string;
  candidates: GigCandidate[];
  warnings?: string[];
  source: "file" | "text";
  metadata?: {
    name: string;
    type: string;
    size: number;
  };
};

const SUPPORTED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xlsx",
  "xls",
  "csv",
  "txt",
]);

const LOW_CONFIDENCE = 0.35;
const MEDIUM_CONFIDENCE = 0.6;
const HIGH_CONFIDENCE = 0.85;
const USE_AI_EXTRACTION = process.env.USE_AI_EXTRACTION === "true";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return handleCommit(request);
  }

  return handleAnalyze(request);
}

async function handleAnalyze(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orgId = (formData.get("orgId") as string | null)?.trim();
    const pastedText = (formData.get("text") as string | null)?.trim();

    if (!orgId) {
      return NextResponse.json(
        { error: "No organization ID provided" },
        { status: 400 },
      );
    }

    if (!file && !pastedText) {
      return NextResponse.json(
        { error: "Provide a file or pasted text to import" },
        { status: 400 },
      );
    }

    let warnings: string[] = [];
    let rawText = "";
    let source: ImportJobResponse["source"] = "text";
    let metadata: ImportJobResponse["metadata"] | undefined;

    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "File too large. Max 20MB supported for import." },
          { status: 400 },
        );
      }

      const extension = getExtension(file.name);
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        return NextResponse.json(
          {
            error:
              "Unsupported file type. Allowed: .pdf, .doc, .docx, .xlsx, .xls, .csv, .txt",
          },
          { status: 400 },
        );
      }

      rawText = await extractTextFromFile(file, extension);
      source = "file";
      metadata = {
        name: file.name,
        type: file.type,
        size: file.size,
      };
    } else if (pastedText) {
      rawText = normalizeText(pastedText);
      source = "text";
    }

    if (!rawText) {
      return NextResponse.json(
        { error: "Unable to extract any text from the provided data" },
        { status: 400 },
      );
    }

    const supabase = await getSupabaseServer();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasOrgAccess(supabase, orgId, userData.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized - Not a member of this organization" },
        { status: 403 },
      );
    }

    const normalizedText = normalizeText(rawText);
    const initialJobId = await createImportJob(supabase, {
      orgId,
      status: "processing",
      rawText,
      normalizedText,
    parsedJson: { progress: "Extracting" },
      confidenceMap: {},
      duplicates: [],
      metadata,
      errors: [],
      extractionMode: USE_AI_EXTRACTION ? "ai_assisted" : "rule_based",
    });

    const extractionResult = await buildCandidatesFromInput(
      rawText,
      normalizedText,
      file,
      source,
    );

    const candidatesWithDuplicates: GigCandidate[] = [];
    for (const candidate of extractionResult.candidates) {
      const duplicates = await findDuplicates(supabase, orgId, candidate.structured);
      candidatesWithDuplicates.push({ ...candidate, duplicates });
    }

    const confidenceMap = buildConfidenceMap(candidatesWithDuplicates);

    if (rawText.length > 20000) {
      warnings.push("Large document truncated to first 20k characters for preview.");
      rawText = rawText.slice(0, 20000);
    }

    const jobRecord = await updateImportJob(supabase, initialJobId, {
      status: "needs_review",
      parsedJson: { candidates: candidatesWithDuplicates, source },
      confidenceMap,
      duplicates: candidatesWithDuplicates.flatMap((c) => c.duplicates),
      extractedArtist: candidatesWithDuplicates[0]?.structured.core.artist.value ?? null,
      errors: extractionResult.errors,
    });

    const responseJob: ImportJobResponse = {
      id: initialJobId,
      status: jobRecord?.status ?? "needs_review",
      rawText,
      normalizedText,
      candidates: candidatesWithDuplicates,
      warnings: warnings.length ? warnings : undefined,
      source,
      metadata,
    };

    return NextResponse.json({ success: true, job: responseJob });
  } catch (error) {
    logger.error("Import analyze error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process import",
      },
      { status: 500 },
    );
  }
}

async function handleCommit(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgId,
      jobId,
      payload,
    }: {
      orgId?: string;
      jobId?: string;
      payload?: {
        title?: string;
        date?: string;
        city?: string;
        venueName?: string;
        setTime?: string;
        notes?: string;
        candidateId?: string;
        artistName?: string;
      };
    } = body || {};

    if (!orgId || !payload?.date || !payload?.title || !jobId) {
      return NextResponse.json(
        { error: "Missing required fields to finalize import" },
        { status: 400 },
      );
    }

    const supabase = await getSupabaseServer();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasOrgAccess(supabase, orgId, userData.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized - Not a member of this organization" },
        { status: 403 },
      );
    }

    const job = await fetchImportJob(supabase, jobId, orgId);
    if (!job) {
      return NextResponse.json({ error: "Import job not found" }, { status: 404 });
    }
    const parsedCandidates = (job.parsed_json as { candidates?: GigCandidate[] } | null)?.candidates ?? [];
    const candidate = parsedCandidates.find((c) => c.candidateId === payload.candidateId);

    // Try to resolve an existing venue match to avoid accidental duplicates.
    const venueLookup = payload.venueName?.trim();
    let venueId: string | null = null;
    if (venueLookup) {
      const { data: venueMatch, error: venueError } = await supabase
        .from("venues")
        .select("id,name,city")
        .eq("org_id", orgId)
        .ilike("name", `%${venueLookup}%`)
        .limit(1);

      if (!venueError && venueMatch && venueMatch.length > 0) {
        venueId = venueMatch[0].id;
      }
    }

    const formattedSetTime = formatSetTime(payload.date, payload.setTime);

    // Use the same RPC as createShow to respect RLS and venue creation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("app_create_show", {
      p_org_id: orgId,
      p_title: payload.title,
      p_date: payload.date,
      p_venue_id: venueId,
      p_venue_name: venueId ? null : payload.venueName ?? null,
      p_venue_city: venueId ? null : payload.city ?? null,
      p_venue_address: null,
      p_set_time: formattedSetTime,
      p_notes: payload.notes ?? null,
    });

    if (error) {
      logger.error("Error creating show from import", error);
      return NextResponse.json(
        { error: error.message || "Failed to create show" },
        { status: 500 },
      );
    }

    const showId = Array.isArray(data) ? data[0]?.id ?? null : data?.id ?? null;

    // Artist attachment
    let requiresArtistAssignment = false;
    if (showId && (payload.artistName || candidate?.structured.core.artist.value)) {
      const lookupName = (payload.artistName || candidate?.structured.core.artist.value || "").trim();
      if (lookupName) {
        const artistId = await findOrMatchArtist(supabase, orgId, lookupName);
        if (artistId) {
          const { error: assignError } = await supabase
            .from("show_assignments")
            .insert({
              show_id: showId,
              person_id: artistId,
              duty: "Performer",
            });
          if (assignError) {
            logger.warn("Failed to attach artist", assignError);
            requiresArtistAssignment = true;
          }
        } else {
          requiresArtistAssignment = true;
        }
      }
    }

    await updateImportJob(supabase, jobId, {
      status: "completed",
      parsedJson: appendShowId(job.parsed_json, payload.candidateId, showId, requiresArtistAssignment),
    });

    return NextResponse.json({
      success: true,
      status: "completed",
      showId,
      requires_artist_assignment: requiresArtistAssignment,
    });
  } catch (error) {
    logger.error("Import commit error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to finalize import",
      },
      { status: 500 },
    );
  }
}

async function extractTextFromFile(file: File, extension: string): Promise<string> {
  try {
    if (extension === "pdf") {
      // pdf-parse is CommonJS, so use dynamic import.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParseModule: any = await import("pdf-parse");
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const buffer = await file.arrayBuffer();
      const result = await pdfParse(Buffer.from(buffer));
      const parsedText = normalizeText(result.text || "");
      if (parsedText) return parsedText;
    }

    if (["doc", "docx", "xlsx", "xls"].includes(extension)) {
      const buffer = await file.arrayBuffer();
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const cleaned = normalizeText(decoded);
      if (cleaned.length > 10) {
        return cleaned;
      }
    }

    const text = await file.text();
    const normalized = normalizeText(text);
    if (normalized.length > 10) {
      return normalized;
    }

    // OCR fallback for image-heavy PDFs or unreadable docs
    const ocrText = await performOCR(file);
    return normalizeText(ocrText);
  } catch (error) {
    logger.warn("Primary text extraction failed, falling back to raw text", error);
    const fallback = await file.text();
    return normalizeText(fallback);
  }
}

function extractStructuredGig(rawText: string): StructuredGig {
  const lowered = rawText.toLowerCase();

  const date = pickDate(rawText);
  const venue = pickField(rawText, /(venue|plats|location)\s*[:\-]\s*([^\n]+)/i);
  const city =
    pickField(rawText, /(city|stad)\s*[:\-]\s*([^\n]+)/i) ??
    pickCityFromVenueLine(rawText);
  const event =
    pickField(rawText, /(event|tour|gig|show)\s*[:\-]\s*([^\n]+)/i) ??
    guessTitle(rawText);
  const artist = pickField(rawText, /(artist|band|performer|act)\s*[:\-]\s*([^\n]+)/i);
  const promoter = pickField(rawText, /(promoter|arrangor|booker)\s*[:\-]\s*([^\n]+)/i);

  const fee = pickFee(rawText);
  const dealType = pickDealType(lowered);
  const currency = pickCurrency(fee?.value ?? null);
  const paymentTerms = pickField(
    rawText,
    /(payment terms|payable|due|nett?|betalning)\s*[:\-]\s*([^\n]+)/i,
  );

  const soundcheck = pickTimeNear(rawText, /(soundcheck|line ?check)/i);
  const setTime =
    pickTimeNear(rawText, /(set time|show time|stage time|performance)/i) ??
    pickTimeNear(rawText, /(onstage|stage)/i);

  const hotel = pickKeyword(rawText, /(hotel|lodging|overnight|accommodation)/i);
  const transport = pickKeyword(rawText, /(transport|ground|van|bus|driver)/i);
  const catering = pickKeyword(rawText, /(catering|meal|food|buyout|per diem)/i);

  const equipment = pickKeyword(rawText, /(equipment|gear|console|mix|pa|monitor)/i);
  const backline = pickKeyword(rawText, /(backline|amps|drum kit|hardware)/i);
  const stage = pickKeyword(rawText, /(stage plot|stageplot|stage)/i);
  const light = pickKeyword(rawText, /(light|lighting|lx)/i);
  const sound = pickKeyword(rawText, /(sound|audio|foh|monitor)/i);

  const flights = pickKeyword(rawText, /(flight|flyg|itinerary|ticket)/i);
  const times = pickTimeNear(rawText, /(departure|arrival)/i);
  const airportCodes = pickAirportCodes(rawText);

  return {
    core: {
      date: { value: date, confidence: date ? HIGH_CONFIDENCE : LOW_CONFIDENCE },
      city: { value: city, confidence: city ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE },
      venue: { value: venue, confidence: venue ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE },
      event: { value: event, confidence: event ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE },
      promoter: {
        value: promoter,
        confidence: promoter ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE,
      },
      artist: {
        value: artist,
        confidence: artist ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE,
      },
    },
    deal: {
      fee: { value: fee ?? null, confidence: fee ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE },
      dealType: {
        value: dealType,
        confidence: dealType ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE,
      },
      currency: {
        value: currency,
        confidence: currency ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE,
      },
      paymentTerms: {
        value: paymentTerms,
        confidence: paymentTerms ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE,
      },
    },
    hospitalityLogistics: {
      hotel: { value: hotel, confidence: hotel ? LOW_CONFIDENCE : LOW_CONFIDENCE },
      transport: {
        value: transport,
        confidence: transport ? LOW_CONFIDENCE : LOW_CONFIDENCE,
      },
      catering: {
        value: catering,
        confidence: catering ? LOW_CONFIDENCE : LOW_CONFIDENCE,
      },
      soundcheck: {
        value: soundcheck,
        confidence: soundcheck ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE,
      },
      setTime: {
        value: setTime,
        confidence: setTime ? MEDIUM_CONFIDENCE : LOW_CONFIDENCE,
      },
    },
    tech: {
      equipment: {
        value: equipment,
        confidence: equipment ? LOW_CONFIDENCE : LOW_CONFIDENCE,
      },
      backline: {
        value: backline,
        confidence: backline ? LOW_CONFIDENCE : LOW_CONFIDENCE,
      },
      stage: { value: stage, confidence: stage ? LOW_CONFIDENCE : LOW_CONFIDENCE },
      light: { value: light, confidence: light ? LOW_CONFIDENCE : LOW_CONFIDENCE },
      sound: { value: sound, confidence: sound ? LOW_CONFIDENCE : LOW_CONFIDENCE },
    },
    travel: {
      flights: {
        value: flights,
        confidence: flights ? LOW_CONFIDENCE : LOW_CONFIDENCE,
      },
      times: { value: times, confidence: times ? LOW_CONFIDENCE : LOW_CONFIDENCE },
      airportCodes: {
        value: airportCodes,
        confidence: airportCodes ? LOW_CONFIDENCE : LOW_CONFIDENCE,
      },
    },
  };
}

export async function findDuplicates(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  orgId: string,
  structured: StructuredGig,
): Promise<DuplicateCandidate[]> {
  const candidateDate = structured.core.date.value;
  if (!candidateDate) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: shows, error } = await (supabase as any).rpc("get_shows_by_org", {
    p_org_id: orgId,
  });

  if (error || !Array.isArray(shows)) {
    logger.warn("Duplicate lookup failed", error);
    return [];
  }

  const normalizedVenue = normalizeForMatch(structured.core.venue.value);
  const normalizedCity = normalizeForMatch(structured.core.city.value);
  const normalizedEvent = normalizeForMatch(structured.core.event.value);
  const normalizedArtist = normalizeForMatch(structured.core.artist.value);

  return shows
    .map((show: ShowRow & { venue_name?: string | null; venue_city?: string | null }) => {
      const sameDate = show.date?.startsWith(candidateDate);
      if (!sameDate) return null;

      const venueScore = compareStrings(
        normalizedVenue,
        normalizeForMatch(show.venue_name || null),
      );
      const cityScore = compareStrings(
        normalizedCity,
        normalizeForMatch(show.venue_city || null),
      );
      const titleScore = compareStrings(
        normalizedEvent,
        normalizeForMatch(show.title || null),
      );
      const artistScore = compareStrings(
        normalizedArtist,
        normalizeForMatch(show.title || null),
      );

      const nameScore = Math.max(titleScore, artistScore);
      const score = venueScore * 0.4 + cityScore * 0.2 + nameScore * 0.4;
      if (score < 0.45) return null;

      return {
        id: show.id,
        title: show.title,
        date: show.date,
        venue: show.venue_name ?? null,
        city: show.venue_city ?? null,
        score: Number(score.toFixed(2)),
      };
    })
    .filter(Boolean) as DuplicateCandidate[];
}

async function userHasOrgAccess(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  orgId: string,
  userId: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("check_org_membership", {
    p_org_id: orgId,
    p_user_id: userId,
  });

  if (error) {
    logger.error("Org membership lookup failed", error);
    return false;
  }

  return Boolean(data);
}

export function normalizeText(text: string): string {
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, " ");

  return cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function getExtension(filename: string): string {
  return filename.toLowerCase().split(".").pop() || "";
}

function pickField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  if (!match) return null;
  const value = match[2] ?? match[1];
  return value ? value.trim() : null;
}

function pickDate(text: string): string | null {
  const isoMatch = text.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const euroMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (euroMatch) {
    let [day, month, year] = euroMatch.slice(1);
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const longMatch = text.match(
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})/i,
  );
  if (longMatch) {
    const [, monthName, day, year] = longMatch;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  return null;
}

function pickCityFromVenueLine(text: string): string | null {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (/city[:\-]/i.test(line)) continue;
    if (/(venue|location)/i.test(line) && /[,|]/.test(line)) {
      const parts = line.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return parts[1];
      }
    }
  }
  return null;
}

function guessTitle(text: string): string | null {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const candidate = lines.find((line) => line.length > 6 && line.length < 140);
  return candidate ?? null;
}

function pickFee(text: string): string | null {
  const match = text.match(/([$\u00a3\u20ac]?\s?\d[\d\s,\.]*)\s?(usd|eur|sek|gbp|kr)?/i);
  if (!match) return null;
  return match[0].trim();
}

function pickDealType(lowered: string): string | null {
  if (lowered.includes("guarantee") || lowered.includes("flat")) {
    return "guarantee";
  }
  if (lowered.includes("vs") || lowered.includes("versus")) {
    return "versus";
  }
  if (lowered.includes("door") || lowered.includes("percentage")) {
    return "percentage";
  }
  if (lowered.includes("buyout")) {
    return "buyout";
  }
  return null;
}

function pickCurrency(fee: string | null): string | null {
  if (!fee) return null;
  if (fee.includes("$")) return "USD";
  if (fee.includes("\u20ac") || fee.includes("eur")) return "EUR";
  if (fee.includes("\u00a3") || fee.includes("gbp")) return "GBP";
  if (/sek|kr/i.test(fee)) return "SEK";
  return null;
}

function pickTimeNear(text: string, pattern: RegExp): string | null {
  const lines = text.split("\n");
  for (const line of lines) {
    if (pattern.test(line)) {
      const time = line.match(/(\d{1,2}:\d{2}\s?(am|pm)?)/i);
      if (time) return time[1];
    }
  }
  const loose = text.match(/(\d{1,2}:\d{2}\s?(am|pm)?)/i);
  return loose ? loose[1] : null;
}

function pickKeyword(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  if (!match) return null;
  const line = text
    .split("\n")
    .find((l) => pattern.test(l));
  return line ? line.trim() : match[0].trim();
}

function pickAirportCodes(text: string): string | null {
  const matches = text.match(/\b[A-Z]{3}\b/g);
  if (!matches || matches.length === 0) return null;
  return Array.from(new Set(matches)).slice(0, 5).join(", ");
}

function formatSetTime(date: string, setTime?: string | null): string | null {
  if (!setTime) return null;
  const timeMatch = setTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!timeMatch) return null;
  let [, hour, minute, meridiem] = timeMatch;
  let hoursNum = Number.parseInt(hour, 10);

  if (meridiem) {
    const isPM = meridiem.toLowerCase() === "pm";
    if (isPM && hoursNum < 12) hoursNum += 12;
    if (!isPM && hoursNum === 12) hoursNum = 0;
  }

  return `${date}T${pad(String(hoursNum))}:${pad(minute)}:00`;
}

function normalizeForMatch(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function compareStrings(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a))) {
    return 0.75;
  }
  return 0;
}

function monthNameToNumber(name: string): string | null {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const index = months.indexOf(name.toLowerCase());
  return index === -1 ? null : pad(String(index + 1));
}

function pad(input: string): string {
  return input.padStart(2, "0");
}

export async function findOrMatchArtist(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  orgId: string,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("people")
    .select("id,name")
    .eq("org_id", orgId)
    .eq("member_type", "artist")
    .ilike("name", trimmed)
    .maybeSingle();

  if (!error && data?.id) {
    return data.id;
  }

  const { data: fuzzy } = await supabase
    .from("people")
    .select("id,name")
    .eq("org_id", orgId)
    .eq("member_type", "artist")
    .ilike("name", `%${trimmed}%`)
    .limit(1);

  return fuzzy && fuzzy.length > 0 ? fuzzy[0].id : null;
}

export async function ai_enhance_extraction(rawText: string): Promise<StructuredGig> {
  return extractStructuredGig(rawText);
}

export async function performOCR(file: File): Promise<string> {
  try {
    // Lazy-load to keep cold paths light
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    return data.text || "";
  } catch (error) {
    logger.warn("OCR fallback failed", error);
    return "";
  }
}

export async function createImportJob(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  params: {
    orgId: string;
    status: ImportJobRecord["status"];
    rawText: string;
    normalizedText: string;
    parsedJson: unknown;
    confidenceMap: Record<string, number>;
    duplicates: DuplicateCandidate[];
    metadata?: ImportJobResponse["metadata"];
    errors?: string[];
    extractionMode?: ImportJobRecord["extraction_mode"];
  },
): Promise<string> {
  const payload = {
    org_id: params.orgId,
    status: params.status,
    raw_text: params.rawText,
    normalized_text: params.normalizedText,
    parsed_json: params.parsedJson,
    confidence_map: params.confidenceMap,
    duplicate_matches: params.duplicates,
    source_file_metadata: params.metadata ?? null,
    errors: params.errors ?? [],
    extraction_mode: params.extractionMode ?? "rule_based",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("import_jobs")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    logger.error("Failed to create import job", error);
    return crypto.randomUUID();
  }

  return data?.id ?? crypto.randomUUID();
}

export async function updateImportJob(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  jobId: string,
  params: Partial<{
    status: ImportJobRecord["status"];
    parsedJson: unknown;
    confidenceMap: Record<string, number>;
    duplicates: DuplicateCandidate[];
    extractedArtist: string | null;
    errors: string[];
    extractionMode?: ImportJobRecord["extraction_mode"];
    previousAttempts?: unknown[];
  }>,
): Promise<ImportJobRecord | null> {
  const updatePayload: Record<string, unknown> = {};
  if (params.status) updatePayload.status = params.status;
  if (params.parsedJson !== undefined) updatePayload.parsed_json = params.parsedJson;
  if (params.confidenceMap !== undefined) updatePayload.confidence_map = params.confidenceMap;
  if (params.duplicates !== undefined) updatePayload.duplicate_matches = params.duplicates;
  if (params.extractedArtist !== undefined) updatePayload.extracted_artist = params.extractedArtist;
  if (params.errors !== undefined) updatePayload.errors = params.errors;
  if (params.extractionMode) updatePayload.extraction_mode = params.extractionMode;
  if (params.previousAttempts) updatePayload.previous_attempts = params.previousAttempts;

  if (Object.keys(updatePayload).length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("import_jobs")
    .update(updatePayload)
    .eq("id", jobId)
    .select("*")
    .maybeSingle();

  if (error) {
    logger.error("Failed to update import job", error);
    return null;
  }

  return data as ImportJobRecord;
}

export async function fetchImportJob(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  jobId: string,
  orgId: string,
): Promise<ImportJobRecord | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch import job", error);
    return null;
  }

  return data as ImportJobRecord;
}

export function buildConfidenceMap(candidates: GigCandidate[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const candidate of candidates) {
    Object.assign(map, buildSingleConfidenceMap(candidate.candidateId, candidate.structured));
  }
  return map;
}

export function buildSingleConfidenceMap(prefix: string, structured: StructuredGig): Record<string, number> {
  const map: Record<string, number> = {};
  map[`${prefix}.core.date`] = structured.core.date.confidence;
  map[`${prefix}.core.city`] = structured.core.city.confidence;
  map[`${prefix}.core.venue`] = structured.core.venue.confidence;
  map[`${prefix}.core.event`] = structured.core.event.confidence;
  map[`${prefix}.core.promoter`] = structured.core.promoter.confidence;
  map[`${prefix}.core.artist`] = structured.core.artist.confidence;

  map[`${prefix}.deal.fee`] = structured.deal.fee.confidence;
  map[`${prefix}.deal.dealType`] = structured.deal.dealType.confidence;
  map[`${prefix}.deal.currency`] = structured.deal.currency.confidence;
  map[`${prefix}.deal.paymentTerms`] = structured.deal.paymentTerms.confidence;

  map[`${prefix}.hospitalityLogistics.hotel`] = structured.hospitalityLogistics.hotel.confidence;
  map[`${prefix}.hospitalityLogistics.transport`] = structured.hospitalityLogistics.transport.confidence;
  map[`${prefix}.hospitalityLogistics.catering`] = structured.hospitalityLogistics.catering.confidence;
  map[`${prefix}.hospitalityLogistics.soundcheck`] = structured.hospitalityLogistics.soundcheck.confidence;
  map[`${prefix}.hospitalityLogistics.setTime`] = structured.hospitalityLogistics.setTime.confidence;

  map[`${prefix}.tech.equipment`] = structured.tech.equipment.confidence;
  map[`${prefix}.tech.backline`] = structured.tech.backline.confidence;
  map[`${prefix}.tech.stage`] = structured.tech.stage.confidence;
  map[`${prefix}.tech.light`] = structured.tech.light.confidence;
  map[`${prefix}.tech.sound`] = structured.tech.sound.confidence;

  map[`${prefix}.travel.flights`] = structured.travel.flights.confidence;
  map[`${prefix}.travel.times`] = structured.travel.times.confidence;
  map[`${prefix}.travel.airportCodes`] = structured.travel.airportCodes.confidence;
  return map;
}

function appendShowId(parsedJson: unknown, candidateId: string | undefined, showId: string | null, requiresArtistAssignment?: boolean) {
  if (!parsedJson || !candidateId) return parsedJson;
  if (typeof parsedJson !== "object" || parsedJson === null) return parsedJson;

  const asRecord = parsedJson as Record<string, unknown>;
  const candidates = (asRecord.candidates as GigCandidate[] | undefined) ?? [];
  const updated = candidates.map((c) =>
    c.candidateId === candidateId ? { ...c, showId, requiresArtistAssignment } : c,
  );

  return { ...asRecord, candidates: updated };
}

export async function buildCandidatesFromInput(
  rawText: string,
  normalizedText: string,
  file: File | null,
  source: ImportJobResponse["source"],
): Promise<{ candidates: GigCandidate[]; errors: string[] }> {
  const candidates: GigCandidate[] = [];
  const errors: string[] = [];
  const fallbackStructured = extractStructuredGig(normalizedText);

  // Multi-gig extraction for CSV/Excel
  if (file) {
    const extension = getExtension(file.name);
    if (extension === "csv" || extension === "txt") {
      const rows = parseCsv(normalizedText);
      if (rows.length > 0) {
        for (const row of rows) {
          const structured = structuredFromRow(row);
          if (
            structured.core.event.value ||
            structured.core.venue.value ||
            structured.core.date.value
          ) {
            candidates.push(makeCandidate(structured));
          }
        }
      }
    } else if (extension === "xls" || extension === "xlsx") {
      const rows = await parseExcel(file);
      if (rows.length > 0) {
        for (const row of rows) {
          const structured = structuredFromRow(row);
          if (
            structured.core.event.value ||
            structured.core.venue.value ||
            structured.core.date.value
          ) {
            candidates.push(makeCandidate(structured));
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    candidates.push(makeCandidate(fallbackStructured));
  }

  // Chaos-document handling: split threads into multiple gigs if multiple dates found
  if (candidates.length === 1) {
    const dates = Array.from(
      new Set(
        normalizedText.match(/\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}/g) ||
        normalizedText.match(/\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}/g) ||
        [],
      ),
    );
    if (dates.length > 1) {
      candidates.length = 0;
      for (const date of dates.slice(0, 10)) {
        const structured = extractStructuredGig(`${normalizedText}\n${date}`);
        structured.core.date.value = normalizeDateCandidate(date);
        candidates.push(makeCandidate(structured));
      }
    }
  }

  if (candidates.length === 0) {
    errors.push("No candidates extracted");
  }

  return { candidates, errors };
}

function makeCandidate(structured: StructuredGig): GigCandidate {
  const candidateId = crypto.randomUUID();
  return {
    candidateId,
    title: structured.core.event.value ?? structured.core.venue.value ?? null,
    date: structured.core.date.value,
    city: structured.core.city.value,
    venueName: structured.core.venue.value,
    setTime: structured.hospitalityLogistics.setTime.value,
    notes: null,
    structured,
    duplicates: [],
    confidenceMap: buildSingleConfidenceMap(candidateId, structured),
  };
}

export function structuredFromRow(row: Record<string, string>): StructuredGig {
  const date = normalizeDateCandidate(
    row.date ||
      row["show date"] ||
      row["performance date"] ||
      row["performancedate"] ||
      row["datum"],
  );
  const city = row.city || row["stad"] || row["venue city"] || null;
  const venue = row.venue || row["venue name"] || row["location"] || null;
  const artist = row.artist || row["artist name"] || row["performer"] || row["band"] || null;
  const fee = row.fee || row.offer || row.guarantee || null;
  const setTime = row["set time"] || row["performance time"] || row.time || null;

  const field = (value: string | null, confidence: number): StructuredField => ({
    value,
    confidence: value ? confidence : LOW_CONFIDENCE,
  });

  return {
    core: {
      date: field(date, HIGH_CONFIDENCE),
      city: field(city, MEDIUM_CONFIDENCE),
      venue: field(venue, MEDIUM_CONFIDENCE),
      event: field(row.show || row.title || row["show name"] || null, MEDIUM_CONFIDENCE),
      promoter: field(row.promoter || null, LOW_CONFIDENCE),
      artist: field(artist, MEDIUM_CONFIDENCE),
    },
    deal: {
      fee: field(fee, MEDIUM_CONFIDENCE),
      dealType: field(row.deal || null, LOW_CONFIDENCE),
      currency: field(pickCurrency(fee), LOW_CONFIDENCE),
      paymentTerms: field(row.paymentterms || row["payment terms"] || null, LOW_CONFIDENCE),
    },
    hospitalityLogistics: {
      hotel: field(row.hotel || null, LOW_CONFIDENCE),
      transport: field(row.transport || null, LOW_CONFIDENCE),
      catering: field(row.catering || null, LOW_CONFIDENCE),
      soundcheck: field(row.soundcheck || null, MEDIUM_CONFIDENCE),
      setTime: field(setTime, MEDIUM_CONFIDENCE),
    },
    tech: {
      equipment: field(row.equipment || null, LOW_CONFIDENCE),
      backline: field(row.backline || null, LOW_CONFIDENCE),
      stage: field(row.stage || null, LOW_CONFIDENCE),
      light: field(row.light || null, LOW_CONFIDENCE),
      sound: field(row.sound || null, LOW_CONFIDENCE),
    },
    travel: {
      flights: field(row.flights || null, LOW_CONFIDENCE),
      times: field(row.times || null, LOW_CONFIDENCE),
      airportCodes: field(row.airports || null, LOW_CONFIDENCE),
    },
  };
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || "").trim();
    });
    rows.push(row);
  }

  return rows;
}

export async function parseExcel(file: File): Promise<Record<string, string>[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX: any = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    return json.map((row) => {
      const normalizedRow: Record<string, string> = {};
      Object.keys(row).forEach((key) => {
        normalizedRow[key.toLowerCase()] = String(row[key] ?? "").trim();
      });
      return normalizedRow;
    });
  } catch (error) {
    logger.warn("Excel parsing failed, falling back to text", error);
    return [];
  }
}

function normalizeDateCandidate(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  const isoMatch = cleaned.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const euroMatch = cleaned.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (euroMatch) {
    let [day, month, year] = euroMatch.slice(1);
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const longMatch = cleaned.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})/i);
  if (longMatch) {
    const [, monthName, day, year] = longMatch;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  return null;
}
