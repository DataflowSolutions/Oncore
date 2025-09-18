import { Mail } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { CollaboratorRecord } from '../types'
import { formatDateTime } from '../utils'

interface CollaboratorsCardProps {
  collaborators: CollaboratorRecord[]
}

export function CollaboratorsCard({ collaborators }: CollaboratorsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-4 w-4" />
          Collaborators
        </CardTitle>
        <CardDescription>Promoters and partners on this show</CardDescription>
      </CardHeader>
      <CardContent>
        {collaborators.length > 0 ? (
          <ul className="space-y-3">
            {collaborators.map((collaborator) => (
              <li key={collaborator.id} className="rounded-md border border-muted bg-card/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{collaborator.email}</p>
                  <Badge variant="outline" className="capitalize">
                    {collaborator.role.replace('promoter_', '')}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {collaborator.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Invited {formatDateTime(collaborator.created_at)}
                  {collaborator.accepted_at ? ` • Accepted ${formatDateTime(collaborator.accepted_at)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No collaborators invited yet. Use the button above to bring promoters into the loop.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
