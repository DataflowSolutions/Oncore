'use client'
import { logger } from '@/lib/logger'

import { useState, useEffect } from 'react'
import { Check, X, MessageCircle, Edit, Save, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SmartTimeInput, SmartDateInput } from '@/components/ui/smart-inputs'
import { updateAdvancingField, createAdvancingComment } from '@/lib/actions/advancing'
import { generateScheduleFromAdvancing } from '@/lib/actions/schedule'

// Using a simple type for comments since the migration hasn't been applied yet
type AdvancingComment = {
  id: string
  body: string
  author_name: string | null
  created_at: string
}

interface FieldRowProps {
  field: {
    id: string
    section: string
    field_name: string
    field_type: string
    value: unknown
    status: 'pending' | 'confirmed'
    party_type: 'from_us' | 'from_you'
  }
  orgSlug: string
  sessionId: string
  showId?: string
  comments: AdvancingComment[]
  onFieldUpdate?: () => void
}

export function FieldRow({ 
  field, 
  orgSlug, 
  sessionId, 
  showId,
  comments, 
  onFieldUpdate 
}: FieldRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(field.value || ''))
  const [isUpdating, setIsUpdating] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [scheduleGenerated, setScheduleGenerated] = useState(false)

  useEffect(() => {
    setEditValue(String(field.value || ''))
    setHasUnsavedChanges(false)
  }, [field.value])

  // Check if field name suggests it should be a time/date field
  const isTimeField = (fieldName: string) => {
    const name = fieldName.toLowerCase()
    return name.includes('time') || name.includes('arrival') || name.includes('departure') || 
           name.includes('flight') || name.includes('soundcheck') || name.includes('doors') ||
           name.includes('load') || name.includes('set')
  }

  const isDateField = (fieldName: string) => {
    const name = fieldName.toLowerCase()
    return name.includes('date') || name.includes('day')
  }



  const handleValueChange = (value: string) => {
    setEditValue(value)
    setHasUnsavedChanges(value !== String(field.value || ''))
  }

  const handleSave = async () => {
    if (editValue === String(field.value || '')) {
      setIsEditing(false)
      setHasUnsavedChanges(false)
      return
    }

    setIsUpdating(true)
    try {
      const result = await updateAdvancingField(orgSlug, sessionId, field.id, {
        value: editValue
      })
      
      if (result.success) {
        setIsEditing(false)
        setHasUnsavedChanges(false)
        onFieldUpdate?.()
        
        // Auto-generate schedule items if this looks like schedule-relevant data
        if (isTimeField(field.field_name) && editValue.trim() && showId) {
          try {
            const scheduleResult = await generateScheduleFromAdvancing(orgSlug, showId, sessionId)
            if (scheduleResult.success && scheduleResult.created && scheduleResult.created > 0) {
              setScheduleGenerated(true)
              setTimeout(() => setScheduleGenerated(false), 3000)
            }
          } catch (error) {
            logger.error('Failed to generate schedule items', error)
          }
        }
      }
    } catch (error) {
      logger.error('Failed to save field', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setEditValue(String(field.value || ''))
    setIsEditing(false)
    setHasUnsavedChanges(false)
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsAddingComment(true)
    try {
      await createAdvancingComment(orgSlug, sessionId, field.id, newComment, 'User')
      setNewComment('')
      onFieldUpdate?.()
    } catch (error) {
      logger.error('Failed to add comment', error)
    } finally {
      setIsAddingComment(false)
    }
  }

  const formatFieldValue = (value: unknown) => {
    if (!value) return ''
    const str = String(value)
    
    // Format time values nicely
    if (isTimeField(field.field_name) && str.match(/^\d{2}:\d{2}$/)) {
      return str
    }
    
    return str
  }

  const renderInput = () => {
    if (isTimeField(field.field_name)) {
      return (
        <SmartTimeInput
          value={editValue}
          onChange={handleValueChange}
          className="flex-1"
        />
      )
    }

    if (isDateField(field.field_name)) {
      return (
        <SmartDateInput
          value={editValue}
          onChange={handleValueChange}
          className="flex-1"
        />
      )
    }

    return (
      <Input
        type="text"
        value={editValue}
        onChange={(e) => handleValueChange(e.target.value)}
        className="flex-1"
        placeholder="Enter value..."
      />
    )
  }



  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      <div className="flex items-start gap-4 p-4 hover:bg-neutral-900/30 transition-colors">
        {/* Field Name */}
        <div className="w-48 flex-shrink-0">
          <span className="text-sm font-medium text-neutral-200">{field.field_name}</span>
        </div>

        {/* Field Value/Input */}
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              {renderInput()}
              
              {/* Save/Cancel Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isUpdating || !hasUnsavedChanges}
                  className="flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  <X className="w-3 h-3" />
                  Cancel
                </Button>
                {hasUnsavedChanges && (
                  <span className="text-xs text-yellow-400">Unsaved changes</span>
                )}
              </div>

              {/* Schedule Generation Feedback */}
              {scheduleGenerated && (
                <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 p-2 rounded">
                  <ArrowRight className="w-3 h-3" />
                  Schedule items generated! Check the Day Schedule tab.
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-neutral-300">
                {formatFieldValue(field.value) || (
                  <span className="text-neutral-500 italic">No value set</span>
                )}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2">
          <Badge variant={field.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
            {field.status === 'confirmed' ? (
              <Check className="w-3 h-3 mr-1" />
            ) : (
              <X className="w-3 h-3 mr-1" />
            )}
            {field.status}
          </Badge>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowComments(!showComments)}
            className="relative"
          >
            <MessageCircle className="w-3 h-3" />
            {comments.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {comments.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-neutral-800 bg-neutral-900/20">
          <div className="p-4 space-y-3">
            {comments.length > 0 && (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-neutral-800/50 p-3 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs text-neutral-300">
                        {comment.author_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(comment.created_at).toLocaleDateString('en-US')}
                      </span>
                    </div>
                    <p className="text-neutral-200">{comment.body}</p>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddComment()
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={isAddingComment || !newComment.trim()}
              >
                {isAddingComment ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}