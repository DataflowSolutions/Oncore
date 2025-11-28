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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc('get_org_by_slug', {
    p_slug: orgSlug
  })

  if (!org) {
    return <div>Organization not found</div>
  }

  // Get all people, seat info, and invitations in parallel
  const [allPeople, seatInfo, invitations] = await Promise.all([
    getPeopleByOrg(org.id),
    checkAvailableSeats(org.id),
    getOrgInvitations(org.id)
  ])

  // Filter for artists (lowercase enum value)
  const artistPeople = allPeople.filter(person => 
    person.member_type === 'artist'
  )

  return (
    <PeoplePageClient 
      allPeople={artistPeople}
      seatInfo={seatInfo}
      invitations={invitations ?? []}
    />
  )
}