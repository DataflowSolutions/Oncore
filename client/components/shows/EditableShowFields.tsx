'use client'
import { logger } from '@/lib/logger'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdateShow } from '@/lib/hooks/use-shows'
import { CalendarIcon, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import type { Database } from '@/lib/database.types'

type Venue = Database['public']['Tables']['venues']['Row']

interface EditableTitleProps {
  showId: string
  orgSlug: string
  currentValue: string
  className?: string
}

export function EditableTitle({ showId, orgSlug, currentValue, className }: EditableTitleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState(currentValue)
  const { mutate: updateShow, isPending: isLoading } = useUpdateShow(orgSlug)

  const handleSave = () => {
    if (value === currentValue) {
      setIsOpen(false)
      return
    }

    updateShow(
      { showId, updates: { title: value } },
      {
        onSuccess: () => {
          setIsOpen(false)
        },
        onError: (error) => {
          logger.error('Failed to update title', error)
        }
      }
    )
  }

  const handleCancel = () => {
    setValue(currentValue)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <h1 
          className={`cursor-pointer hover:bg-accent/50 rounded px-2 -mx-2 transition-colors ${className}`}
          title="Double-click to edit"
          onDoubleClick={() => setIsOpen(true)}
        >
          {currentValue || 'Untitled Show'}
        </h1>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Show Title</Label>
            <Input
              id="title"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter show title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
            >
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface EditableDateProps {
  showId: string
  orgSlug: string
  currentValue: string | null
  className?: string
}

export function EditableDate({ showId, orgSlug, currentValue, className }: EditableDateProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(currentValue ? new Date(currentValue) : undefined)
  const { mutate: updateShow, isPending: isLoading } = useUpdateShow(orgSlug)

  const handleSave = () => {
    if (!date) {
      setIsOpen(false)
      return
    }

    const newDateString = format(date, 'yyyy-MM-dd')
    if (currentValue && newDateString === format(new Date(currentValue), 'yyyy-MM-dd')) {
      setIsOpen(false)
      return
    }

    updateShow(
      { showId, updates: { date: newDateString } },
      {
        onSuccess: () => {
          setIsOpen(false)
        },
        onError: (error) => {
          logger.error('Failed to update date', error)
        }
      }
    )
  }

  const handleCancel = () => {
    setDate(currentValue ? new Date(currentValue) : undefined)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <span 
          className={`cursor-pointer hover:bg-accent/50 rounded px-2 -mx-2 transition-colors flex items-center gap-2 ${className}`}
          title="Double-click to edit"
          onDoubleClick={() => setIsOpen(true)}
        >
          <CalendarIcon className="w-4 h-4" />
          {currentValue ? new Date(currentValue).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }) : 'No date set'}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
          />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading || !date}
            >
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface EditableTimeProps {
  showId: string
  orgSlug: string
  currentValue: string | null
  fieldName: 'doors_at' | 'set_time'
  label: string
  className?: string
}

export function EditableTime({ showId, orgSlug, currentValue, fieldName, label, className }: EditableTimeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [time, setTime] = useState(
    currentValue ? format(new Date(currentValue), 'HH:mm') : ''
  )
  const { mutate: updateShow, isPending: isLoading } = useUpdateShow(orgSlug)

  const handleSave = () => {
    if (!time) {
      setIsOpen(false)
      return
    }

    // Combine with show date to create proper timestamp
    const [hours, minutes] = time.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    updateShow(
      { showId, updates: { [fieldName]: date.toISOString() } },
      {
        onSuccess: () => {
          setIsOpen(false)
        },
        onError: (error) => {
          logger.error(`Failed to update ${fieldName}`, error)
        }
      }
    )
  }

  const handleCancel = () => {
    setTime(currentValue ? format(new Date(currentValue), 'HH:mm') : '')
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={`cursor-pointer hover:bg-accent/50 rounded px-2 -mx-2 transition-colors ${className}`}
          title="Double-click to edit"
          onDoubleClick={() => setIsOpen(true)}
        >
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">
            {currentValue
              ? new Date(currentValue).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Not set'}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={fieldName}>{label}</Label>
            <Input
              id={fieldName}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
            >
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface EditableVenueProps {
  showId: string
  orgSlug: string
  currentVenueId: string | null
  venues: Venue[]
  className?: string
}

export function EditableVenue({ showId, orgSlug, currentVenueId, venues, className }: EditableVenueProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [venueId, setVenueId] = useState(currentVenueId || '')
  const { mutate: updateShow, isPending: isLoading } = useUpdateShow(orgSlug)

  const handleSave = () => {
    if (venueId === currentVenueId) {
      setIsOpen(false)
      return
    }

    updateShow(
      { showId, updates: { venue_id: venueId || null } },
      {
        onSuccess: () => {
          setIsOpen(false)
        },
        onError: (error) => {
          logger.error('Failed to update venue', error)
        }
      }
    )
  }

  const handleCancel = () => {
    setVenueId(currentVenueId || '')
    setIsOpen(false)
  }

  const currentVenue = venues.find(v => v.id === currentVenueId)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={`cursor-pointer hover:bg-accent/50 rounded px-2 -mx-2 transition-colors ${className}`}
          title="Double-click to edit"
          onDoubleClick={() => setIsOpen(true)}
        >
          {currentVenue ? (
            <>
              <p className="text-2xl font-bold text-primary">{currentVenue.name}</p>
              <div className="flex flex-col gap-2 text-muted-foreground mt-2">
                {currentVenue.address && <p>{currentVenue.address}</p>}
                <p className="font-medium">
                  {currentVenue.city}{currentVenue.country && `, ${currentVenue.country}`}
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No venue set</p>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Select value={venueId} onValueChange={setVenueId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name} - {venue.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
            >
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface EditableNotesProps {
  showId: string
  orgSlug: string
  currentValue: string | null
  className?: string
}

export function EditableNotes({ showId, orgSlug, currentValue, className }: EditableNotesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState(currentValue || '')
  const { mutate: updateShow, isPending: isLoading } = useUpdateShow(orgSlug)

  const handleSave = () => {
    if (value === currentValue) {
      setIsOpen(false)
      return
    }

    updateShow(
      { showId, updates: { notes: value || null } },
      {
        onSuccess: () => {
          setIsOpen(false)
        },
        onError: (error) => {
          logger.error('Failed to update notes', error)
        }
      }
    )
  }

  const handleCancel = () => {
    setValue(currentValue || '')
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={`cursor-pointer hover:bg-accent/50 rounded px-2 -mx-2 transition-colors ${className}`}
          title="Double-click to edit"
          onDoubleClick={() => setIsOpen(true)}
        >
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {currentValue || 'No notes. Double-click to add.'}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter notes about this show..."
              rows={6}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
            >
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
