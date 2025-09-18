import Link from 'next/link'
import { FileText, Users } from 'lucide-react'

import { InviteCollaboratorButton } from '@/components/billing/LimitGuards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CollaborationCardProps {
  orgId: string
  showId: string
  orgSlug: string
}

export function CollaborationCard({ orgId, showId, orgSlug }: CollaborationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-4 w-4" />
          Collaboration
        </CardTitle>
        <CardDescription>Invite partners and access advancing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <InviteCollaboratorButton orgId={orgId} showId={showId} />
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href={`/${orgSlug}/advancing`} className="flex w-full items-center justify-between">
            <span>View Advancing Sessions</span>
            <FileText className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
