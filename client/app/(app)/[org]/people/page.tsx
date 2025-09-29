import { getSupabaseServer } from '@/lib/supabase/server'
import { getPeopleByOrg } from '@/lib/actions/team'
import PeoplePageClient from '@/components/team/PeoplePageClient'

interface TeamPageProps {
  params: Promise<{ org: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { org: orgSlug } = await params
  
  const supabase = await getSupabaseServer()
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return <div>Organization not found</div>
  }

  // Get all people
  const allPeople = await getPeopleByOrg(org.id)

  return <PeoplePageClient allPeople={allPeople} />
}