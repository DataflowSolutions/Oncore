import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ShowsPageClient } from './shows-page-client'
import { getCachedOrg, getCachedOrgShows } from '@/lib/cache'
import { notFound } from 'next/navigation'

interface ShowsPageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ view?: string }>;
}

// Server Component - prefetches data for instant load
export default async function ShowsPage({
  params,
  searchParams,
}: ShowsPageProps) {
  const { org: orgSlug } = await params
  const { view = 'list' } = await searchParams
  
  // Create a server-side QueryClient for prefetching
  const queryClient = new QueryClient()
  
  // Get org first for access control
  const { data: org, error } = await getCachedOrg(orgSlug)
  
  if (error || !org) {
    notFound()
  }
  
  // Prefetch shows data on the server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.shows(orgSlug),
    queryFn: async () => {
      const { data: shows } = await getCachedOrgShows(org.id)
      return shows || []
    },
  })
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShowsPageClient orgSlug={orgSlug} orgId={org.id} view={view} />
    </HydrationBoundary>
  )
}
