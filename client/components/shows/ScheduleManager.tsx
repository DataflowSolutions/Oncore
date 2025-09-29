'use client'

import { useState } from 'react'
import { Plus, Clock, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createScheduleItem, updateScheduleItem, deleteScheduleItem } from '@/lib/actions/schedule'
import { Database } from '@/lib/database.types'

type ScheduleItem = Database['public']['Tables']['schedule_items']['Row']

interface ScheduleManagerProps {
  orgSlug: string
  showId: string
  showDate: string
  scheduleItems: ScheduleItem[]
  assignedPeople?: Array<{
    person_id: string
    duty: string | null
    people: {
      id: string
      name: string
      member_type: string | null
    } | null
  }>
}

interface ScheduleFormData {
  title: string
  starts_at: string
  ends_at: string
  location: string
  notes: string
  person_id: string // For person-specific assignments
}

export function ScheduleManager({ orgSlug, showId, showDate, scheduleItems, assignedPeople = [] }: ScheduleManagerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: '',
    starts_at: '',
    ends_at: '',
    location: '',
    notes: '',
    person_id: '' // Empty means team-wide
  })

  const resetForm = () => {
    setFormData({
      title: '',
      starts_at: '',
      ends_at: '',
      location: '',
      notes: '',
      person_id: ''
    })
    setIsAdding(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Convert date strings to proper datetime strings
    const startsAt = new Date(`${showDate}T${formData.starts_at}:00`).toISOString()
    const endsAt = formData.ends_at ? new Date(`${showDate}T${formData.ends_at}:00`).toISOString() : null

    const scheduleData = {
      title: formData.title,
      starts_at: startsAt,
      ends_at: endsAt,
      location: formData.location || null,
      notes: formData.notes || null
    }

    if (editingId) {
      await updateScheduleItem(orgSlug, showId, editingId, scheduleData)
    } else {
      await createScheduleItem(orgSlug, showId, scheduleData)
    }

    resetForm()
  }

  const handleEdit = (item: ScheduleItem) => {
    const startTime = new Date(item.starts_at).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })
    const endTime = item.ends_at ? new Date(item.ends_at).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }) : ''

    setFormData({
      title: item.title,
      starts_at: startTime,
      ends_at: endTime,
      location: item.location || '',
      notes: item.notes || '',
      person_id: '' // TODO: Get from item once person_id column is added
    })
    setEditingId(item.id)
    setIsAdding(true)
  }

  const handleDelete = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this schedule item?')) {
      await deleteScheduleItem(orgSlug, showId, itemId)
    }
  }

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return ''
    const startDate = new Date(start)
    const endDate = new Date(end)
    const durationMs = endDate.getTime() - startDate.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours === 0) return `${minutes}min`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}min`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Schedule
          </CardTitle>
          {!isAdding && (
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <Card className="border-2 border-dashed">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Sound Check, Doors Open"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Stage, Lobby, Green Room"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assigned To</label>
                    <select
                      value={formData.person_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, person_id: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Team Event</option>
                      {assignedPeople.map((assignment) => (
                        assignment.people && (
                          <option key={assignment.person_id} value={assignment.person_id}>
                            {assignment.people.name} {assignment.duty && `(${assignment.duty})`}
                          </option>
                        )
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Time *</label>
                    <Input
                      type="time"
                      value={formData.starts_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Time</label>
                    <Input
                      type="time"
                      value={formData.ends_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional details..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" size="sm">
                    {editingId ? 'Update Item' : 'Add Item'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {scheduleItems.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No schedule items yet</p>
            <p className="text-sm">Add items to organize your show day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduleItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-shrink-0 text-right min-w-[80px]">
                  <div className="font-medium">{formatTime(item.starts_at)}</div>
                  {item.ends_at && (
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(item.starts_at, item.ends_at)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      {item.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{item.location}</span>
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        className="text-xs px-2 h-7"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        className="text-xs px-2 h-7 text-destructive hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}