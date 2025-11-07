'use client'
import { logger } from '@/lib/logger'

import { AddMemberButton, InviteCollaboratorButton } from '@/components/billing/LimitGuards'
import AddPersonButton from '@/app/(app)/[org]/people/components/AddPersonButton'

interface TeamActionsProps {
  orgId: string
}

export function TeamActions({ orgId }: TeamActionsProps) {
  const handleAddMember = () => {
    logger.debug('Add member clicked - would open invite form')
    // TODO: Implement actual add member functionality
  }

  const handleInviteCollaborator = () => {
    logger.debug('Invite collaborator clicked - would open invite form')
    // TODO: Implement actual invite collaborator functionality
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <AddPersonButton orgId={orgId} />
      <AddMemberButton 
        orgId={orgId}
        onAdd={handleAddMember}
      />
      <InviteCollaboratorButton 
        orgId={orgId}
        onInvite={handleInviteCollaborator}
      />
    </div>
  )
}