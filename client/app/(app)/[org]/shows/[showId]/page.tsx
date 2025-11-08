import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Music, ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { ScheduleManager } from '@/components/shows/ScheduleManager'
import { getShowTeam, getAvailablePeople } from '@/lib/actions/show-team'
import { ShowClient } from './ShowClient'
import { getVenuesByOrg } from '@/lib/actions/shows'
import { 
  EditableTitle, 
  EditableDate, 
  EditableTime, 
  EditableVenue, 
  EditableNotes 
} from '@/components/shows/EditableShowFields'

// Always render dynamically for authenticated pages
// React cache() handles request-level deduplication
export const dynamic = 'force-dynamic'

interface ShowDetailPageProps {
  params: Promise<{ org: string, showId: string }>
}

export default async function ShowDetailPage({
  params
}: ShowDetailPageProps) {
  const { org: orgSlug, showId } = await params
  
  // OPTIMIZED: Use cached helpers to prevent redundant queries
  const { getCachedOrg, getCachedShow, getCachedShowSchedule } = await import('@/lib/cache')
  
  // Parallelize ALL data fetching for maximum performance - single waterfall
  const [orgResult, showResult, scheduleResult, assignedTeam, venuesResult, availablePeopleResult] = await Promise.all([
    getCachedOrg(orgSlug),
    getCachedShow(showId),
    getCachedShowSchedule(showId),
    getShowTeam(showId),
    // Fetch org first, then use the ID - but still in parallel with Promise.all
    getCachedOrg(orgSlug).then(result => 
      result.data ? getVenuesByOrg(result.data.id) : []
    ),
    getCachedOrg(orgSlug).then(result => 
      result.data ? getAvailablePeople(result.data.id) : []
    )
  ]);

  const { data: org } = orgResult;
  const { data: show } = showResult;
  const { data: scheduleItems } = scheduleResult;
  const venues = venuesResult;
  const availablePeople = availablePeopleResult;

  if (!org) {
    return <div>Organization not found</div>
  }

  if (!show || show.org_id !== org.id) {
    return <div>Show not found</div>
  }

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="space-y-4">
        <Link href={`/${orgSlug}/shows`} prefetch={true}>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-accent">
            <ArrowLeft className="w-4 h-4" />
            Back to Shows
          </Button>
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <EditableTitle 
              showId={showId}
              currentValue={show.title || ''}
              className="text-4xl font-bold"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <Badge 
                variant={show.status === 'confirmed' ? 'default' : 'secondary'}
                className="text-sm px-3 py-1"
              >
                {show.status}
              </Badge>
              {show.date && (
                <EditableDate
                  showId={showId}
                  currentValue={show.date}
                  className="text-muted-foreground"
                />
              )}
            </div>
          </div>
          
          {/* Primary Actions */}
          <div className="flex gap-2 flex-wrap">
            <Link href={`/${orgSlug}/shows/${showId}/day`} prefetch={true}>
              <Button size="lg" className="gap-2">
                <Calendar className="w-5 h-5" />
                Day Schedule
              </Button>
            </Link>
            <ShowClient 
              showId={showId}
              assignedTeam={assignedTeam}
              availablePeople={availablePeople}
            />
            <Link href={`/${orgSlug}/shows/${showId}/advancing`} prefetch={true}>
              <Button size="lg" variant="outline" className="gap-2">
                <FileText className="w-5 h-5" />
                Advancing
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
                <EditableVenue
                  showId={showId}
                  currentVenueId={show.venues.id}
                  venues={venues}
                />
                {show.venues.capacity && (
                  <Badge variant="outline" className="w-fit">
                    Capacity: {show.venues.capacity}
                  </Badge>
                )}
              </div>
            ) : (
              <EditableVenue
                showId={showId}
                currentVenueId={null}
                venues={venues}
              />
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
            <EditableTime
              showId={showId}
              currentValue={show.doors_at}
              fieldName="doors_at"
              label="Doors"
            />
            <EditableTime
              showId={showId}
              currentValue={show.set_time}
              fieldName="set_time"
              label="Set Time"
            />
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
        scheduleItems={scheduleItems || []}
      />

      {/* Notes - Less Priority */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditableNotes
            showId={showId}
            currentValue={show.notes}
          />
        </CardContent>
      </Card>
    </div>
  )
}