'use client'

import { usePeople, useInvitations, useAvailableSeats } from '@/lib/hooks/use-people'
import PeoplePageContent from '@/components/team/PeoplePageClient'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemo } from 'react'

export function PeoplePageClient({ 
  orgSlug,
  filter
}: { 
  orgSlug: string
  filter?: string
}) {
  console.log('PeoplePageClient rendering with:', { orgSlug, filter })
  
  // Use prefetched data - instant load!
  const { data: allPeople = [], isLoading: peopleLoading, error: peopleError } = usePeople(orgSlug)
  const { data: invitations = [] } = useInvitations(orgSlug)
  const { data: seatInfo } = useAvailableSeats(orgSlug)
  
  console.log('PeoplePageClient data:', { allPeople, invitations, seatInfo, peopleError })
  
  // Filter people based on URL parameter (client-side)
  const filteredPeople = useMemo(() => {
    if (!filter || filter === 'all') return allPeople
    return allPeople.filter(person => 
      person.member_type?.toLowerCase() === filter.toLowerCase()
    )
  }, [allPeople, filter])
  
  // Count by type for filters
  const counts = useMemo(() => ({
    all: allPeople.length,
    artist: allPeople.filter(p => p.member_type === 'Artist').length,
    crew: allPeople.filter(p => p.member_type === 'Crew').length,
    agent: allPeople.filter(p => p.member_type === 'Agent').length,
    manager: allPeople.filter(p => p.member_type === 'Manager').length,
  }), [allPeople])
  
  if (peopleError) {
    return (
      <div className="space-y-4">
        <div className="text-destructive">
          Error loading people: {peopleError.message}
        </div>
      </div>
    )
  }
  
  // Show loading skeleton only on initial load without prefetch
  if (peopleLoading && !allPeople.length) {
    return <PeoplePageSkeleton />
  }
  
  return (
    <div className="space-y-6">
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
      
      <PeoplePageContent 
        allPeople={filteredPeople} 
        seatInfo={seatInfo ?? null}
        invitations={invitations}
      />
    </div>
  )
}

function PeoplePageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}
