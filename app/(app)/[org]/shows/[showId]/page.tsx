import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Music, Users } from 'lucide-react'
import Link from 'next/link'
import { getScheduleItemsForShow } from '@/lib/actions/schedule'
import { ScheduleManager } from '@/components/shows/ScheduleManager'

interface ShowDetailPageProps {
  params: Promise<{ org: string, showId: string }>
}

export default async function ShowDetailPage({
  params
}: ShowDetailPageProps) {
  const { org: orgSlug, showId } = await params
  
  const supabase = await getSupabaseServer()
  
  // Get organization and show details
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return <div>Organization not found</div>
  }

  const { data: show } = await supabase
    .from('shows')
    .select(`
      id, 
      title, 
      date, 
      doors_at, 
      set_time, 
      status, 
      notes,
      venues (
        id,
        name,
        address,
        city,
        country,
        capacity
      ),
      artists (
        name
      )
    `)
    .eq('id', showId)
    .eq('org_id', org.id)
    .single()

  if (!show) {
    return <div>Show not found</div>
  }

  // Get schedule items for this show
  const scheduleItems = await getScheduleItemsForShow(showId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <Link 
            href={`/${orgSlug}/shows`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Shows
          </Link>
        </div>
        <h1 className="text-3xl font-bold">{show.title || 'Untitled Show'}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={show.status === 'confirmed' ? 'default' : 'secondary'}>
            {show.status}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link 
          href={`/${orgSlug}/shows/${showId}/day`}
          className="inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Day Schedule
        </Link>
        <Link 
          href={`/${orgSlug}/shows/${showId}/team`}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors"
        >
          <Users className="w-4 h-4" />
          Manage Team
        </Link>
        <Link 
          href={`/${orgSlug}/advancing?show=${showId}`}
          className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md transition-colors"
        >
          <Music className="w-4 h-4" />
          Advancing
        </Link>
      </div>

      {/* Show Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold">Date</p>
              <p className="text-muted-foreground">
                {new Date(show.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            {show.doors_at && (
              <div>
                <p className="font-semibold">Doors</p>
                <p className="text-muted-foreground">
                  {new Date(show.doors_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            {show.set_time && (
              <div>
                <p className="font-semibold">Set Time</p>
                <p className="text-muted-foreground">
                  {new Date(show.set_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Venue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Venue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {show.venues ? (
              <>
                <div>
                  <Link 
                    href={`/${orgSlug}/venues/${show.venues.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {show.venues.name}
                  </Link>
                </div>
                {show.venues.address && (
                  <div>
                    <p className="text-muted-foreground">{show.venues.address}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">
                    {show.venues.city}{show.venues.country && `, ${show.venues.country}`}
                  </p>
                </div>
                {show.venues.capacity && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Capacity: {show.venues.capacity}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No venue set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Artist */}
      {show.artists && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Artist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{show.artists.name}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {show.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{show.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Schedule */}
      <ScheduleManager
        orgSlug={orgSlug}
        showId={showId}
        showDate={show.date}
        scheduleItems={scheduleItems}
      />
    </div>
  )
}