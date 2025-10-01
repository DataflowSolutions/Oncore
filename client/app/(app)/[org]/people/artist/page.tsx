import { getSupabaseServer } from '@/lib/supabase/server'
import { getPeopleByOrg } from '@/lib/actions/team'
import { checkAvailableSeats, getOrgInvitations } from '@/lib/actions/invitations'
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

  // Get all people, seat info, and invitations in parallel
  const [allPeople, seatInfo, invitations] = await Promise.all([
    getPeopleByOrg(org.id),
    checkAvailableSeats(org.id),
    getOrgInvitations(org.id)
  ])

  // Filter for artists
  const artistPeople = allPeople.filter(person => 
    person.member_type === 'Artist'
  )

  return (
    <PeoplePageClient 
      allPeople={artistPeople}
      seatInfo={seatInfo}
      invitations={invitations ?? []}
    />
  )
}