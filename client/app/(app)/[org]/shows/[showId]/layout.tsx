import { notFound } from 'next/navigation'

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

  return (
    <div>
      {/* Page content - navigation is now handled by the sidebar */}
      {children}
    </div>
  )
}