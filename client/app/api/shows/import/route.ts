import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/database.types";

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

type ImportJob = {
  status: "processing" | "needs_review" | "completed";
  rawText: string;
  structured: StructuredGig;
  duplicates: DuplicateCandidate[];
  source: "file" | "text";
  metadata?: {
    name: string;
    type: string;
    size: number;
  };
  warnings?: string[];
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

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  // JSON payloads are used to finalize an import (approve).
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
    let source: ImportJob["source"] = "text";
    let metadata: ImportJob["metadata"] | undefined;

    if (file) {
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

    const structured = extractStructuredGig(rawText);
    const duplicates = await findDuplicates(supabase, orgId, structured);

    if (rawText.length > 20000) {
      warnings.push("Large document truncated to first 20k characters for preview.");
      rawText = rawText.slice(0, 20000);
    }

    const job: ImportJob = {
      status: "needs_review",
      rawText,
      structured,
      duplicates,
      source,
      metadata,
      warnings: warnings.length ? warnings : undefined,
    };

    return NextResponse.json({ success: true, job });
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
      payload,
    }: {
      orgId?: string;
      payload?: {
        title?: string;
        date?: string;
        city?: string;
        venueName?: string;
        setTime?: string;
        notes?: string;
      };
    } = body || {};

    if (!orgId || !payload?.date || !payload?.title) {
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

    return NextResponse.json({
      success: true,
      status: "completed",
      showId: Array.isArray(data) ? data[0]?.id ?? null : data?.id ?? null,
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
      return normalizeText(result.text || "");
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
    return normalizeText(text);
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

async function findDuplicates(
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
  const { data, error } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    logger.error("Org membership lookup failed", error);
    return false;
  }

  return Boolean(data && data.length > 0);
}

function normalizeText(text: string): string {
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
