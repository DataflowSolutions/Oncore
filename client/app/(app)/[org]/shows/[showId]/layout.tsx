import { notFound } from "next/navigation";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { ShowTabs } from "@/components/shows/ShowTabs";
import { Badge } from "@/components/ui/badge";

interface ShowLayoutProps {
  children: React.ReactNode;
  params: Promise<{ org: string; showId: string }>;
}

export default async function ShowLayout({
  children,
  params,
}: ShowLayoutProps) {
  const { org: orgSlug, showId } = await params;

  // OPTIMIZED: Use cached helpers to prevent redundant queries
  const { getCachedOrg, getCachedShow } = await import("@/lib/cache");

  // Parallelize verification queries
  const [orgResult, showResult] = await Promise.all([
    getCachedOrg(orgSlug),
    getCachedShow(showId),
  ]);

  const { data: org } = orgResult;
  const { data: show } = showResult;

  if (!org) {
    notFound();
  }

  if (!show || show.org_id !== org.id) {
    notFound();
  }

  // OPTIMIZED: Single HydrationBoundary for the entire show section
  // Prefetch show data for TanStack Query (used by Sidebar and all child pages)
  const queryClient = new QueryClient();

  await Promise.all([
    // Prefetch basic show data
    queryClient.prefetchQuery({
      queryKey: queryKeys.show(showId),
      queryFn: async () => show,
    }),
    // Prefetch show with venue for detail page
    queryClient.prefetchQuery({
      queryKey: queryKeys.showWithVenue(showId),
      queryFn: async () => show,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        {/* Back Button */}
        {/* <Link href={`/${orgSlug}/shows`} prefetch={true}>
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Shows
          </Button>
        </Link> */}

        {/* Shared Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex gap-4 items-center">
              <h1 className="text-3xl font-bold tracking-tight">
                {show.title || "Untitled Show"}
              </h1>
              <Badge
                variant={show.status === "confirmed" ? "default" : "secondary"}
              >
                {show.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {show.date && (
                <span className="text-sm text-muted-foreground">
                  {new Date(show.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <ShowTabs orgSlug={orgSlug} showId={showId} />
        </div>

        {/* Page Content */}
        <div>{children}</div>
      </div>
    </HydrationBoundary>
  );
}
