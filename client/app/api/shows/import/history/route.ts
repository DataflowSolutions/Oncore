import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hasAccess, error: membershipError } = await (supabase as any).rpc("check_org_membership", {
    p_org_id: orgId,
    p_user_id: userData.user.id,
  });

  if (membershipError || !hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("import_jobs")
    .select("id,status,created_at,source_file_metadata,parsed_json,errors")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to fetch import history", error);
    return NextResponse.json({ error: "Failed to fetch import history" }, { status: 500 });
  }

  const history = (data || []).map((row: any) => ({
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    metadata: row.source_file_metadata,
    candidate_count: Array.isArray(row?.parsed_json?.candidates) ? row.parsed_json.candidates.length : 0,
    errors: row.errors || [],
  }));

  return NextResponse.json({ data: history });
}
