import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCachedOrg, getCachedOrgPeopleFull } from '@/lib/cache'
import { notFound } from 'next/navigation'
import { PeoplePageClient } from './people-page-client'
import { logger } from '@/lib/logger'

interface TeamPageProps {
  params: Promise<{ org: string }>
  searchParams: Promise<{ filter?: string }>
}

// Server Component - prefetches data for instant load
export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const { org: orgSlug } = await params
  const { filter } = await searchParams
  
  logger.info('People page loading for org:', orgSlug)
  
  // Create a server-side QueryClient for prefetching
  const queryClient = new QueryClient()
  
  // Get org first for access control
  const { data: org, error } = await getCachedOrg(orgSlug)
  
  logger.info('Got org:', { org, error })
  
  if (error || !org) {
    logger.error('People page - org not found', { orgSlug, error })
    notFound()
  }
  
  // Prefetch all people data on the server
  logger.info('Starting prefetch for people page')
  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.peopleFull(orgSlug),
        queryFn: async () => {
          logger.info('Fetching people for org:', org.id)
          const { data: people, error } = await getCachedOrgPeopleFull(org.id)
          if (error) {
            logger.error('Error fetching people:', error)
          }
          logger.info('Got people:', people?.length || 0)
          return people || []
        },
      })
    ])
    logger.info('Prefetch complete, rendering page')
  } catch (error) {
    logger.error('Error prefetching people page data:', error)
    throw error // Re-throw to see what's actually failing
  }
  
  logger.info('About to return PeoplePageClient component')
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PeoplePageClient orgSlug={orgSlug} filter={filter} />
    </HydrationBoundary>
  )
}
