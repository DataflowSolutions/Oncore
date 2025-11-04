import ShowsClient from "./components/ShowsClient";
import CreateShowButton from "./components/CreateShowButton";
import ImportDataButton from "./components/ImportDataButton";
import { getShowsByOrg } from "@/lib/actions/shows";
import { notFound } from "next/navigation";

// Optimize: Cache shows list for 30 seconds
export const revalidate = 30;

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

  // OPTIMIZED: Use cached org lookup
  const { getCachedOrg } = await import('@/lib/cache');
  const { data: org, error } = await getCachedOrg(orgSlug);

  if (error || !org) {
    notFound();
  }

  // Fetch shows data
  const shows = await getShowsByOrg(org.id);

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

      <ShowsClient shows={shows} orgSlug={orgSlug} view={view} />
    </div>
  );
}
