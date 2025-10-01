'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Users, Plane, PlaneLanding } from 'lucide-react'
import { FieldRow } from './FieldRow'
import { GRID_CONFIGS } from './constants/grid-config'
import { SaveableGridEditor } from './SaveableGridEditor'
import { AddTeamMemberModal } from './AddTeamMemberModal'
import { TeamMembersGrid } from './TeamMembersGrid'
import { assignPersonToShow, removePersonFromShow } from '@/lib/actions/show-team'

interface SectionProps {
  title: string
  fields: Array<{
    id: string
    section: string
    field_name: string
    field_type: string
    value: unknown
    status: 'pending' | 'confirmed'
    party_type: 'from_us' | 'from_you'
  }>
  orgSlug: string
  sessionId: string
  showId?: string
  availablePeople?: Array<{
    id: string
    name: string
    email: string | null
    phone: string | null
    member_type: string | null
  }>
  currentTeam?: Array<{
    id: string
    name: string
    email: string | null
    phone: string | null
    member_type: string | null
    duty?: string
  }>
  defaultExpanded?: boolean
  teamData?: Array<{ id: string; [key: string]: string | number | boolean }>
  arrivalFlightData?: Array<{ id: string; [key: string]: string | number | boolean }>
  departureFlightData?: Array<{ id: string; [key: string]: string | number | boolean }>
}

export function Section({ title, fields, orgSlug, sessionId, showId, availablePeople = [], currentTeam = [], defaultExpanded = true, teamData = [], arrivalFlightData = [], departureFlightData = [] }: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  


  const handleAddTeamMembers = async (newMembers: Array<{
    id: string
    name: string
    email: string | null
    phone: string | null
    role: string | null
  }>) => {

    
    if (!showId) {
      console.error('No showId provided for assignment')
      return
    }

    // Assign each person to the show
    for (const member of newMembers) {
      try {
        const formData = new FormData()
        formData.append('showId', showId)
        formData.append('personId', member.id)
        formData.append('duty', member.role || '')

        await assignPersonToShow(formData)

      } catch (error) {
        console.error('Error assigning person to show:', error)
      }
    }
    
    // Close the modal - the server action will handle revalidation
    setShowAddMemberModal(false)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUnassignTeamMember = async (personId: string, _personName: string) => {
    if (!showId) {
      console.error('No showId provided for unassignment')
      return
    }

    try {
      await removePersonFromShow(showId, personId)
      
      // The server action will handle revalidation
      console.log('Person removed from show successfully')
    } catch (error) {
      console.error('Error unassigning person from show:', error)
    }
  }



  // Special handling for "Team & Travel" as a container section
  if (title === 'Team & Travel') {
    return (
      <div className="space-y-4">
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 bg-neutral-900/50 cursor-pointer hover:bg-neutral-900/70 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-100">{title}</h3>
              <span className="text-xs text-neutral-500">
                0 comments
              </span>
              <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded">
                Pending
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            )}
          </div>
          
          {isExpanded && (
            <div className="p-6 space-y-4">
              {/* Single Add Team Member Button */}
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => {
                    console.log('Add Team Member clicked')
                    setShowAddMemberModal(true)
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-black bg-white border border-transparent rounded-md hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-900"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Add Team Member
                </button>
              </div>

              {/* Team Members with Unassign functionality */}
              <TeamMembersGrid
                title="Team Info"
                teamMembers={currentTeam}
                onUnassign={handleUnassignTeamMember}
              />

              {/* Team Grid - Saveable */}
              <SaveableGridEditor
                title={GRID_CONFIGS.team.title}
                gridType="team"
                columns={[...GRID_CONFIGS.team.columns]}
                data={teamData.length > 0 ? teamData : currentTeam.map(member => ({
                  id: `team_${member.id}`,
                  rooming: '',
                  luggage: '',
                  visa: '',
                  passport: '',
                  credentials: ''
                }))}
                onDataChange={(newData) => {
                  console.log('Team data changed:', newData)
                }}
                hideAddButton={true}
                orgSlug={orgSlug}
                sessionId={sessionId}
                showId={showId}
              />

              {/* Arrival Flight Grid - Saveable */}
              <SaveableGridEditor
                title={GRID_CONFIGS.arrivalFlight.title}
                gridType="arrival_flight"
                icon={<PlaneLanding className="w-4 h-4" />}
                columns={[...GRID_CONFIGS.arrivalFlight.columns]}
                data={arrivalFlightData.length > 0 ? arrivalFlightData : currentTeam.map(member => ({
                  id: `arrival_flight_${member.id}`,
                  flightNumber: '',
                  departureTime: '',
                  departureDate: '',
                  fromCity: '',
                  arrivalTime: '',
                  arrivalDate: '',
                  toCity: ''
                }))}
                onDataChange={(newData) => {
                  console.log('Arrival Flight data changed:', newData)
                }}
                hideAddButton={true}
                orgSlug={orgSlug}
                sessionId={sessionId}
                showId={showId}
              />

              {/* Departure Flight Grid - Saveable */}
              <SaveableGridEditor
                title={GRID_CONFIGS.departureFlight.title}
                gridType="departure_flight"
                icon={<Plane className="w-4 h-4" />}
                columns={[...GRID_CONFIGS.departureFlight.columns]}
                data={departureFlightData.length > 0 ? departureFlightData : currentTeam.map(member => ({
                  id: `departure_flight_${member.id}`,
                  flightNumber: '',
                  departureTime: '',
                  departureDate: '',
                  fromCity: '',
                  arrivalTime: '',
                  arrivalDate: '',
                  toCity: ''
                }))}
                onDataChange={(newData) => {
                  console.log('Departure Flight data changed:', newData)
                }}
                hideAddButton={true}
                orgSlug={orgSlug}
                sessionId={sessionId}
                showId={showId}
              />
            </div>
          )}
        </div>

        {/* Add Team Member Modal */}
        <AddTeamMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onAddMembers={handleAddTeamMembers}
          availablePeople={availablePeople.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            role: p.member_type
          }))}
          existingMemberIds={currentTeam.map(m => m.id)}
        />
      </div>
    )
  }

  if (fields.length === 0) return null

  // Regular section layout for non-grid sections
  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-neutral-900/50 hover:bg-neutral-900 transition-colors"
      >
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">
            {fields.filter(f => f.status === 'confirmed').length} / {fields.length}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="divide-y divide-neutral-800">
          {fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              orgSlug={orgSlug}
              sessionId={sessionId}
              showId={showId}
              comments={[]} // TODO: Load comments for each field
              onFieldUpdate={() => {
                // Let the server action handle revalidation
                console.log('Field updated successfully')
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}