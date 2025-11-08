import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCachedOrg, getCachedOrgVenuesWithCounts, getCachedPromoters } from '@/lib/cache'
import { notFound } from 'next/navigation'
import { VenuesPageClient } from './venues-page-client'

interface VenuesPageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ view?: string }>;
}

// Server Component - prefetches data for instant load
export default async function VenuesPage({
  params,
  searchParams,
}: VenuesPageProps) {
  const { org: orgSlug } = await params;
  const { view = "venues" } = await searchParams;

  // Create a server-side QueryClient for prefetching
  const queryClient = new QueryClient()
  
  // Get org first for access control
  const { data: org, error } = await getCachedOrg(orgSlug)
  
  if (error || !org) {
    notFound()
  }

  // Prefetch venues and promoters data on the server
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.venuesWithCounts(orgSlug),
      queryFn: async () => {
        const { data: venues } = await getCachedOrgVenuesWithCounts(org.id)
        return venues || []
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ['promoters', orgSlug],
      queryFn: async () => {
        const { data: promoters } = await getCachedPromoters(org.id)
        return promoters || []
      },
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <VenuesPageClient orgSlug={orgSlug} orgId={org.id} view={view} />
    </HydrationBoundary>
  )
}
