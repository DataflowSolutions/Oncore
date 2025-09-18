import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import type { ShowDetailRecord } from '../types'
import { formatDate, statusLabel, statusVariant } from '../utils'

interface ShowDetailHeaderProps {
  orgSlug: string
  show: ShowDetailRecord
}

export function ShowDetailHeader({ orgSlug, show }: ShowDetailHeaderProps) {
  return (
    <>
      <Link
        href={`/${orgSlug}/shows`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shows
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {show.title ?? 'Untitled Show'}
            </h1>
            <Badge variant={statusVariant[show.status]}>{statusLabel[show.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {show.artist?.name ? `${show.artist.name} • ` : ''}
            {formatDate(show.date)}
          </p>
        </div>
      </div>
    </>
  )
}
