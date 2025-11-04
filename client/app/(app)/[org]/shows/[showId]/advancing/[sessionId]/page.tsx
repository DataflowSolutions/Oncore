import { getAdvancingSession, getAdvancingFields, loadAdvancingGridData } from '@/lib/actions/advancing'
import { getAvailablePeople, getShowTeam } from '@/lib/actions/show-team'
import { Section } from '@/components/advancing/Section'
import { PartyToggle } from '@/components/advancing/PartyToggle'
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

  // Get fields
  const fields = await getAdvancingFields(sessionId)

  // Get organization ID for fetching people
  const supabase = await getSupabaseServer()
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  // Get available people from the organization and current show team, filtered by party
  const availablePeople = org ? await getAvailablePeople(org.id, party) : []
  const showTeam = await getShowTeam(sessionWithShow.shows.id, party)

  // Load existing grid data for team and flight information
  const teamMemberIds = showTeam.map(member => member.id)
  const teamData = await loadAdvancingGridData(
    sessionId,
    'team',
    teamMemberIds
  )
  const arrivalFlightData = await loadAdvancingGridData(
    sessionId,
    'arrival_flight',
    teamMemberIds
  )
  const departureFlightData = await loadAdvancingGridData(
    sessionId,
    'departure_flight',
    teamMemberIds
  )

  // Filter by party type
  const partyFields = fields.filter(f => f.party_type === party)

  // Group fields by section
  type FieldsArray = Array<{
    id: string
    section: string
    field_name: string
    field_type: string
    value: unknown
    status: 'pending' | 'confirmed'
    party_type: 'from_us' | 'from_you'
  }>
  
  const fieldsBySection = partyFields.reduce((acc, field) => {
    const section = field.section || 'General'
    if (!acc[section]) {
      acc[section] = []
    }
    acc[section].push(field)
    return acc
  }, {} as Record<string, FieldsArray>)

  // Add default sections for grid display if they don't exist
  const defaultSections = ['Team & Travel']
  defaultSections.forEach(section => {
    if (!fieldsBySection[section]) {
      fieldsBySection[section] = []
    }
  })

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-neutral-100">{sessionWithShow.shows.title}</h1>
              <p className="text-sm text-neutral-400">
                {sessionWithShow.shows.venues.name} • {new Date(sessionWithShow.shows.date).toLocaleDateString()}
              </p>
            </div>
            <PartyToggle current={party} basePath={`/${orgSlug}/shows/${showId}/advancing/${sessionId}`} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="space-y-4">
          {/* Documents Section */}
          <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-neutral-100">Documents</h3>
                  <span className="text-xs text-neutral-500">
                    0 comments
                  </span>
                  <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded">
                    Pending
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-12 text-neutral-500">
                <p className="text-sm">No documents uploaded</p>
              </div>
            </div>
          </div>

          {/* Other Sections */}
          {Object.keys(fieldsBySection).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-400">No fields configured for this session yet.</p>
            </div>
          ) : (
            <>
              {Object.entries(fieldsBySection).map(([sectionName, sectionFields]) => (
                <Section
                  key={`${sectionName}-${party}`}
                  title={sectionName}
                  fields={sectionFields as FieldsArray}
                  orgSlug={orgSlug}
                  sessionId={sessionId}
                  showId={sessionWithShow.shows.id}
                  availablePeople={availablePeople}
                  currentTeam={showTeam}
                  teamData={teamData}
                  arrivalFlightData={arrivalFlightData}
                  departureFlightData={departureFlightData}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}