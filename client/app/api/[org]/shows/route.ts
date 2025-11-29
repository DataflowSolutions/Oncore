import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getCachedOrg, getCachedOrgShows } from "@/lib/cache";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string }> }
) {
  try {
    const { org: orgSlug } = await params;

    // Verify authentication
    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get org and verify access
    const { data: org, error: orgError } = await getCachedOrg(orgSlug);

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Fetch shows
    const { data: shows, error } = await getCachedOrgShows(org.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info("Fetched shows", { count: shows?.length || 0 });

    // Fetch show assignments with people using RPC to bypass RLS issues
    const showIds = (shows || []).map((s: { id: string }) => s.id);

    if (showIds.length > 0) {
      // Use RPC function to avoid RLS recursion issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignments, error: assignmentsError } = await (supabase as any)
        .rpc("get_show_assignments_for_shows", {
          p_show_ids: showIds,
        });

      logger.info("Fetched show_assignments", {
        count: assignments?.length || 0,
        error: assignmentsError?.message || null,
        showIds: showIds.length,
      });

      if (assignmentsError) {
        logger.error("Error fetching show_assignments", assignmentsError);
      }

      // Group assignments by show_id
      const assignmentsByShow: Record<
        string,
        {
          people: {
            id: string;
            name: string;
            member_type: string | null;
          } | null;
        }[]
      > = {};
      for (const assignment of assignments || []) {
        if (!assignmentsByShow[assignment.show_id]) {
          assignmentsByShow[assignment.show_id] = [];
        }
        assignmentsByShow[assignment.show_id].push({
          people: {
            id: assignment.person_id,
            name: assignment.person_name,
            member_type: assignment.member_type,
          },
        });
      }

      logger.info("Grouped assignments", {
        groupedShowIds: Object.keys(assignmentsByShow),
        assignments: JSON.stringify(assignmentsByShow),
      });

      // Attach assignments to shows
      const showsWithAssignments = (shows || []).map(
        (show: { id: string }) => ({
          ...show,
          show_assignments: assignmentsByShow[show.id] || [],
        })
      );

      return NextResponse.json(showsWithAssignments);
    }

    return NextResponse.json(shows || []);
  } catch (error) {
    logger.error("Error fetching shows", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
