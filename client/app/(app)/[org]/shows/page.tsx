import ShowsClient from "./components/ShowsClient";
import CreateShowButton from "./components/CreateShowButton";
import ImportDataButton from "./components/ImportDataButton";
import { notFound } from "next/navigation";

// Optimize: Cache shows list for 30 seconds
export const revalidate = 30;
// Force dynamic to show loading state
export const dynamic = 'force-dynamic'

interface ShowsPageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function ShowsPage({
  params,
  searchParams,
}: ShowsPageProps) {
  const { org: orgSlug } = await params;
  const { view = "list" } = await searchParams;

  // OPTIMIZED: Use cached helpers and parallelize
  const { getCachedOrg, getCachedOrgShows } = await import('@/lib/cache');
  
  // First get org, then parallelize all other queries with org.id
  const { data: org, error } = await getCachedOrg(orgSlug)

  if (error || !org) {
    notFound();
  }

  // Fetch shows using org.id
  const { data: shows } = await getCachedOrgShows(org.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">Shows</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tour schedule
          </p>
        </div>
        <div className="flex gap-3">
          <ImportDataButton orgId={org.id} />
          <CreateShowButton orgId={org.id} />
        </div>
      </div>

      <ShowsClient shows={shows || []} orgSlug={orgSlug} view={view} />
    </div>
  );
}
