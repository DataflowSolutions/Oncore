import { getSupabaseServer } from '@/lib/supabase/server'
import { getPeopleByOrg } from '@/lib/actions/team'
import PeoplePageClient from '@/components/team/PeoplePageClient'

interface CrewPageProps {
  params: Promise<{ org: string }>
}

export default async function CrewPage({ params }: CrewPageProps) {
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

  // Get all people and filter for crew
  const allPeople = await getPeopleByOrg(org.id)
  const crewPeople = allPeople.filter(person => 
    person.member_type === 'Crew' || 
    person.member_type === 'Agent' || 
    person.member_type === 'Manager'
  )

  return <PeoplePageClient allPeople={crewPeople} />
}