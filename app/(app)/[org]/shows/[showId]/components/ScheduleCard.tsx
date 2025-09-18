import { Clock } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { ScheduleItem } from '../types'
import { formatScheduleRange } from '../utils'

interface ScheduleCardProps {
  items: ScheduleItem[]
}

export function ScheduleCard({ items }: ScheduleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-4 w-4" />
          Schedule
        </CardTitle>
        <CardDescription>Key times for the day</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-md border border-muted bg-card/50 p-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{formatScheduleRange(item.starts_at, item.ends_at)}</p>
                  {(item.location || item.notes) && (
                    <p className="text-xs text-muted-foreground">
                      {[item.location, item.notes].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No schedule items yet. Add key timings to keep everyone aligned.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
