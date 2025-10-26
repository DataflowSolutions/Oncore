"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface EditableTextProps {
  value: string
  onSave: (newValue: string) => void | Promise<void>
  className?: string
  inputClassName?: string
  placeholder?: string
  multiline?: boolean
}

export function EditableText({
  value,
  onSave,
  className,
  inputClassName,
  placeholder = "Enter text...",
  multiline = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(value)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleDoubleClick = () => {
    setIsEditing(true)
    setEditValue(value)
  }

  const handleSave = async () => {
    if (editValue.trim() !== value) {
      setIsSaving(true)
      try {
        await onSave(editValue.trim())
      } catch (error) {
        console.error("Failed to save:", error)
        setEditValue(value)
      } finally {
        setIsSaving(false)
      }
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn("h-auto min-h-[2rem]", inputClassName)}
        placeholder={placeholder}
        autoFocus
        disabled={isSaving}
      />
    )
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        "cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors",
        "border border-transparent hover:border-accent",
        className
      )}
      title="Double-click to edit"
    >
      {value || <span className="text-muted-foreground italic">{placeholder}</span>}
    </div>
  )
}
