"use client";

import { useShows } from "@/lib/hooks/use-shows";
import ShowsClient from "./components/ShowsClient";
import { ShowsSkeleton } from "./components/ShowsSkeleton";

export function ShowsPageClient({
  orgSlug,
  orgId,
}: {
  orgSlug: string;
  orgId: string;
  view: string;
}) {
  // This will use the prefetched data on initial load (instant!)
  // Then automatically refetch in background after staleTime
  const { data, isLoading, error } = useShows(orgSlug);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">Shows</h1>
            <p className="text-muted-foreground mt-1">
              Manage your tour schedule
            </p>
          </div>
        </div>
        <div className="text-destructive">
          Error loading shows: {error.message}
        </div>
      </div>
    );
  }

  // Show loading skeleton only on initial load without prefetch
  if (isLoading && !data) {
    return <ShowsSkeleton />;
  }

  const shows = data || [];

  return (
    <div className="space-y-6">
      <ShowsClient shows={shows} orgSlug={orgSlug} orgId={orgId} />
    </div>
  );
}
