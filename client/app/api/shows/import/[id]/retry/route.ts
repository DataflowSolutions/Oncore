import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { buildCandidatesFromInput, buildConfidenceMap, findDuplicates, normalizeText, updateImportJob, fetchImportJob } from "../../route";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const orgId = request.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await fetchImportJob(supabase, params.id, orgId);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previousAttempts = Array.isArray(job.previous_attempts) ? job.previous_attempts : [];
  previousAttempts.push({
    parsed_json: job.parsed_json,
    confidence_map: job.confidence_map,
    duplicate_matches: job.duplicate_matches,
    errors: job.errors,
    status: job.status,
    retried_at: new Date().toISOString(),
  });

  const rawText = job.raw_text || "";
  const normalizedText = job.normalized_text || normalizeText(rawText);

  const extraction = await buildCandidatesFromInput(rawText, normalizedText, null, "text");
  const candidatesWithDuplicates = [];
  for (const candidate of extraction.candidates) {
    const duplicates = await findDuplicates(supabase, orgId, candidate.structured);
    candidatesWithDuplicates.push({ ...candidate, duplicates });
  }
  const confidenceMap = buildConfidenceMap(candidatesWithDuplicates);

  const updated = await updateImportJob(supabase, params.id, {
    status: "needs_review",
    parsedJson: { candidates: candidatesWithDuplicates, source: "text" },
    confidenceMap,
    duplicates: candidatesWithDuplicates.flatMap((c) => c.duplicates),
    errors: extraction.errors,
    previousAttempts,
  });

  return NextResponse.json({ data: updated });
}
