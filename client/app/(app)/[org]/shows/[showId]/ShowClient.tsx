'use client'

import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { TeamManagementModal } from '@/components/shows/TeamManagementModal'
import { useState } from 'react'
import type { PersonListItem } from '@/lib/actions/show-team'

interface ShowClientProps {
  showId: string
  assignedTeam: PersonListItem[]
  availablePeople: PersonListItem[]
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
