import { notFound } from "next/navigation";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { ShowHeader } from "@/components/shows/ShowHeader";

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
        <ShowHeader
          showId={showId}
          orgSlug={orgSlug}
          initialTitle={show.title}
          initialDate={show.date}
          initialStatus={show.status}
        />

        {/* Page Content */}
        <div>{children}</div>
      </div>
    </HydrationBoundary>
  );
}
