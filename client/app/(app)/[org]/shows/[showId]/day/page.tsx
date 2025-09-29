import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Music, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getScheduleItemsForShow } from '@/lib/actions/schedule'
import { DayScheduleView } from '@/components/shows/DayScheduleView'
import { ScheduleManager } from '@/components/shows/ScheduleManager'

interface ShowDayPageProps {
  params: Promise<{ org: string, showId: string }>
}

export default async function ShowDayPage({
  params
}: ShowDayPageProps) {
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

  // Get schedule items for this show with person assignments
  const scheduleItems = await getScheduleItemsForShow(showId)
  
  // Get people assigned to this show for person-specific scheduling
  const { data: assignedPeople } = await supabase
    .from('show_assignments')
    .select(`
      person_id,
      duty,
      people (
        id,
        name,
        member_type
      )
    `)
    .eq('show_id', showId)

  const showDate = new Date(show.date)
  const today = new Date()
  const isToday = showDate.toDateString() === today.toDateString()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${orgSlug}/shows/${showId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Show Details
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{show.title || 'Untitled Show'} - Day Schedule</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {showDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              {isToday && <Badge variant="default" className="ml-2">Today</Badge>}
            </div>
            
            {show.venues && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {show.venues.name}, {show.venues.city}
              </div>
            )}
            
            {show.artists && (
              <div className="flex items-center gap-1">
                <Music className="w-4 h-4" />
                {show.artists.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Show Key Times */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Show Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {show.doors_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Doors Open</p>
                <p className="text-lg font-semibold">
                  {new Date(show.doors_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            {show.set_time && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Set Time</p>
                <p className="text-lg font-semibold">
                  {new Date(show.set_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={show.status === 'confirmed' ? 'default' : 'secondary'}>
                {show.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Day Schedule View - Multi-Layer Timeline */}
      <DayScheduleView
        scheduleItems={scheduleItems}
        showDate={show.date}
        doorsAt={show.doors_at}
        setTime={show.set_time}
        assignedPeople={assignedPeople || []}
        userRole="viewer" // TODO: Get actual user role from session
      />

      {/* Schedule Management */}
      <ScheduleManager
        orgSlug={orgSlug}
        showId={showId}
        showDate={show.date}
        scheduleItems={scheduleItems}
        assignedPeople={assignedPeople || []}
      />
    </div>
  )
}