import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { ShowsPageClient } from "./shows-page-client";
import { getCachedOrg, getCachedOrgShows } from "@/lib/cache";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

interface ShowsPageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ view?: string }>;
}

// Server Component - prefetches data for instant load
export default async function ShowsPage({
  params,
  searchParams,
}: ShowsPageProps) {
  const { org: orgSlug } = await params;
  const { view = "list" } = await searchParams;

  // Create a server-side QueryClient for prefetching
  const queryClient = new QueryClient();

  // Get org first for access control
  const { data: org, error } = await getCachedOrg(orgSlug);

  if (error || !org) {
    notFound();
  }

  // Prefetch shows data on the server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.shows(orgSlug),
    queryFn: async () => {
      const { data: shows } = await getCachedOrgShows(org.id);
      if (!shows || shows.length === 0) return shows || [];

      // Also fetch show_assignments with people
      const supabase = await getSupabaseServer();
      const showIds = shows.map((s: { id: string }) => s.id);

      const { data: assignments } = await supabase
        .from("show_assignments")
        .select("show_id, people(id, name, member_type)")
        .in("show_id", showIds);

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

      // Attach assignments to shows
      return shows.map((show: { id: string }) => ({
        ...show,
        show_assignments: assignmentsByShow[show.id] || [],
      }));
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShowsPageClient orgSlug={orgSlug} orgId={org.id} view={view} />
    </HydrationBoundary>
  );
}
