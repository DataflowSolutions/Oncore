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

    // Fetch show assignments with people (for artist display)
    const showIds = (shows || []).map((s: { id: string }) => s.id);

    if (showIds.length > 0) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("show_assignments")
        .select("show_id, people(id, name, member_type)")
        .in("show_id", showIds);

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
          people: assignment.people as {
            id: string;
            name: string;
            member_type: string | null;
          } | null,
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
