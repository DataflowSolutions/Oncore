import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
import { getCachedOrg, getCachedCalendarSources, getCachedCalendarRuns } from "@/lib/cache";
import { CalendarPageClient } from "./calendar-page-client";

interface CalendarPageProps {
  params: Promise<{ org: string }>;
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { org: orgSlug } = await params;

  const { data: org } = await getCachedOrg(orgSlug);
  if (!org) {
    notFound();
  }

  const queryClient = new QueryClient();

  const [sourcesResult, runsResult] = await Promise.all([
    getCachedCalendarSources(org.id),
    getCachedCalendarRuns(org.id),
  ]);

  queryClient.setQueryData(queryKeys.calendarSources(orgSlug), sourcesResult.data ?? []);
  queryClient.setQueryData(queryKeys.calendarRuns(orgSlug), runsResult.data ?? []);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CalendarPageClient orgSlug={orgSlug} orgId={org.id} />
    </HydrationBoundary>
  );
}
