import VenuesClient from "./components/VenuesClient";

// Force dynamic to show loading state
export const dynamic = 'force-dynamic'

interface VenuesPageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function VenuesPage({
  params,
  searchParams,
}: VenuesPageProps) {
  const { org: orgSlug } = await params;
  const { view = "venues" } = await searchParams;

  // OPTIMIZED: Use cached helpers and parallelize all queries
  const { getCachedOrg, getCachedOrgVenuesWithCounts, getCachedPromoters } = await import('@/lib/cache');
  
  // First get org, then parallelize all other queries with org.id
  const orgResult = await getCachedOrg(orgSlug)
  const { data: org } = orgResult

  if (!org) {
    return <div>Organization not found</div>;
  }

  // Parallelize all data fetching using org.id
  const [venuesResult, promotersResult] = await Promise.all([
    getCachedOrgVenuesWithCounts(org.id),
    getCachedPromoters(org.id)
  ])

  const { data: allVenues } = venuesResult
  const { data: allPromoters } = promotersResult

  return (
    <div className="mb-16 mt-4">
      <VenuesClient 
        venues={allVenues || []} 
        promoters={allPromoters || []}
        orgId={org.id}
        orgSlug={orgSlug} 
        view={view} 
      />
    </div>
  );
}
