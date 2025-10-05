import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Music, Users, ArrowLeft, FileText } from 'lucide-react'
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
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="space-y-4">
        <Link href={`/${orgSlug}/shows`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Shows
          </Button>
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold">{show.title || 'Untitled Show'}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge 
                variant={show.status === 'confirmed' ? 'default' : 'secondary'}
                className="text-sm px-3 py-1"
              >
                {show.status}
              </Badge>
              {show.date && (
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(show.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>
          
          {/* Primary Actions */}
          <div className="flex gap-2 flex-wrap">
            <Link href={`/${orgSlug}/shows/${showId}/day`}>
              <Button size="lg" className="gap-2">
                <Calendar className="w-5 h-5" />
                Day Schedule
              </Button>
            </Link>
            <Link href={`/${orgSlug}/shows/${showId}/team`}>
              <Button size="lg" variant="outline" className="gap-2">
                <Users className="w-5 h-5" />
                Team
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Show Details - Simplified Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venue - Most Important */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Venue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {show.venues ? (
              <div className="space-y-4">
                <div>
                  <Link 
                    href={`/${orgSlug}/venues/${show.venues.id}`}
                    className="text-2xl font-bold text-primary hover:underline"
                  >
                    {show.venues.name}
                  </Link>
                </div>
                <div className="flex flex-col gap-2 text-muted-foreground">
                  {show.venues.address && <p>{show.venues.address}</p>}
                  <p className="font-medium">
                    {show.venues.city}{show.venues.country && `, ${show.venues.country}`}
                  </p>
                  {show.venues.capacity && (
                    <Badge variant="outline" className="w-fit">
                      Capacity: {show.venues.capacity}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No venue set</p>
            )}
          </CardContent>
        </Card>

        {/* Time Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {show.doors_at && (
              <div>
                <p className="text-sm text-muted-foreground">Doors</p>
                <p className="text-xl font-bold">
                  {new Date(show.doors_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            {show.set_time && (
              <div>
                <p className="text-sm text-muted-foreground">Set Time</p>
                <p className="text-xl font-bold">
                  {new Date(show.set_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            {!show.doors_at && !show.set_time && (
              <p className="text-muted-foreground">Times TBD</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Artist */}
      {show.artists && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Music className="w-5 h-5" />
              Artist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{show.artists.name}</p>
          </CardContent>
        </Card>
      )}

      {/* Schedule - Most Important for Day-of */}
      <ScheduleManager
        orgSlug={orgSlug}
        showId={showId}
        showDate={show.date}
        scheduleItems={scheduleItems}
      />

      {/* Notes - Less Priority */}
      {show.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{show.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}