"use client";

import { useShows } from "@/lib/hooks/use-shows";
import ShowsClient from "./components/ShowsClient";
import { Skeleton } from "@/components/ui/skeleton";

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
    return <ShowsListSkeleton />;
  }

  const shows = data || [];

  return (
    <div className="space-y-6">
      <ShowsClient shows={shows} orgSlug={orgSlug} orgId={orgId} />
    </div>
  );
}

function ShowsListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
