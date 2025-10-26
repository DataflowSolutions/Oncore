'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MapPin, User, Users, Filter, Eye } from 'lucide-react'
import { Database } from '@/lib/database.types'
import { PersonSelector } from '@/components/advancing/PersonSelector'

type ScheduleItem = Database['public']['Tables']['schedule_items']['Row']
type ScheduleVisibility = 'all' | 'artist_team' | 'promoter_team' | 'crew' | 'management' | 'venue_staff' | 'security' | 'session_specific'

interface DayScheduleViewProps {
  scheduleItems: ScheduleItem[]
  showDate: string
  doorsAt?: string | null
  setTime?: string | null
  assignedPeople: Array<{
    person_id: string
    duty: string | null
    people: {
      id: string
      name: string
      member_type: string | null
    } | null
  }>
  userRole?: string // For determining default visibility filter
  currentUserId?: string | null // Current logged-in user ID
}

export function DayScheduleView({ 
  scheduleItems, 
  showDate, 
  doorsAt, 
  setTime,
  assignedPeople,
  userRole = 'viewer',
  currentUserId
}: DayScheduleViewProps) {
  // Role-based filtering state
  const [activeFilter, setActiveFilter] = useState<'all' | 'global' | 'role_specific'>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Person selector state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(() => {
    // Default to current user if they're in the team
    if (currentUserId && assignedPeople.some(p => p.person_id === currentUserId)) {
      return currentUserId
    }
    // Otherwise default to first person
    return assignedPeople[0]?.person_id || null
  })
  
  // Get team members for the selector
  const teamMembers = assignedPeople
    .filter(p => p.people)
    .map(p => ({
      id: p.person_id,
      name: p.people!.name,
      duty: p.duty,
      email: null
    }))

  // Get user's role-specific visibility options
  const getUserVisibilityOptions = (role: string): ScheduleVisibility[] => {
    switch (role) {
      case 'artist':
      case 'manager':
        return ['all', 'artist_team', 'management']
      case 'agent':
        return ['all', 'artist_team', 'management']
      case 'crew':
        return ['all', 'crew', 'artist_team']
      case 'promoter':
        return ['all', 'promoter_team', 'venue_staff']
      case 'venue':
        return ['all', 'venue_staff', 'promoter_team', 'security']
      default:
        return ['all']
    }
  }

  // Filter schedule items based on current filters and selected person
  const filteredItems = scheduleItems.filter(() => {
    // Filter by person - show global items (person_id is null) OR items for the selected person
    // Note: person_id column needs to be added to schedule_items table
    // For now, we'll show all items and enhance this after DB migration
    const isPersonSpecific = false // Will be: _item.person_id === selectedPersonId
    const isGlobal = true // Will be: _item.person_id === null
    
    // Always show items that match the selected person or are global
    const matchesPerson = !selectedPersonId || isGlobal || isPersonSpecific
    
    if (!matchesPerson) return false
    
    if (activeFilter === 'global') {
      // Show only global/shared items (this would check session_id is null when DB is updated)
      return isGlobal
    }
    if (activeFilter === 'role_specific') {
      // Show only role-specific items (this would filter by visibility when DB is updated)
      return isPersonSpecific
    }
    return true // Show all items that match the person filter
  })

  // Create combined timeline items including show times and schedule items
  const timelineItems: Array<{
    id: string
    time: string
    title: string
    duration?: number
    location?: string
    notes?: string
    personName?: string
    isShowTime?: boolean
    type: 'team' | 'person' | 'show' | 'global' | 'role_specific'
    priority?: number
    source?: string
  }> = []

  // Add show times to timeline (these are always global/shared)
  if (doorsAt) {
    timelineItems.push({
      id: 'doors',
      time: new Date(doorsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: 'Doors Open',
      isShowTime: true,
      type: 'global',
      priority: 1,
      source: 'Show Details'
    })
  }

  if (setTime) {
    timelineItems.push({
      id: 'set',
      time: new Date(setTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: 'Set Time',
      isShowTime: true,
      type: 'global',
      priority: 1,
      source: 'Show Details'
    })
  }

  // Add filtered schedule items
  filteredItems.forEach(item => {
    const startTime = new Date(item.starts_at)
    const endTime = item.ends_at ? new Date(item.ends_at) : null
    const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) : undefined
    
    // Person assignment will be added after migration
    const personName = undefined // Will be populated after person_id column is added

    // Determine item type (will be enhanced with actual visibility data)
    const itemType = item.notes?.includes('Auto-generated') ? 'role_specific' : 'global'

    timelineItems.push({
      id: item.id,
      time: startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: item.title,
      duration,
      location: item.location || undefined,
      notes: item.notes || undefined,
      personName,
      type: itemType, // Will use person_id check after migration
      priority: 3, // Will use actual priority from DB after migration
      source: item.notes?.includes('Auto-generated') ? 'Advancing Session' : 'Manual'
    })
  })

  // Sort by time
  timelineItems.sort((a, b) => {
    const timeA = new Date(`2000-01-01 ${a.time}`)
    const timeB = new Date(`2000-01-01 ${b.time}`)
    return timeA.getTime() - timeB.getTime()
  })

  const getTypeColor = (type: 'team' | 'person' | 'show' | 'global' | 'role_specific') => {
    switch (type) {
      case 'show':
      case 'global':
        return 'bg-red-500/30 border-red-500/60 text-red-50'
      case 'role_specific':
        return 'bg-blue-500/30 border-blue-500/60 text-blue-50'
      case 'person':
        return 'bg-purple-500/30 border-purple-500/60 text-purple-50'
      case 'team':
        return 'bg-green-500/30 border-green-500/60 text-green-50'
      default:
        return 'bg-muted border-muted-foreground text-foreground'
    }
  }

  const getPositionFromTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    const startMinutes = 6 * 60 // 6 AM
    
    // If it's after midnight but before 6 AM, treat as next day
    const adjustedMinutes = totalMinutes < startMinutes ? totalMinutes + 24 * 60 : totalMinutes
    
    const relativeMinutes = adjustedMinutes - startMinutes
    const totalTimespan = (24 - 6) * 60 // 18 hours in minutes
    
    return Math.max(0, Math.min(100, (relativeMinutes / totalTimespan) * 100))
  }

  const currentPerson = teamMembers.find(p => p.id === selectedPersonId) || null

  return (
    <Card className="bg-[#111] border-muted">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Day Timeline - Multi-Layer Schedule
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(showDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })} • Global shared schedule + role-specific items
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Person Selector */}
            {teamMembers.length > 0 && (
              <PersonSelector
                currentPerson={currentPerson}
                availablePeople={teamMembers}
                onPersonChange={(personId) => setSelectedPersonId(personId)}
                className="mr-2"
              />
            )}
            
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter Views
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted/10 rounded-lg border">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Schedule Layers</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('all')}
                  >
                    All Items
                  </Button>
                  <Button
                    variant={activeFilter === 'global' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('global')}
                  >
                    Global Schedule Only
                  </Button>
                  <Button
                    variant={activeFilter === 'role_specific' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('role_specific')}
                  >
                    Role-Specific Only
                  </Button>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Role Views (Coming Soon)</p>
                <div className="flex flex-wrap gap-2">
                  {getUserVisibilityOptions(userRole).map(option => (
                    <Badge key={option} variant="outline" className="text-xs">
                      {option.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Enhanced Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/30 border-2 border-red-500/60"></div>
              <span>Global/Show Times</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500/30 border-2 border-blue-500/60"></div>
              <span>Role-Specific</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/30 border-2 border-green-500/60"></div>
              <span>Team Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500/30 border-2 border-purple-500/60"></div>
              <span>Personal</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Time markers */}
            <div className="flex justify-between text-xs text-muted-foreground mb-4">
              <span>6 AM</span>
              <span>9 AM</span>
              <span>12 PM</span>
              <span>3 PM</span>
              <span>6 PM</span>
              <span>9 PM</span>
              <span>12 AM</span>
            </div>
            
            {/* Timeline bar with 30-minute grid lines */}
            <div className="relative h-2 bg-muted rounded-full mb-6">
              {/* 30-minute grid lines */}
              {Array.from({ length: 37 }, (_, i) => i * (100 / 36)).map((pos, idx) => (
                <div
                  key={idx}
                  className={`absolute w-px bg-muted-foreground ${
                    idx % 2 === 0 ? 'h-6 -top-2 opacity-50' : 'h-3 -top-0.5 opacity-30'
                  }`}
                  style={{ left: `${pos}%` }}
                />
              ))}
              
              {/* Schedule items positioned on timeline */}
              {timelineItems.map((item) => (
                <div
                  key={item.id}
                  className={`absolute -top-1 h-4 w-1.5 rounded-full shadow-lg ${
                    item.type === 'global' || item.type === 'show' 
                      ? 'bg-red-600' 
                      : item.type === 'role_specific' 
                      ? 'bg-blue-600' 
                      : item.type === 'team'
                      ? 'bg-green-600'
                      : 'bg-purple-600'
                  }`}
                  style={{ left: `${getPositionFromTime(item.time)}%` }}
                  title={`${item.time} - ${item.title}`}
                />
              ))}
            </div>
          </div>

          {/* Schedule Items List */}
          <div className="space-y-3">
            {timelineItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No schedule items yet</p>
                <p className="text-sm">Add items to organize your show day</p>
              </div>
            ) : (
              timelineItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border ${getTypeColor(item.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-medium">{item.time}</span>
                        <h4 className="font-semibold">{item.title}</h4>
                        {item.duration && (
                          <Badge variant="outline" className="text-xs">
                            {item.duration}min
                          </Badge>
                        )}
                        {item.priority && item.priority <= 2 && (
                          <Badge variant="destructive" className="text-xs">
                            High Priority
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        {item.location && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{item.location}</span>
                          </div>
                        )}
                        {item.personName && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{item.personName}</span>
                          </div>
                        )}
                        {item.type === 'team' && !item.personName && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>Team Event</span>
                          </div>
                        )}
                        {item.source && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="w-3 h-3" />
                            <span>{item.source}</span>
                          </div>
                        )}
                      </div>
                      
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-xs">
                        {item.isShowTime ? 'Show Time' : 
                         item.type === 'global' ? 'Global' :
                         item.type === 'role_specific' ? 'Role-Specific' :
                         item.type === 'person' ? 'Personal' : 'Team'}
                      </Badge>
                      {item.type === 'role_specific' && (
                        <Badge variant="secondary" className="text-xs">
                          Auto-Generated
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}