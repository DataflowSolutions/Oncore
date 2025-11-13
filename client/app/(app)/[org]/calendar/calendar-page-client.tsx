"use client";

import { CalendarSourceForm } from "@/components/calendar/CalendarSourceForm";
import { CalendarSourceList } from "@/components/calendar/CalendarSourceList";
import { CalendarRunList } from "@/components/calendar/CalendarRunList";
import { useCalendarSources, useCalendarRuns } from "@/lib/hooks/use-ingestion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface CalendarPageClientProps {
  orgSlug: string;
  orgId: string;
}

export function CalendarPageClient({ orgSlug, orgId }: CalendarPageClientProps) {
  const {
    data: sources = [],
    isLoading: sourcesLoading,
  } = useCalendarSources(orgSlug);
  const { data: runs = [], isLoading: runsLoading } = useCalendarRuns(orgSlug);

  const showSourceSkeleton = sourcesLoading && sources.length === 0;
  const showRunSkeleton = runsLoading && runs.length === 0;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Calendar sync</h1>
          <p className="text-sm text-muted-foreground">
            Manage read-only feeds that keep Oncore in sync with promoter or agency calendars.
          </p>
        </div>
        <CalendarSourceForm orgId={orgId} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Connected calendars</h2>
        {showSourceSkeleton ? <LoadingCard /> : null}
        {!showSourceSkeleton ? <CalendarSourceList orgId={orgId} sources={sources} /> : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Sync history</h2>
        {showRunSkeleton ? <LoadingCard /> : null}
        {!showRunSkeleton ? <CalendarRunList runs={runs} /> : null}
      </section>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="space-y-4 py-8">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}
