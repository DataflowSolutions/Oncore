import { CalendarDays, MapPin } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { ShowDetailRecord, VenueContact } from '../types'
import { formatDate, formatTime } from '../utils'

interface ShowOverviewCardProps {
  show: ShowDetailRecord
  contacts: VenueContact[]
}

export function ShowOverviewCard({ show, contacts }: ShowOverviewCardProps) {
  const locationLabel = show.venue?.city || show.venue?.country
    ? [show.venue?.city, show.venue?.country].filter(Boolean).join(', ')
    : 'TBD'
  const capacityValue = show.venue?.capacity ?? null
  const capacityLabel =
    typeof capacityValue === 'number' && !Number.isNaN(capacityValue)
      ? `${capacityValue.toLocaleString()} cap`
      : 'Unknown'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-4 w-4" />
          Show Overview
        </CardTitle>
        <CardDescription>Key details for this performance</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Date</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{formatDate(show.date)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Venue</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{show.venue?.name ?? 'TBD'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Doors</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{formatTime(show.doors_at)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Set Time</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{formatTime(show.set_time)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Location</dt>
            <dd className="mt-1 text-sm text-foreground">{locationLabel}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Capacity</dt>
            <dd className="mt-1 text-sm text-foreground">{capacityLabel}</dd>
          </div>
        </dl>

        {show.venue?.address && (
          <div className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4" />
            <span>{show.venue.address}</span>
          </div>
        )}

        {contacts.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-foreground">Venue Contacts</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {contacts.map((contact, index) => (
                <li key={`${contact.email ?? contact.phone ?? index}`} className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {contact.name ?? 'Contact'}
                    {contact.role ? ` • ${contact.role}` : ''}
                  </span>
                  <span className="text-muted-foreground">
                    {[contact.email, contact.phone].filter(Boolean).join(' • ') || 'No contact info'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
