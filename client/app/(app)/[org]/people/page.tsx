import PeoplePageClient from '@/components/team/PeoplePageClient'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Force dynamic to show loading state
export const dynamic = 'force-dynamic'

interface TeamPageProps {
  params: Promise<{ org: string }>
  searchParams: Promise<{ filter?: string }>
}

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const { org: orgSlug } = await params
  const { filter } = await searchParams
  
  // OPTIMIZED: Use cached helpers and parallelize all queries
  const { getCachedOrg, getCachedOrgPeopleFull, getCachedAvailableSeats, getCachedOrgInvitations } = await import('@/lib/cache');
  
  // First get org, then parallelize all other queries with org.id
  const orgResult = await getCachedOrg(orgSlug)
  const { data: org } = orgResult

  if (!org) {
    return <div>Organization not found</div>
  }

  // Parallelize all data fetching using org.id
  const [peopleResult, seatInfo, invitationsResult] = await Promise.all([
    getCachedOrgPeopleFull(org.id),
    getCachedAvailableSeats(org.id),
    getCachedOrgInvitations(org.id)
  ])

  const { data: allPeople } = peopleResult
  const { data: invitations } = invitationsResult

  // Filter people based on URL parameter
  const peopleList = allPeople || []
  const filteredPeople = filter && filter !== 'all'
    ? peopleList.filter(person => 
        person.member_type?.toLowerCase() === filter.toLowerCase()
      )
    : peopleList

  // Count by type for filters
  const counts = {
    all: peopleList.length,
    artist: peopleList.filter(p => p.member_type === 'Artist').length,
    crew: peopleList.filter(p => p.member_type === 'Crew').length,
    agent: peopleList.filter(p => p.member_type === 'Agent').length,
    manager: peopleList.filter(p => p.member_type === 'Manager').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
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