import { getSupabaseServer } from '@/lib/supabase/server'
import { getPeopleByOrg } from '@/lib/actions/team'
import PeoplePageClient from '@/components/team/PeoplePageClient'

interface ArtistPageProps {
  params: Promise<{ org: string }>
}

export default async function ArtistPage({ params }: ArtistPageProps) {
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

  // Get all people and filter for artists
  const allPeople = await getPeopleByOrg(org.id)
  const artistPeople = allPeople.filter(person => 
    person.member_type === 'Artist'
  )

  return <PeoplePageClient allPeople={artistPeople} />
}