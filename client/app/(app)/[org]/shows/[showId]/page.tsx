import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { ShowDetailPageClient } from './show-detail-page-client'
import { queryKeys } from '@/lib/query-keys'
import { getShowTeam, getAvailablePeople } from '@/lib/actions/show-team'
import { getVenuesByOrg } from '@/lib/actions/shows'

// Always render dynamically for authenticated pages
// React cache() handles request-level deduplication
export const dynamic = 'force-dynamic'

interface ShowDetailPageProps {
  params: Promise<{ org: string, showId: string }>
}

export default async function ShowDetailPage({
  params
}: ShowDetailPageProps) {
  const { org: orgSlug, showId } = await params
  
  // OPTIMIZED: Use cached helpers to prevent redundant queries
  const { getCachedOrg, getCachedShow, getCachedShowSchedule } = await import('@/lib/cache')
  
  // Create a new QueryClient for this request
  const queryClient = new QueryClient()
  
  // Fetch org first (needed for validation and other queries)
  const { data: org } = await getCachedOrg(orgSlug)
  
  if (!org) {
    return <div>Organization not found</div>
  }

  // Prefetch all show detail data in parallel
  await Promise.all([
    // Prefetch show with venue
    queryClient.prefetchQuery({
      queryKey: queryKeys.showWithVenue(showId),
      queryFn: async () => {
        const { data: show } = await getCachedShow(showId)
        if (!show || show.org_id !== org.id) {
          throw new Error('Show not found')
        }
        return show
      },
    }),
    
    // Prefetch schedule
    queryClient.prefetchQuery({
      queryKey: queryKeys.showSchedule(showId),
      queryFn: async () => {
        const { data: scheduleItems } = await getCachedShowSchedule(showId)
        return scheduleItems || []
      },
    }),
    
    // Prefetch team data
    queryClient.prefetchQuery({
      queryKey: queryKeys.showTeam(showId),
      queryFn: async () => {
        const assignedTeam = await getShowTeam(showId)
        const availablePeople = await getAvailablePeople(org.id)
        return { assignedTeam, availablePeople }
      },
    }),
    
    // Prefetch venues
    queryClient.prefetchQuery({
      queryKey: queryKeys.venues(orgSlug),
      queryFn: async () => {
        return await getVenuesByOrg(org.id)
      },
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShowDetailPageClient orgSlug={orgSlug} showId={showId} />
    </HydrationBoundary>
  )
}