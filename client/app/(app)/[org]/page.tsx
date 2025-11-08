import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCachedOrg, getCachedOrgShows } from '@/lib/cache'
import { notFound } from "next/navigation";
import { OrgPageClient } from './org-page-client';

interface OrgHomePageProps {
  params: Promise<{ org: string }>;
}

// Server Component - prefetches data for instant load
export default async function OrgHomePage({ params }: OrgHomePageProps) {
  const { org: orgSlug } = await params;

  // Create a server-side QueryClient for prefetching
  const queryClient = new QueryClient()
  
  // Get org first for access control
  const { data: org, error } = await getCachedOrg(orgSlug)

  if (error || !org) {
    notFound();
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
      <OrgPageClient orgSlug={orgSlug} orgName={org.name} />
    </HydrationBoundary>
  )
}
