'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserPlus, CheckCircle, AlertCircle, X } from 'lucide-react'
import { assignPersonToShow } from '@/lib/actions/show-team'

interface AssignPersonModalProps {
  showId: string
  availablePeople: Array<{
    id: string
    name: string
    member_type: string | null
    email: string | null
  }>
  onSuccess: () => void
}

export default function AssignPersonModal({ showId, availablePeople, onSuccess }: AssignPersonModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData(event.currentTarget)
      await assignPersonToShow(formData)
      setSuccess(true)
      
      setTimeout(() => {
        setIsOpen(false)
        setSuccess(false)
        setSelectedPersonId('')
        onSuccess()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign person')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
        disabled={availablePeople.length === 0}
      >
        <UserPlus className="w-4 h-4" />
        Assign Person
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4 border">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <h2 className="font-semibold text-xl">Assign Person to Show</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300 text-sm">Person assigned successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="showId" value={showId} />
          <input type="hidden" name="personId" value={selectedPersonId} />

          {/* Person Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Person</label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availablePeople.map((person) => (
                <div
                  key={person.id}
                  onClick={() => setSelectedPersonId(person.id)}
                  className={`
                    p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                    ${selectedPersonId === person.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{person.name}</p>
                      {person.email && (
                        <p className="text-sm text-muted-foreground">{person.email}</p>
                      )}
                    </div>
                    {person.member_type && (
                      <Badge variant="outline" className="text-xs">
                        {person.member_type}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Duty (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Duty (Optional)</label>
            <Input
              name="duty"
              placeholder="e.g., Sound Engineer, Stage Manager"
              disabled={isSubmitting || success}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={!selectedPersonId || isSubmitting || success}
              className="flex-1"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Person'}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}