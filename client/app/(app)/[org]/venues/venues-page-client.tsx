"use client";

import { useVenuesWithCounts } from "@/lib/hooks/use-venues";
import {
  usePeople,
} from "@/lib/hooks/use-people";
import { useQuery } from "@tanstack/react-query";
import VenuesClient from "./components/VenuesClient";
import { VenueSkeleton } from "./components/VenueSkeleton";

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
    return <VenueSkeleton />;
  }

  if (view === "team" && peopleLoading && !allPeople.length) {
    return <VenueSkeleton />;
  }

  return (
    <div className="mb-16 mt-4">
      <VenuesClient
        venues={venues}
        promoters={promoters}
        people={allPeople}
        orgId={orgId}
        orgSlug={orgSlug}
        view={view}
      />
    </div>
  );
}
