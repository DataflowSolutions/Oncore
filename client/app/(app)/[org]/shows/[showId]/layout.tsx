import { notFound } from 'next/navigation'
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

interface ShowLayoutProps {
  children: React.ReactNode
  params: Promise<{ org: string, showId: string }>
}

export default async function ShowLayout({ children, params }: ShowLayoutProps) {
  const { org: orgSlug, showId } = await params
  
  // OPTIMIZED: Use cached helpers to prevent redundant queries
  const { getCachedOrg, getCachedShow } = await import('@/lib/cache')
  
  // Parallelize verification queries
  const [orgResult, showResult] = await Promise.all([
    getCachedOrg(orgSlug),
    getCachedShow(showId)
  ])

  const { data: org } = orgResult
  const { data: show } = showResult

  if (!org) {
    notFound()
  }

  if (!show || show.org_id !== org.id) {
    notFound()
  }

  // Prefetch show data for TanStack Query (used by Sidebar)
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.show(showId),
    queryFn: async () => show, // Use already-fetched data
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  )
}