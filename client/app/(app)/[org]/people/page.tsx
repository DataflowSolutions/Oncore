import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCachedOrg, getCachedOrgPeopleFull, getCachedAvailableSeats, getCachedOrgInvitations } from '@/lib/cache'
import { notFound } from 'next/navigation'
import { PeoplePageClient } from './people-page-client'

interface TeamPageProps {
  params: Promise<{ org: string }>
  searchParams: Promise<{ filter?: string }>
}

// Server Component - prefetches data for instant load
export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const { org: orgSlug } = await params
  const { filter } = await searchParams
  
  // Create a server-side QueryClient for prefetching
  const queryClient = new QueryClient()
  
  // Get org first for access control
  const { data: org, error } = await getCachedOrg(orgSlug)
  
  if (error || !org) {
    notFound()
  }
  
  // Prefetch all people data on the server
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.peopleFull(orgSlug),
      queryFn: async () => {
        const { data: people } = await getCachedOrgPeopleFull(org.id)
        return people || []
      },
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.invitations(orgSlug),
      queryFn: async () => {
        const { data: invitations } = await getCachedOrgInvitations(org.id)
        return invitations || []
      },
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.seats(orgSlug),
      queryFn: async () => {
        const seatInfo = await getCachedAvailableSeats(org.id)
        return seatInfo
      },
    }),
  ])
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PeoplePageClient orgSlug={orgSlug} filter={filter} />
    </HydrationBoundary>
  )
}