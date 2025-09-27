import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface ShowLayoutProps {
  children: React.ReactNode
  params: Promise<{ org: string, showId: string }>
}

export default async function ShowLayout({ children, params }: ShowLayoutProps) {
  const { org: orgSlug, showId } = await params
  
  const supabase = await getSupabaseServer()
  
  // Verify the show exists and belongs to the organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    notFound()
  }

  const { data: show } = await supabase
    .from('shows')
    .select('id, title, date')
    .eq('id', showId)
    .eq('org_id', org.id)
    .single()

  if (!show) {
    notFound()
  }



  return (
    <div>
      {/* Page content - navigation is now handled by the sidebar */}
      {children}
    </div>
  )
}