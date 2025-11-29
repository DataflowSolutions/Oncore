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

      // Also fetch show_assignments with people using RPC
      const supabase = await getSupabaseServer();
      const showIds = shows.map((s: { id: string }) => s.id);

      // Use RPC function to avoid RLS recursion issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignments } = await (supabase as any).rpc(
        "get_show_assignments_for_shows",
        { p_show_ids: showIds }
      );

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
