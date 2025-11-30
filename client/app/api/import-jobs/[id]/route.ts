import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await getSupabaseServer();
    // Try RPC first (preferred: handles RLS/membership inside the function)
    const { data, error } = await (supabase as any).rpc("app_get_import_job", {
      p_job_id: id,
    });

    if (!error && data) {
      return NextResponse.json(data);
    }

    // Fallback if RPC is missing (PGRST202) or returns error
    if (error) {
      logger.warn("RPC app_get_import_job failed; falling back to table lookup", error);
    }

    const { data: row, error: tableError } = await supabase
      .from("import_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (tableError) {
      logger.warn("Import job table lookup failed", tableError);
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (row?.status === "completed" && !row?.extracted) {
      logger.warn("Import job completed but has no extracted payload", { id });
    }
    return NextResponse.json(row);
  } catch (err) {
    logger.error("Unexpected error fetching import job", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
