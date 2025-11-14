import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getCachedOrg, getCachedCalendarRuns } from "@/lib/cache";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ org: string }> },
) {
  try {
    const { org: orgSlug } = await params;

    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: org } = await getCachedOrg(orgSlug);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data, error } = await getCachedCalendarRuns(org.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    logger.error("Error fetching calendar runs", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
