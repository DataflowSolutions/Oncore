import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ai_enhance_extraction, buildCandidatesFromInput, buildConfidenceMap, fetchImportJob, findDuplicates, normalizeText, updateImportJob } from "../../route";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orgId = request.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await fetchImportJob(supabase, id, orgId);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawText = job.raw_text || "";
  const normalizedText = job.normalized_text || normalizeText(rawText);
  const enhancedStructured = await ai_enhance_extraction(normalizedText);

  const extraction = await buildCandidatesFromInput(rawText, normalizedText, null, "text");
  if (extraction.candidates.length === 0) {
    extraction.candidates.push({
      candidateId: crypto.randomUUID(),
      title: enhancedStructured.core.event.value,
      date: enhancedStructured.core.date.value,
      city: enhancedStructured.core.city.value,
      venueName: enhancedStructured.core.venue.value,
      setTime: enhancedStructured.hospitalityLogistics.setTime.value,
      notes: null,
      structured: enhancedStructured,
      duplicates: [],
      confidenceMap: buildConfidenceMap([{ candidateId: "tmp", structured: enhancedStructured } as any]),
    });
  }

  const candidatesWithDuplicates = [];
  for (const candidate of extraction.candidates) {
    const duplicates = await findDuplicates(supabase, orgId, candidate.structured);
    candidatesWithDuplicates.push({ ...candidate, duplicates });
  }

  const confidenceMap = buildConfidenceMap(candidatesWithDuplicates);

  const updated = await updateImportJob(supabase, id, {
    parsedJson: { candidates: candidatesWithDuplicates, source: "text" },
    confidenceMap,
    duplicates: candidatesWithDuplicates.flatMap((c) => c.duplicates),
    extractionMode: "ai_assisted",
  });

  return NextResponse.json({ data: updated });
}
