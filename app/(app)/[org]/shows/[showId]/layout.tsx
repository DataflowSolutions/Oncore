import { getSupabaseServer } from '@/lib/supabase/server'
import { getShowTabLinks } from '../constants/show-navlinks'
import Link from 'next/link'
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

  const showNavLinks = getShowTabLinks(orgSlug, showId)

  return (
    <div className="space-y-6">
      {/* Show-specific navigation */}
      <div className="border-b">
        <div className="flex space-x-8 overflow-x-auto">
          {showNavLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.id}
                href={link.href}
                className="inline-flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 border-transparent hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  )
}