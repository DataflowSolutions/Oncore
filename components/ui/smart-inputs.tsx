'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface SmartTimeInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SmartTimeInput({ value, onChange, className = '' }: SmartTimeInputProps) {
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
  }



  // Parse natural language time input
  const parseTimeInput = (input: string): string => {
    const cleaned = input.toLowerCase().trim()
    
    // Handle common formats
    if (cleaned.match(/^\d{1,2}(:\d{2})?(am|pm)$/)) {
      // 12-hour format
      const match = cleaned.match(/^(\d{1,2})(:\d{2})?(am|pm)$/)
      if (match) {
        let hour = parseInt(match[1])
        const minutes = match[2] ? match[2].slice(1) : '00'
        const period = match[3]
        
        if (period === 'pm' && hour !== 12) hour += 12
        if (period === 'am' && hour === 12) hour = 0
        
        return `${hour.toString().padStart(2, '0')}:${minutes}`
      }
    }
    
    if (cleaned.match(/^\d{1,2}$/)) {
      // Just hour, assume 24h format
      const hour = parseInt(cleaned)
      if (hour >= 0 && hour <= 23) {
        return `${hour.toString().padStart(2, '0')}:00`
      }
    }
    
    return input
  }

  const handleBlur = () => {
    const parsed = parseTimeInput(inputValue)
    if (parsed !== inputValue) {
      setInputValue(parsed)
      onChange(parsed)
    }
  }

  return (
    <Input
      type="time"
      value={inputValue}
      onChange={(e) => handleInputChange(e.target.value)}
      onBlur={handleBlur}
      className={className}
      placeholder="HH:MM"
    />
  )
}

interface SmartDateInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SmartDateInput({ value, onChange, className = '' }: SmartDateInputProps) {
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <Input
      type="date"
      value={inputValue}
      onChange={(e) => handleInputChange(e.target.value)}
      className={className}
    />
  )
}