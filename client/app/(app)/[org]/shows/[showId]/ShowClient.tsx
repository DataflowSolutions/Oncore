'use client'

import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { TeamManagementModal } from '@/components/shows/TeamManagementModal'
import { useState } from 'react'
import type { Database } from '@/lib/database.types'

type Person = Database['public']['Tables']['people']['Row']
type PersonWithDuty = Person & { duty?: string | null }

interface ShowClientProps {
  showId: string
  assignedTeam: PersonWithDuty[]
  availablePeople: Person[]
}

export function ShowClient({ showId, assignedTeam, availablePeople }: ShowClientProps) {
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  
  return (
    <>
      <Button 
        size="lg" 
        variant="outline" 
        className="gap-2"
        onClick={() => setIsTeamModalOpen(true)}
      >
        <Users className="w-5 h-5" />
        Team ({assignedTeam.length})
      </Button>

      <TeamManagementModal
        showId={showId}
        assignedTeam={assignedTeam}
        availablePeople={availablePeople}
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
      />
    </>
  )
}
