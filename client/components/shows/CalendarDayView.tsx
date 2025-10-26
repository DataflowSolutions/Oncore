'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScheduleItemModal } from './ScheduleItemModal'
import { Plane, PlaneLanding, MapPin, Music, Plus, X, Trash2 } from 'lucide-react'
import { PersonScheduleSelector } from './PersonScheduleSelector'
import { DateNavigator } from './DateNavigator'
import { Database } from '@/lib/database.types'
import { createScheduleItem, deleteScheduleItem, updateScheduleItem } from '@/lib/actions/schedule'

type DBScheduleItem = Database['public']['Tables']['schedule_items']['Row']

interface ScheduleItem {
  id: string
  time: string // ISO datetime string
  title: string
  location?: string
  type: 'arrival' | 'departure' | 'show' | 'venue' | 'schedule'
  personId?: string
  personName?: string
  endTime?: string
  notes?: string
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
  scheduleItems?: DBScheduleItem[]
  orgSlug: string
  showId: string
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
  advancingData,
  scheduleItems: dbScheduleItems = [],
  orgSlug,
  showId
}: CalendarDayViewProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    starts_at: '',
    ends_at: '',
    location: '',
    notes: ''
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

  // Add schedule_items from database (Load In, Sound Check, etc.)
  dbScheduleItems.forEach(item => {
    const itemDate = new Date(item.starts_at)
    const itemDateStr = getLocalDateStr(itemDate)
    
    // Only show items for the current date
    if (itemDateStr === currentDateStr) {
      scheduleItems.push({
        id: item.id,
        time: item.starts_at,
        title: item.title,
        location: item.location || undefined,
        type: 'schedule',
        endTime: item.ends_at || undefined,
        notes: item.notes || undefined
      })
    }
  })

  // Add person-specific flight items from advancing data - filter by current date
  if (advancingData && selectedPeopleIds.length > 0) {
    selectedPeopleIds.forEach(personId => {
      const person = assignedPeople.find(p => p.person_id === personId)?.people
      const personName = person?.name || 'Unknown'

      const personArrival = advancingData.arrivalFlights.find(f => f.personId === personId)
      
      if (personArrival && personArrival.time) {
        const arrivalDate = new Date(personArrival.time)
        const arrivalDateStr = getLocalDateStr(arrivalDate)
        
        if (arrivalDateStr === currentDateStr) {
          scheduleItems.push({
            id: `arrival-${personId}`,
            time: personArrival.time,
            title: `${personArrival.flightNumber || 'Flight'}`,
            location: `${personArrival.from || ''} → ${personArrival.to || ''}`,
            type: 'arrival' as const,
            personId,
            personName
          })
        }
      }

      const personDeparture = advancingData.departureFlights.find(f => f.personId === personId)
      
      if (personDeparture && personDeparture.time) {
        const departureDate = new Date(personDeparture.time)
        const departureDateStr = getLocalDateStr(departureDate)
        
        if (departureDateStr === currentDateStr) {
          scheduleItems.push({
            id: `departure-${personId}`,
            time: personDeparture.time,
            title: `${personDeparture.flightNumber || 'Flight'}`,
            location: `${personDeparture.from || ''} → ${personDeparture.to || ''}`,
            type: 'departure' as const,
            personId,
            personName
          })
        }
      }
    })
  }

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

  // Generate 30-minute grid lines for the full day (00:00 to 23:30)
  const generateFullDayGrid = (): TimeSlot[] => {
    const gridSlots: TimeSlot[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 30]) {
        const timeLabel = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const existingSlot = timeSlots.find(slot => slot.timeLabel === timeLabel)
        gridSlots.push({
          timeLabel,
          items: existingSlot ? existingSlot.items : []
        })
      }
    }
    return gridSlots
  }

  const fullDayGrid = generateFullDayGrid()

  const getItemColor = (type: string) => {
    switch (type) {
      case 'arrival':
        return 'bg-emerald-500/30 border-emerald-500/60 text-emerald-50'
      case 'departure':
        return 'bg-blue-500/30 border-blue-500/60 text-blue-50'
      case 'show':
        return 'bg-red-500/30 border-red-500/60 text-red-50'
      case 'venue':
        return 'bg-purple-500/30 border-purple-500/60 text-purple-50'
      case 'schedule':
        return 'bg-orange-500/30 border-orange-500/60 text-orange-50'
      default:
        return 'bg-neutral-500/30 border-neutral-500/60 text-neutral-50'
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
      case 'schedule':
        return <MapPin className="w-3.5 h-3.5" />
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

  // Add dates from schedule items
  dbScheduleItems.forEach(item => {
    const itemDateStr = getLocalDateStr(new Date(item.starts_at))
    if (!datesWithEvents.includes(itemDateStr)) {
      datesWithEvents.push(itemDateStr)
    }
  })

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

      {/* Timeline View */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="pt-6">
          {/* Header: Date Navigation, Person Selector, and Add Button */}
          <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Date Navigator */}
            <div className="flex-shrink-0">
              <DateNavigator 
                currentDate={currentDate} 
                datesWithEvents={datesWithEvents}
              />
            </div>

            {/* Person Selector */}
            <div className="flex-1 min-w-0">
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
            </div>

            {/* Add Item Button */}
            <div className="flex-shrink-0">
              <Button
                size="sm"
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-2"
                variant={isAdding ? "outline" : "default"}
              >
                {isAdding ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Item
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Add Item Form */}
          {isAdding && (
            <Card className="mb-4 border-dashed border-2">
              <CardContent className="pt-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const startsAt = new Date(`${currentDateStr}T${formData.starts_at}:00`).toISOString()
                    const endsAt = formData.ends_at ? new Date(`${currentDateStr}T${formData.ends_at}:00`).toISOString() : null
                    
                    await createScheduleItem(orgSlug, showId, {
                      title: formData.title,
                      starts_at: startsAt,
                      ends_at: endsAt,
                      location: formData.location || null,
                      notes: formData.notes || null
                    })
                    
                    setFormData({ title: '', starts_at: '', ends_at: '', location: '', notes: '' })
                    setIsAdding(false)
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Title *</label>
                      <Input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Load In, Sound Check"
                        required
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Location</label>
                      <Input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g., Main Stage"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Start Time *</label>
                      <Input
                        type="time"
                        value={formData.starts_at}
                        onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                        required
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">End Time</label>
                      <Input
                        type="time"
                        value={formData.ends_at}
                        onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium">Notes</label>
                    <Input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional details..."
                      className="h-8 text-sm"
                    />
                  </div>

                  <Button type="submit" size="sm" className="w-full">
                    Add to Schedule
                  </Button>
                </form>
              </CardContent>
            </Card>
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
            <div className="space-y-0 border border-neutral-800 rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
              {fullDayGrid.map((slot, idx) => (
                <div 
                  key={idx}
                  className={`grid grid-cols-[100px,1fr] border-b border-neutral-800/50 last:border-b-0 ${slot.items.length > 0 ? 'hover:bg-neutral-800/30' : 'hover:bg-neutral-800/10'} transition-colors min-h-[60px]`}
                >
                  {/* Time column */}
                  <div className="bg-neutral-900/30 px-4 py-3 flex items-start justify-end border-r border-neutral-800/50">
                    <span className={`text-sm font-mono ${slot.items.length > 0 ? 'font-semibold text-neutral-200' : 'font-normal text-neutral-500'}`}>
                      {slot.timeLabel}
                    </span>
                  </div>

                  {/* Events column - all items in same row */}
                  <div className="px-4 py-2 flex gap-2">
                    {slot.items.length > 0 ? slot.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item)
                          setIsModalOpen(true)
                        }}
                        className={`group/item relative flex items-center gap-2 px-3 py-2 rounded-md border ${getItemColor(item.type)} flex-1 cursor-pointer hover:shadow-lg transition-all`}
                      >
                        {getItemIcon(item.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.personName && (
                              <span className="text-xs font-bold">{item.personName}</span>
                            )}
                            {item.personName && <span className="text-xs">•</span>}
                            <span className="text-xs font-medium truncate">{item.title}</span>
                            {item.endTime && (
                              <>
                                <span className="text-xs">→</span>
                                <span className="text-xs font-mono">
                                  {new Date(item.endTime).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                          {item.location && (
                            <p className="text-xs text-neutral-400 mt-0.5 truncate">
                              {item.location}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-neutral-400 mt-0.5 truncate italic">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        {/* Delete button only for schedule items, not show/venue/flight items */}
                        {item.type === 'schedule' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async (e) => {
                              e.stopPropagation() // Prevent opening modal
                              if (confirm('Delete this schedule item?')) {
                                await deleteScheduleItem(orgSlug, showId, item.id)
                              }
                            }}
                            className="opacity-0 group-hover/item:opacity-100 transition-opacity absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500/90 hover:bg-red-600 text-white rounded-full"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Item Modal */}
      <ScheduleItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedItem(null)
        }}
        onUpdate={async (id, updates) => {
          await updateScheduleItem(orgSlug, showId, id, updates)
        }}
        isEditable={selectedItem?.type === 'schedule'}
      />
    </div>
  )
}
