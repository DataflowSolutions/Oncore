import { getAdvancingSession, getAdvancingFields, loadAdvancingGridData } from '@/lib/actions/advancing'
import { getAvailablePeople, getShowTeam } from '@/lib/actions/show-team'
import { AdvancingPageClient } from '@/components/advancing/AdvancingPageClient'
import { getSupabaseServer } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

interface AdvancingSessionPageProps {
  params: Promise<{ org: string; showId: string; sessionId: string }>
  searchParams?: Promise<{ party?: 'from_us' | 'from_you' }>
}

export default async function AdvancingSessionPage({ params, searchParams }: AdvancingSessionPageProps) {
  // Disable caching to ensure fresh data on party changes
  noStore()
  
  const { org: orgSlug, showId, sessionId } = await params
  const searchParamsObj = await searchParams
  const party = searchParamsObj?.party || 'from_us'

  // Handle the "new" route case - this should not happen with proper routing
  if (sessionId === 'new') {
    return <div className="container mx-auto p-6">Invalid route - please use /advancing/new</div>
  }

  // Get session details
  const session = await getAdvancingSession(sessionId)
  if (!session) {
    return <div className="container mx-auto p-6">Session not found</div>
  }

  // Type assertion for session with show data
  const sessionWithShow = session as typeof session & {
    shows: {
      id: string
      title: string
      date: string
      venues: {
        name: string
        city: string
        address?: string
      }
      artists?: {
        name: string
      }[]
    }
  }

  // Get fields once (not filtered by party)
  const fields = await getAdvancingFields(sessionId)

  // Get organization ID for fetching people
  const supabase = await getSupabaseServer()
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  // Pre-fetch BOTH parties' data in parallel
  const [artistDataResult, promoterDataResult] = await Promise.all([
    // Artist team data
    Promise.all([
      org ? getAvailablePeople(org.id, 'from_us') : Promise.resolve([]),
      getShowTeam(sessionWithShow.shows.id, 'from_us'),
    ]).then(async ([availablePeople, showTeam]) => {
      const teamMemberIds = showTeam.map(member => member.id)
      const [teamData, arrivalFlightData, departureFlightData] = await Promise.all([
        loadAdvancingGridData(sessionId, 'team', teamMemberIds),
        loadAdvancingGridData(sessionId, 'arrival_flight', teamMemberIds),
        loadAdvancingGridData(sessionId, 'departure_flight', teamMemberIds),
      ])
      return {
        team: showTeam,
        availablePeople,
        fields: fields.filter(f => f.party_type === 'from_us'),
        teamData,
        arrivalFlightData,
        departureFlightData,
      }
    }),
    // Promoter team data
    Promise.all([
      org ? getAvailablePeople(org.id, 'from_you') : Promise.resolve([]),
      getShowTeam(sessionWithShow.shows.id, 'from_you'),
    ]).then(async ([availablePeople, showTeam]) => {
      const teamMemberIds = showTeam.map(member => member.id)
      const [teamData, arrivalFlightData, departureFlightData] = await Promise.all([
        loadAdvancingGridData(sessionId, 'team', teamMemberIds),
        loadAdvancingGridData(sessionId, 'arrival_flight', teamMemberIds),
        loadAdvancingGridData(sessionId, 'departure_flight', teamMemberIds),
      ])
      return {
        team: showTeam,
        availablePeople,
        fields: fields.filter(f => f.party_type === 'from_you'),
        teamData,
        arrivalFlightData,
        departureFlightData,
      }
    }),
  ])

  return (
    <AdvancingPageClient
      initialParty={party}
      show={sessionWithShow.shows}
      orgSlug={orgSlug}
      sessionId={sessionId}
      artistData={artistDataResult}
      promoterData={promoterDataResult}
      basePath={`/${orgSlug}/shows/${showId}/advancing/${sessionId}`}
    />
  )
}