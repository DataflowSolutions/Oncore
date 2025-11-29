import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  try {
    const supabase = await getSupabaseServer();

    // Get recent shows (sorted by date, with recent first)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shows, error } = await (supabase as any)
      .from("shows")
      .select(`
        id,
        title,
        date,
        venue:venues(name, city)
      `)
      .eq("org_id", orgId)
      .order("date", { ascending: false })
      .limit(10);

    if (error) {
      logger.error("Error fetching shows", error);
      return NextResponse.json({ error: "Failed to fetch shows" }, { status: 500 });
    }

    return NextResponse.json(shows || []);
  } catch (error) {
    logger.error("Error in shows API", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}