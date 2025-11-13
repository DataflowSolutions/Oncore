"use client";

import { useVenuesWithCounts } from "@/lib/hooks/use-venues";
import {
  usePeople,
  useInvitations,
  useAvailableSeats,
} from "@/lib/hooks/use-people";
import { useQuery } from "@tanstack/react-query";
import VenuesClient from "./components/VenuesClient";
import { Skeleton } from "@/components/ui/skeleton";

export function VenuesPageClient({
  orgSlug,
  orgId,
  view,
}: {
  orgSlug: string;
  orgId: string;
  view: string;
}) {
  // Use prefetched data - instant load!
  const {
    data: venues = [],
    isLoading: venuesLoading,
    error: venuesError,
  } = useVenuesWithCounts(orgSlug);
  const { data: promoters = [] } = useQuery({
    queryKey: ["promoters", orgSlug],
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/promoters`);
      if (!response.ok) throw new Error("Failed to fetch promoters");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch people data (always fetch to enable prefetching)
  const {
    data: allPeople = [],
    isLoading: peopleLoading,
    error: peopleError,
  } = usePeople(orgSlug);
  const { data: invitations = [] } = useInvitations(orgSlug);
  const { data: seatInfo } = useAvailableSeats(orgSlug);

  if (venuesError) {
    return (
      <div className="space-y-4">
        <div className="text-destructive">
          Error loading venues: {venuesError.message}
        </div>
      </div>
    );
  }

  if (view === "team" && peopleError) {
    return (
      <div className="space-y-4">
        <div className="text-destructive">
          Error loading team: {peopleError.message}
        </div>
      </div>
    );
  }

  // Show loading skeleton only on initial load without prefetch
  if (venuesLoading && !venues.length) {
    return <VenuesPageSkeleton />;
  }

  if (view === "team" && peopleLoading && !allPeople.length) {
    return <VenuesPageSkeleton />;
  }

  return (
    <div className="mb-16 mt-4">
      <VenuesClient
        venues={venues}
        promoters={promoters}
        people={allPeople}
        invitations={invitations}
        seatInfo={seatInfo ?? null}
        orgId={orgId}
        orgSlug={orgSlug}
        view={view}
      />
    </div>
  );
}

function VenuesPageSkeleton() {
  return (
    <div className="mb-16 mt-4 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
