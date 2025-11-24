import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assignPersonToShow } from "@/lib/actions/show-team";
import { getCachedShow, getCachedOrg } from "@/lib/cache";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; showId: string }> }
) {
  try {
    const { org: orgSlug, showId } = await params;

    // Verify authentication
    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parallelize org and show fetching
    const [{ data: org, error: orgError }, { data: show, error: showError }] =
      await Promise.all([getCachedOrg(orgSlug), getCachedShow(showId)]);

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (showError) {
      return NextResponse.json({ error: showError.message }, { status: 500 });
    }

    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    // CRITICAL: Validate tenant boundary - show must belong to the org in the URL
    if (show.org_id !== org.id) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    // Get form data
    const formData = await request.formData();

    // Assign person to show using the existing server action
    const result = await assignPersonToShow(formData);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error("Error assigning person to show", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
