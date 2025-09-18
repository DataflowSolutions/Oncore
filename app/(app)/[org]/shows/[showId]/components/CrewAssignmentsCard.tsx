import { Users } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { AssignmentRecord } from '../types'

interface CrewAssignmentsCardProps {
  assignments: AssignmentRecord[]
}

export function CrewAssignmentsCard({ assignments }: CrewAssignmentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-4 w-4" />
          Crew Assignments
        </CardTitle>
        <CardDescription>Who&apos;s responsible for each role</CardDescription>
      </CardHeader>
      <CardContent>
        {assignments.length > 0 ? (
          <ul className="space-y-3">
            {assignments.map((assignment, index) => (
              <li key={assignment.person?.id ?? index} className="rounded-md border border-muted bg-card/50 p-3">
                <p className="text-sm font-medium text-foreground">{assignment.person?.name ?? 'Unassigned'}</p>
                <p className="text-xs text-muted-foreground">
                  {[assignment.duty, assignment.person?.role_title].filter(Boolean).join(' • ') || 'Role TBD'}
                </p>
                {(assignment.person?.email || assignment.person?.phone) && (
                  <p className="text-xs text-muted-foreground">
                    {[assignment.person?.email, assignment.person?.phone].filter(Boolean).join(' • ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Crew assignments haven&apos;t been added yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
