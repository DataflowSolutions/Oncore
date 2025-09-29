'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { createShow } from '@/lib/actions/shows'
import VenueFormFields from '@/components/advancing/VenueFormFields'

interface CreateShowButtonProps {
  orgId: string
}

export default function CreateShowButton({ orgId }: CreateShowButtonProps) {
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedVenue, setSelectedVenue] = useState<{id: string, name: string, city: string | null} | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Add orgId to formData
      formData.append('orgId', orgId)
      await createShow(formData)
      setSuccess(true)
      
      // Close form after brief success message
      setTimeout(() => {
        setShowForm(false)
        setSuccess(false)
      }, 1500)
    } catch (error) {
      console.error('Error creating show:', error)
      setError(error instanceof Error ? error.message : 'Failed to create show')
    } finally {
      setIsLoading(false)
    }
  }

  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div 
          role="dialog" 
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg sm:max-w-[600px]"
          tabIndex={-1}
        >
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 className="font-semibold tracking-tight flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5" />
              Create New Show
            </h2>
            <p className="text-sm text-muted-foreground">
              Add a new show to your schedule. Fill in the basic details below.
            </p>
          </div>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 rounded-md bg-primary/10 border border-primary/20 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Show created successfully!</span>
              </div>
            )}
            
          <form action={handleSubmit} className="space-y-4">
            {/* Layout exactly as requested:
                Row 1: Show Name, Venue Name
                Row 2: City, Address  
                Row 3: Performance Date, Performance Time
                Row 4: Artist, Show Type
                Row 5: Crew Requirements */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Row 1: Show Name, Venue Name */}
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="name">
                  Show Name *
                </label>
                <Input
                  id="name"
                  name="title"
                  placeholder="Enter show name"
                  required
                />
              </div>
              
              <VenueFormFields
                orgId={orgId}
                onVenueSelect={(venue) => setSelectedVenue(venue)}
              />
              
              {/* Row 3: Performance Date, Performance Time */}
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="performance_date">
                  Performance Date *
                </label>
                <Input
                  id="performance_date"
                  name="date"
                  type="date"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="performance_time">
                  Performance Time *
                </label>
                <Input
                  id="performance_time"
                  name="setTime"
                  type="time"
                  required
                />
              </div>
              
              {/* Row 4: Artist, Show Type */}
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="artist">
                  Artist *
                </label>
                <Input
                  id="artist"
                  name="artist"
                  placeholder="Enter artist name"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="show_type">
                  Show Type
                </label>
                <select
                  id="show_type"
                  name="showType"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="concert">Concert</option>
                  <option value="festival">Festival</option>
                  <option value="private">Private Event</option>
                  <option value="acoustic">Acoustic</option>
                </select>
              </div>
            </div>
            
            {/* Row 5: Crew Requirements (full width) */}
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="crew_requirements">
                Crew Requirements
              </label>
              <textarea
                id="crew_requirements"
                name="notes"
                placeholder="Describe crew requirements and special notes..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? 'Creating...' : 'Create Show'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <Button
      onClick={() => setShowForm(true)}
      className="bg-foreground text-background hover:bg-foreground/90 h-10 rounded-md px-4 py-2 flex items-center gap-2 font-medium"
      type="button"
    >
      <Plus className="w-4 h-4" />
      <span>Create Show</span>
    </Button>
  )
}