'use client'

import { useState, useEffect } from 'react'
import { Check, X, MessageCircle, Edit, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { updateAdvancingField, createAdvancingComment } from '@/lib/actions/advancing'
import { Database } from '@/lib/database.types'

type AdvancingComment = Database['public']['Tables']['advancing_comments']['Row']

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
  comments: AdvancingComment[]
  onFieldUpdate?: () => void
}

export function FieldRow({ 
  field, 
  orgSlug, 
  sessionId, 
  comments, 
  onFieldUpdate 
}: FieldRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(field.value || ''))
  const [isUpdating, setIsUpdating] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)

  useEffect(() => {
    setEditValue(String(field.value || ''))
  }, [field.value])

  const handleSave = async () => {
    if (editValue === field.value) {
      setIsEditing(false)
      return
    }

    setIsUpdating(true)
    try {
      await updateAdvancingField(orgSlug, sessionId, field.id, {
        value: editValue
      })
      setIsEditing(false)
      onFieldUpdate?.()
    } catch (error) {
      console.error('Error updating field:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStatusToggle = async () => {
    const newStatus = field.status === 'pending' ? 'confirmed' : 'pending'
    
    setIsUpdating(true)
    try {
      await updateAdvancingField(orgSlug, sessionId, field.id, {
        status: newStatus
      })
      onFieldUpdate?.()
    } catch (error) {
      console.error('Error updating field status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsAddingComment(true)
    try {
      await createAdvancingComment(orgSlug, sessionId, field.id, newComment)
      setNewComment('')
      onFieldUpdate?.()
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setIsAddingComment(false)
    }
  }

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">Not set</span>
    }
    
    if (typeof value === 'object') {
      return <span className="text-muted-foreground">Complex data</span>
    }
    
    return value.toString()
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Field Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{field.field_name}</h4>
          <Badge 
            variant={field.status === 'confirmed' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {field.status === 'confirmed' ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Confirmed
              </>
            ) : (
              'Pending'
            )}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          {comments.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowComments(!showComments)}
              className="text-xs px-2 h-7"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              {comments.length}
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStatusToggle}
            disabled={isUpdating}
            className="text-xs px-2 h-7"
          >
            {field.status === 'confirmed' ? (
              <X className="w-3 h-3" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Field Value */}
      <div className="space-y-2">
        {isEditing ? (
          <div className="flex gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter value..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave()
                } else if (e.key === 'Escape') {
                  setEditValue(String(field.value || ''))
                  setIsEditing(false)
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
            >
              <Save className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditValue(String(field.value || ''))
                setIsEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div 
            className="group flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            <div className="flex-1">
              {formatValue(field.value)}
            </div>
            <Edit className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="space-y-3 pt-3 border-t">
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-muted/50 p-3 rounded text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-xs">
                    {comment.author_name || 'Anonymous'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString('en-US')}
                  </span>
                </div>
                <p>{comment.body}</p>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddComment()
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={isAddingComment || !newComment.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}