'use client'

import { AddMemberButton, InviteCollaboratorButton } from '@/components/billing/LimitGuards'

interface TeamActionsProps {
  orgId: string
}

export function TeamActions({ orgId }: TeamActionsProps) {
  const handleAddMember = () => {
    console.log('Add member clicked - would open invite form')
    // TODO: Implement actual add member functionality
  }

  const handleInviteCollaborator = () => {
    console.log('Invite collaborator clicked - would open invite form')
    // TODO: Implement actual invite collaborator functionality
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
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