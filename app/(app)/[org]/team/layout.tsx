import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import TeamTabs from './components/TeamTabs'
import TeamSearch from './components/TeamSearch'
import AddPersonButton from './components/AddPersonButton'

interface TeamLayoutProps {
  children: React.ReactNode
  params: Promise<{ org: string }>
}

export default async function TeamLayout({ children, params }: TeamLayoutProps) {
  const { org: orgSlug } = await params
  
  // Get org info to verify it exists
  const supabase = await getSupabaseServer()
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    notFound()
  }

  return (
    <div className="mb-16 mt-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="mt-2 text-foreground/50">Manage your team members and external collaborators</p>
        </div>
        <AddPersonButton orgId={org.id} />
      </div>
      
      <TeamTabs orgSlug={orgSlug} />
      <TeamSearch placeholder="Search" />
      
      {children}
    </div>
  )
}