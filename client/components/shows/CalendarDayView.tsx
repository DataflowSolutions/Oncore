'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Plane, PlaneLanding, MapPin, Music } from 'lucide-react'
import { PersonScheduleSelector } from './PersonScheduleSelector'
import { DateNavigator } from './DateNavigator'

interface ScheduleItem {
  id: string
  time: string // ISO datetime string
  title: string
  location?: string
  type: 'arrival' | 'departure' | 'show' | 'venue'
  personId?: string
  personName?: string
}

interface CalendarDayViewProps {
  currentDate: Date
  showDate: string
  doorsAt?: string | null
  setTime?: string | null
  selectedPeopleIds: string[]
  assignedPeople: Array<{
    person_id: string
    duty: string | null
    people: {
      id: string
      name: string
      member_type: string | null
    } | null
  }>
  advancingData?: {
    arrivalFlights: Array<{ personId: string; time?: string; flightNumber?: string; from?: string; to?: string }>
    departureFlights: Array<{ personId: string; time?: string; flightNumber?: string; from?: string; to?: string }>
  }
}

interface TimeSlot {
  timeLabel: string // "20:10"
  items: ScheduleItem[]
}

export function CalendarDayView({
  currentDate,
  showDate,
  doorsAt,
  setTime,
  selectedPeopleIds,
  assignedPeople,
  advancingData
}: CalendarDayViewProps) {
  // Debug logging
  console.log('CalendarDayView Debug:', {
    currentDate: currentDate.toISOString(),
    currentDateStr: currentDate.toISOString().split('T')[0],
    selectedPeopleIds,
    advancingData,
    assignedPeople: assignedPeople.map(p => ({ id: p.person_id, name: p.people?.name }))
  })

  // Build schedule items
  const scheduleItems: ScheduleItem[] = []

  // Helper function to get date string in local timezone (YYYY-MM-DD)
  const getLocalDateStr = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Add show times (global) - only if on show date
  const showDateObj = new Date(showDate)
  showDateObj.setHours(0, 0, 0, 0)
  const currentDateStr = getLocalDateStr(currentDate)
  const showDateNormalized = getLocalDateStr(showDateObj)
  const isShowDate = currentDateStr === showDateNormalized

  if (isShowDate && doorsAt) {
    scheduleItems.push({
      id: 'doors',
      time: doorsAt,
      title: 'Doors',
      type: 'venue'
    })
  }

  if (isShowDate && setTime) {
    scheduleItems.push({
      id: 'set',
      time: setTime,
      title: 'Set Time',
      type: 'show'
    })
  }

  // Add person-specific items from advancing data - filter by current date
  if (advancingData && selectedPeopleIds.length > 0) {
    console.log('Processing advancing data for', selectedPeopleIds.length, 'people')
    
    selectedPeopleIds.forEach(personId => {
      const person = assignedPeople.find(p => p.person_id === personId)?.people
      const personName = person?.name || 'Unknown'

      const personArrival = advancingData.arrivalFlights.find(f => f.personId === personId)
      console.log(`Person ${personName} (${personId}) arrival:`, personArrival)
      
      if (personArrival && personArrival.time) {
        const arrivalDate = new Date(personArrival.time)
        const arrivalDateStr = getLocalDateStr(arrivalDate)
        
        console.log(`  Arrival date: ${arrivalDateStr}, Current date: ${currentDateStr}, Match: ${arrivalDateStr === currentDateStr}`)
        
        if (arrivalDateStr === currentDateStr) {
          scheduleItems.push({
            id: `arrival-${personId}`,
            time: personArrival.time,
            title: `${personArrival.flightNumber || 'Flight'}`,
            location: `${personArrival.from || ''} → ${personArrival.to || ''}`,
            type: 'arrival',
            personId,
            personName
          })
        }
      }

      const personDeparture = advancingData.departureFlights.find(f => f.personId === personId)
      console.log(`Person ${personName} (${personId}) departure:`, personDeparture)
      
      if (personDeparture && personDeparture.time) {
        const departureDate = new Date(personDeparture.time)
        const departureDateStr = getLocalDateStr(departureDate)
        
        console.log(`  Departure date: ${departureDateStr}, Current date: ${currentDateStr}, Match: ${departureDateStr === currentDateStr}`)
        
        if (departureDateStr === currentDateStr) {
          scheduleItems.push({
            id: `departure-${personId}`,
            time: personDeparture.time,
            title: `${personDeparture.flightNumber || 'Flight'}`,
            location: `${personDeparture.from || ''} → ${personDeparture.to || ''}`,
            type: 'departure',
            personId,
            personName
          })
        }
      }
    })
  }
  
  console.log('Final schedule items:', scheduleItems)

  // Group items by exact time (HH:MM)
  const timeSlotMap = new Map<string, ScheduleItem[]>()
  
  scheduleItems.forEach(item => {
    const itemDate = new Date(item.time)
    const timeKey = `${itemDate.getHours().toString().padStart(2, '0')}:${itemDate.getMinutes().toString().padStart(2, '0')}`
    
    if (!timeSlotMap.has(timeKey)) {
      timeSlotMap.set(timeKey, [])
    }
    timeSlotMap.get(timeKey)!.push(item)
  })

  // Convert to array and sort
  const timeSlots: TimeSlot[] = Array.from(timeSlotMap.entries())
    .map(([timeLabel, items]) => ({ timeLabel, items }))
    .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel))

  const getItemColor = (type: string) => {
    switch (type) {
      case 'arrival':
        return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-100'
      case 'departure':
        return 'bg-blue-500/20 border-blue-500/40 text-blue-100'
      case 'show':
        return 'bg-red-500/20 border-red-500/40 text-red-100'
      case 'venue':
        return 'bg-purple-500/20 border-purple-500/40 text-purple-100'
      default:
        return 'bg-neutral-500/20 border-neutral-500/40 text-neutral-100'
    }
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'arrival':
        return <PlaneLanding className="w-3.5 h-3.5" />
      case 'departure':
        return <Plane className="w-3.5 h-3.5" />
      case 'venue':
        return <MapPin className="w-3.5 h-3.5" />
      case 'show':
        return <Music className="w-3.5 h-3.5" />
      default:
        return null
    }
  }

  // Calculate which dates have events (using local dates for consistency)
  const datesWithEvents: string[] = []
  
  // Add show date if it has show times
  if (doorsAt || setTime) {
    datesWithEvents.push(showDateNormalized)
  }

  // Add dates from advancing data
  if (advancingData && selectedPeopleIds.length > 0) {
    selectedPeopleIds.forEach(personId => {
      const personArrival = advancingData.arrivalFlights.find(f => f.personId === personId)
      if (personArrival?.time) {
        const arrivalDateStr = getLocalDateStr(new Date(personArrival.time))
        if (!datesWithEvents.includes(arrivalDateStr)) {
          datesWithEvents.push(arrivalDateStr)
        }
      }

      const personDeparture = advancingData.departureFlights.find(f => f.personId === personId)
      if (personDeparture?.time) {
        const departureDateStr = getLocalDateStr(new Date(personDeparture.time))
        if (!datesWithEvents.includes(departureDateStr)) {
          datesWithEvents.push(departureDateStr)
        }
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-yellow-900/20 border-yellow-700">
          <CardContent className="pt-4">
            <details>
              <summary className="cursor-pointer text-xs font-mono text-yellow-400 mb-2">
                🐛 Debug Info (click to expand)
              </summary>
              <div className="text-xs font-mono space-y-2 text-neutral-300">
                <div><strong>Current Date:</strong> {currentDateStr}</div>
                <div><strong>Show Date:</strong> {showDateNormalized}</div>
                <div><strong>Selected People:</strong> {selectedPeopleIds.join(', ')}</div>
                <div><strong>Schedule Items:</strong> {scheduleItems.length}</div>
                {advancingData && (
                  <>
                    <div><strong>Arrival Flights:</strong> {advancingData.arrivalFlights.length}</div>
                    <div><strong>Departure Flights:</strong> {advancingData.departureFlights.length}</div>
                    <details className="ml-4">
                      <summary className="cursor-pointer text-yellow-400">All Flight Data</summary>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify({ arrivalFlights: advancingData.arrivalFlights, departureFlights: advancingData.departureFlights }, null, 2)}
                      </pre>
                    </details>
                  </>
                )}
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Person Selector */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="pt-6">
          <PersonScheduleSelector
            availablePeople={assignedPeople
              .filter(p => p.people)
              .map(p => ({
                id: p.person_id,
                name: p.people!.name,
                duty: p.duty
              }))}
            selectedPeopleIds={selectedPeopleIds}
          />
        </CardContent>
      </Card>

      {/* Timeline View */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="pt-6">
          {/* Date Navigation */}
          <div className="mb-6">
            <DateNavigator 
              currentDate={currentDate} 
              datesWithEvents={datesWithEvents}
            />
          </div>

          {scheduleItems.length > 0 && (
            <div className="mb-4 text-right">
              <span className="text-xs text-neutral-400">
                {scheduleItems.length} event{scheduleItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {timeSlots.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No schedule items for this date</p>
              <p className="text-sm mt-1">
                {selectedPeopleIds.length === 0 
                  ? 'Select people above to view their schedules'
                  : 'Try navigating to a different date'}
              </p>
            </div>
          ) : (
            <div className="space-y-0 border border-neutral-800 rounded-lg overflow-hidden">
              {timeSlots.map((slot, idx) => (
                <div 
                  key={idx}
                  className="grid grid-cols-[100px,1fr] border-b border-neutral-800 last:border-b-0 hover:bg-neutral-800/30 transition-colors"
                >
                  {/* Time column */}
                  <div className="bg-neutral-900/50 px-4 py-3 flex items-start justify-end border-r border-neutral-800">
                    <span className="text-base font-mono font-semibold text-neutral-200">
                      {slot.timeLabel}
                    </span>
                  </div>

                  {/* Events column - all items in same row */}
                  <div className="px-4 py-2 flex gap-2">
                    {slot.items.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border ${getItemColor(item.type)} flex-1`}
                      >
                        {getItemIcon(item.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.personName && (
                              <span className="text-xs font-bold">{item.personName}</span>
                            )}
                            {item.personName && <span className="text-xs">•</span>}
                            <span className="text-xs font-medium truncate">{item.title}</span>
                          </div>
                          {item.location && (
                            <p className="text-xs text-neutral-400 mt-0.5 truncate">
                              {item.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
