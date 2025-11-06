'use client'

import { useEffect } from 'react'
import { Section } from './Section'
import { PartyToggle } from './PartyToggle'
import { useAdvancingStore } from '@/lib/stores/advancing-store'

interface TeamMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  member_type: string | null
  duty?: string
}

interface GridData {
  id: string
  [key: string]: string | number | boolean
}

interface AdvancingField {
  id: string
  section: string
  field_name: string
  field_type: string
  value: unknown
  status: 'pending' | 'confirmed'
  party_type: 'from_us' | 'from_you'
}

interface PartyData {
  team: TeamMember[]
  availablePeople: TeamMember[]
  fields: AdvancingField[]
  teamData: GridData[]
  arrivalFlightData: GridData[]
  departureFlightData: GridData[]
}

interface ShowData {
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

interface AdvancingPageClientProps {
  initialParty: 'from_us' | 'from_you'
  show: ShowData
  orgSlug: string
  sessionId: string
  artistData: PartyData
  promoterData: PartyData
  basePath: string
}

export function AdvancingPageClient({
  initialParty,
  show,
  orgSlug,
  sessionId,
  artistData,
  promoterData,
  basePath,
}: AdvancingPageClientProps) {
  const { party, setParty, setArtistData, setPromoterData, getCurrentData } = useAdvancingStore()

  // Initialize store on mount
  useEffect(() => {
    setParty(initialParty)
    setArtistData(artistData)
    setPromoterData(promoterData)
  }, [initialParty, artistData, promoterData, setParty, setArtistData, setPromoterData])

  const currentData = getCurrentData()

  if (!currentData) {
    return <div className="container mx-auto p-6">Loading...</div>
  }

  // Group fields by section
  type FieldsArray = Array<AdvancingField>
  
  const fieldsBySection = currentData.fields.reduce((acc, field) => {
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
              <h1 className="text-xl font-semibold text-neutral-100">{show.title}</h1>
              <p className="text-sm text-neutral-400">
                {show.venues.name} • {new Date(show.date).toLocaleDateString()}
              </p>
            </div>
            <PartyToggle current={party} basePath={basePath} />
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
                  showId={show.id}
                  availablePeople={currentData.availablePeople}
                  currentTeam={currentData.team}
                  teamData={currentData.teamData}
                  arrivalFlightData={currentData.arrivalFlightData}
                  departureFlightData={currentData.departureFlightData}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
