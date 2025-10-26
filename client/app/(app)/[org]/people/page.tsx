import { getSupabaseServer } from '@/lib/supabase/server'
import { getPeopleByOrg } from '@/lib/actions/team'
import { checkAvailableSeats, getOrgInvitations } from '@/lib/actions/invitations'
import PeoplePageClient from '@/components/team/PeoplePageClient'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface TeamPageProps {
  params: Promise<{ org: string }>
  searchParams: Promise<{ filter?: string }>
}

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const { org: orgSlug } = await params
  const { filter } = await searchParams
  
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

  // Filter people based on URL parameter
  const filteredPeople = filter && filter !== 'all'
    ? allPeople.filter(person => 
        person.member_type?.toLowerCase() === filter.toLowerCase()
      )
    : allPeople

  // Count by type for filters
  const counts = {
    all: allPeople.length,
    artist: allPeople.filter(p => p.member_type === 'Artist').length,
    crew: allPeople.filter(p => p.member_type === 'Crew').length,
    agent: allPeople.filter(p => p.member_type === 'Agent').length,
    manager: allPeople.filter(p => p.member_type === 'Manager').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">People</h1>
          <p className="text-muted-foreground mt-1">Team, artists, and contacts</p>
        </div>
        {/* <Link href={`/${orgSlug}/people/new`}>
          <Button size="lg">
            <UserPlus className="w-5 h-5" />
            Add Person
          </Button>
        </Link> */}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Link href={`/${orgSlug}/people`}>
          <Button 
            variant={!filter || filter === 'all' ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
          >
            All ({counts.all})
          </Button>
        </Link>
        <Link href={`/${orgSlug}/people?filter=artist`}>
          <Button 
            variant={filter === 'artist' ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
          >
            Artists ({counts.artist})
          </Button>
        </Link>
        <Link href={`/${orgSlug}/people?filter=crew`}>
          <Button 
            variant={filter === 'crew' ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
          >
            Crew ({counts.crew})
          </Button>
        </Link>
        <Link href={`/${orgSlug}/people?filter=agent`}>
          <Button 
            variant={filter === 'agent' ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
          >
            Agents ({counts.agent})
          </Button>
        </Link>
        <Link href={`/${orgSlug}/people?filter=manager`}>
          <Button 
            variant={filter === 'manager' ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
          >
            Managers ({counts.manager})
          </Button>
        </Link>
      </div>
      
      <PeoplePageClient 
        allPeople={filteredPeople} 
        seatInfo={seatInfo}
        invitations={invitations ?? []}
      />
    </div>
  )
}