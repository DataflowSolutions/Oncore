'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface TeamSearchProps {
  placeholder?: string
  onSearch?: (query: string) => void
}

export default function TeamSearch({ placeholder = "Search", onSearch }: TeamSearchProps) {
  return (
    <div className="relative mb-6">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
        onChange={(e) => onSearch?.(e.target.value)}
      />
    </div>
  )
}