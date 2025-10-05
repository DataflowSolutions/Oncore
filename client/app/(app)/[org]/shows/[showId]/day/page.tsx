import { getSupabaseServer } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Music, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getScheduleItemsForShow } from '@/lib/actions/schedule'
import { CalendarDayView } from '@/components/shows/CalendarDayView'

interface ShowDayPageProps {
  params: Promise<{ org: string, showId: string }>
  searchParams: Promise<{ people?: string; date?: string }> // Comma-separated person IDs and date
}

export default async function ShowDayPage({
  params,
  searchParams
}: ShowDayPageProps) {
  const { org: orgSlug, showId } = await params
  const { people: selectedPeopleParam, date: dateParam } = await searchParams
  
  // Parse selected people from query params
  const selectedPeopleIds = selectedPeopleParam 
    ? selectedPeopleParam.split(',').filter(Boolean)
    : []

  // Parse date from query params (default to today)
  // Use UTC to avoid timezone issues with date-only strings
  let currentDate: Date
  if (dateParam) {
    // Parse as local date (YYYY-MM-DD) without timezone conversion
    const [year, month, day] = dateParam.split('-').map(Number)
    currentDate = new Date(year, month - 1, day)
    currentDate.setHours(0, 0, 0, 0)
  } else {
    currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
  }
  
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

  // Get advancing session for this show to fetch flight data
  const { data: advancingSession } = await supabase
    .from('advancing_sessions')
    .select('id')
    .eq('show_id', showId)
    .single()

  // Fetch advancing data (flight times) for the calendar
  let advancingData = undefined
  if (advancingSession && assignedPeople) {
    const { data: advancingFields } = await supabase
      .from('advancing_fields')
      .select('field_name, value')
      .eq('session_id', advancingSession.id)
      .or('field_name.like.arrival_flight_%,field_name.like.departure_flight_%')

    if (advancingFields) {
      const arrivalFlights: Array<{ personId: string; time: string; flightNumber: string; from: string; to: string }> = []
      const departureFlights: Array<{ personId: string; time: string; flightNumber: string; from: string; to: string }> = []

      assignedPeople.forEach(person => {
        // Extract arrival flight data
        const arrivalTime = advancingFields.find(f => f.field_name === `arrival_flight_${person.person_id}_arrivalTime`)
        const arrivalDate = advancingFields.find(f => f.field_name === `arrival_flight_${person.person_id}_arrivalDate`)
        const flightNumber = advancingFields.find(f => f.field_name === `arrival_flight_${person.person_id}_flightNumber`)
        const fromCity = advancingFields.find(f => f.field_name === `arrival_flight_${person.person_id}_fromCity`)
        const toCity = advancingFields.find(f => f.field_name === `arrival_flight_${person.person_id}_toCity`)

        if (arrivalTime?.value && arrivalDate?.value) {
          arrivalFlights.push({
            personId: person.person_id,
            time: `${arrivalDate.value}T${arrivalTime.value}`,
            flightNumber: String(flightNumber?.value || ''),
            from: String(fromCity?.value || ''),
            to: String(toCity?.value || '')
          })
        }

        // Extract departure flight data
        const departureTime = advancingFields.find(f => f.field_name === `departure_flight_${person.person_id}_departureTime`)
        const departureDate = advancingFields.find(f => f.field_name === `departure_flight_${person.person_id}_departureDate`)
        const deptFlightNumber = advancingFields.find(f => f.field_name === `departure_flight_${person.person_id}_flightNumber`)
        const deptFromCity = advancingFields.find(f => f.field_name === `departure_flight_${person.person_id}_fromCity`)
        const deptToCity = advancingFields.find(f => f.field_name === `departure_flight_${person.person_id}_toCity`)

        if (departureTime?.value && departureDate?.value) {
          departureFlights.push({
            personId: person.person_id,
            time: `${departureDate.value}T${departureTime.value}`,
            flightNumber: String(deptFlightNumber?.value || ''),
            from: String(deptFromCity?.value || ''),
            to: String(deptToCity?.value || '')
          })
        }
      })

      advancingData = { arrivalFlights, departureFlights }
    }
  }

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

      {/* Main Day Schedule View - Multi-Layer Timeline */}
      <CalendarDayView
        currentDate={currentDate}
        showDate={show.date}
        doorsAt={show.doors_at}
        setTime={show.set_time}
        assignedPeople={assignedPeople || []}
        selectedPeopleIds={selectedPeopleIds}
        advancingData={advancingData}
        scheduleItems={scheduleItems}
        orgSlug={orgSlug}
        showId={showId}
      />
    </div>
  )
}