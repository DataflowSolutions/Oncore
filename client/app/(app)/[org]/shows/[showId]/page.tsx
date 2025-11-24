import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { ShowDetailPageClient } from "./show-detail-page-client";
import { queryKeys } from "@/lib/query-keys";
import { getShowTeam, getAvailablePeople } from "@/lib/actions/show-team";
import { getVenuesByOrg } from "@/lib/actions/shows";

// Always render dynamically for authenticated pages
// React cache() handles request-level deduplication
export const dynamic = "force-dynamic";

interface ShowDetailPageProps {
  params: Promise<{ org: string; showId: string }>;
}

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  const { org: orgSlug, showId } = await params;

  // OPTIMIZED: Use cached helpers to prevent redundant queries
  const { getCachedOrg, getCachedShowSchedule } = await import("@/lib/cache");

  // Get org (already validated and cached by layout)
  const { data: org } = await getCachedOrg(orgSlug);

  if (!org) {
    return <div>Organization not found</div>;
  }

  // OPTIMIZED: Reuse the layout's QueryClient by accessing via HydrationBoundary
  // The layout already prefetched show basic data, we just add page-specific data
  const queryClient = new QueryClient();

  // Prefetch remaining show detail data in parallel
  await Promise.all([
    // Prefetch schedule
    queryClient.prefetchQuery({
      queryKey: queryKeys.showSchedule(showId),
      queryFn: async () => {
        const { data: scheduleItems } = await getCachedShowSchedule(showId);
        return scheduleItems || [];
      },
    }),

    // OPTIMIZED: Prefetch team data with parallel queries
    queryClient.prefetchQuery({
      queryKey: queryKeys.showTeam(showId),
      queryFn: async () => {
        const [assignedTeam, availablePeople] = await Promise.all([
          getShowTeam(showId),
          getAvailablePeople(org.id),
        ]);
        return { assignedTeam, availablePeople };
      },
    }),

    // Prefetch venues
    queryClient.prefetchQuery({
      queryKey: queryKeys.venues(orgSlug),
      queryFn: async () => {
        return await getVenuesByOrg(org.id);
      },
    }),
  ]);

  // OPTIMIZED: Nested HydrationBoundary merges with layout's boundary
  // This approach allows page-specific prefetching while layout handles common data
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShowDetailPageClient orgSlug={orgSlug} showId={showId} orgId={org.id} />
    </HydrationBoundary>
  );
}
