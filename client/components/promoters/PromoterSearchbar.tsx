'use client'

import { Search } from 'lucide-react'

interface PromoterSearchbarProps {
  value: string
  onChange: (value: string) => void
}

export function PromoterSearchbar({ value, onChange }: PromoterSearchbarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
      <input
        type="text"
        placeholder="Search promoters by name, company, city, or email..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 bg-background px-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  )
}
