import { getSupabaseServer } from '@/lib/supabase/server'
import { getPeopleByOrg } from '@/lib/actions/team'
import PeoplePageClient from '@/components/team/PeoplePageClient'

interface ArtistPageProps {
  params: Promise<{ org: string }>
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { org: orgSlug } = await params
  
  const supabase = await getSupabaseServer()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc('get_org_by_slug', {
    p_slug: orgSlug
  })

  if (!org) {
    return <div>Organization not found</div>
  }

  const allPeople = await getPeopleByOrg(org.id)

  // Filter for artists (lowercase enum value)
  const artistPeople = allPeople.filter(person => 
    person.member_type === 'artist'
  )

  return (
    <PeoplePageClient 
      allPeople={artistPeople}
    />
  )
}
