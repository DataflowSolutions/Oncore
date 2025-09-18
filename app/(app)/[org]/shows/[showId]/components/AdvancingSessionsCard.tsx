import Link from 'next/link'
import { FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { AdvancingSession } from '../types'
import { formatDate, formatDateTime } from '../utils'

interface AdvancingSessionsCardProps {
  sessions: AdvancingSession[]
  orgSlug: string
}

export function AdvancingSessionsCard({ sessions, orgSlug }: AdvancingSessionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-4 w-4" />
          Advancing Sessions
        </CardTitle>
        <CardDescription>Link into advancing workflows</CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length > 0 ? (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-3 rounded-md border border-muted bg-card/50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDateTime(session.created_at)}
                    {session.expires_at ? ` • Expires ${formatDate(session.expires_at.split('T')[0])}` : ''}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${orgSlug}/advancing/${session.id}`}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No advancing session yet. Create one to start collaborating with promoters.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
