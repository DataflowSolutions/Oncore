'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, MapPin, Users } from 'lucide-react'
import { createAdvancingSession } from '@/lib/actions/advancing'
import { useRouter } from 'next/navigation'
import { ShowWithVenue } from '@/lib/actions/shows'

interface CreateAdvancingSessionFormProps {
  orgSlug: string
  showId: string
  orgId: string
  shows: ShowWithVenue[]
  preselectedShowId?: string
}

export function CreateAdvancingSessionForm({ 
  orgSlug,
  showId,
  shows, 
  preselectedShowId 
}: CreateAdvancingSessionFormProps) {
  const [title, setTitle] = useState('')
  const [selectedShowId, setSelectedShowId] = useState(preselectedShowId || 'none')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await createAdvancingSession(orgSlug, {
        title,
        showId: selectedShowId === 'none' ? '' : selectedShowId,
      })
      
      if (result.success && result.data) {
        router.push(`/${orgSlug}/shows/${showId}/advancing/${result.data.id}`)
      } else {
        setError(result.error || 'Failed to create session')
      }
    } catch {
      setError('An error occurred while creating the session')
    } finally {
      setLoading(false)
    }
  }

  const selectedShow = shows.find(show => show.id === selectedShowId)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Session Title
        </label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter session title..."
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="show" className="text-sm font-medium">
          Associated Show (Optional)
        </label>
        <Select value={selectedShowId} onValueChange={setSelectedShowId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a show..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No show selected</SelectItem>
            {shows.map((show) => (
              <SelectItem key={show.id} value={show.id}>
                {show.title}{show.venue ? ` • ${show.venue.name}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedShow && (
        <div className="p-4 bg-accent border border-border rounded-md">
          <h4 className="font-medium mb-2">Selected Show Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>
                {new Date(selectedShow.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            
            {selectedShow.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>
                  {selectedShow.venue.name}
                  {selectedShow.venue.city && `, ${selectedShow.venue.city}`}
                </span>
              </div>
            )}
            
            {selectedShow.set_time && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Set Time: {selectedShow.set_time}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? 'Creating...' : 'Create Session'}
        </Button>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}