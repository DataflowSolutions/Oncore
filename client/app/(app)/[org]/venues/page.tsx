import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getCachedOrg,
  getCachedOrgVenuesWithCounts,
  getCachedPromoters,
  getCachedOrgPeopleFull,
  getCachedAvailableSeats,
  getCachedOrgInvitations,
} from "@/lib/cache";
import { notFound } from "next/navigation";
import { VenuesPageClient } from "./venues-page-client";

interface VenuesPageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ view?: string }>;
}

// Server Component - prefetches data for instant load
export default async function VenuesPage({
  params,
  searchParams,
}: VenuesPageProps) {
  const { org: orgSlug } = await params;
  const { view = "venues" } = await searchParams;

  // Create a server-side QueryClient for prefetching
  const queryClient = new QueryClient();

  // Get org first for access control
  const { data: org, error } = await getCachedOrg(orgSlug);

  if (error || !org) {
    notFound();
  }

  // Prefetch venues and promoters data on the server
  const prefetchPromises = [
    queryClient.prefetchQuery({
      queryKey: queryKeys.venuesWithCounts(orgSlug),
      queryFn: async () => {
        const { data: venues } = await getCachedOrgVenuesWithCounts(org.id);
        return venues || [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["promoters", orgSlug],
      queryFn: async () => {
        const { data: promoters } = await getCachedPromoters(org.id);
        return promoters || [];
      },
    }),
  ];

  // If viewing team tab, also prefetch people data
  if (view === "team") {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.peopleFull(orgSlug),
        queryFn: async () => {
          const { data: people } = await getCachedOrgPeopleFull(org.id);
          return people || [];
        },
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.invitations(orgSlug),
        queryFn: async () => {
          const { data: invitations } = await getCachedOrgInvitations(org.id);
          return invitations || [];
        },
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.seats(orgSlug),
        queryFn: async () => {
          return await getCachedAvailableSeats(org.id);
        },
      })
    );
  }

  await Promise.all(prefetchPromises);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <VenuesPageClient orgSlug={orgSlug} orgId={org.id} view={view} />
    </HydrationBoundary>
  );
}
