'use client'

import { User } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Person {
  id: string
  name: string
  email: string | null
  duty?: string | null
}

interface PersonSelectorProps {
  currentPerson: Person | null
  availablePeople: Person[]
  onPersonChange: (personId: string) => void
  className?: string
}

export function PersonSelector({ 
  currentPerson, 
  availablePeople, 
  onPersonChange,
  className = "" 
}: PersonSelectorProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <User className="w-4 h-4" />
        <span>Viewing as:</span>
      </div>
      
      <Select
        value={currentPerson?.id || ''}
        onValueChange={onPersonChange}
      >
        <SelectTrigger className="w-[250px] border-neutral-700 bg-neutral-800 text-neutral-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-400" />
            <SelectValue>
              {currentPerson ? (
                <div className="flex flex-col items-start">
                  <span className="font-medium">{currentPerson.name}</span>
                  {currentPerson.duty && (
                    <span className="text-xs text-neutral-500">{currentPerson.duty}</span>
                  )}
                </div>
              ) : (
                <span className="text-neutral-500">Select person...</span>
              )}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-neutral-800 border-neutral-700">
          {availablePeople.map((person) => (
            <SelectItem 
              key={person.id} 
              value={person.id}
              className="text-neutral-100 focus:bg-neutral-700 focus:text-neutral-100"
            >
              <div className="flex flex-col">
                <span className="font-medium">{person.name}</span>
                {person.duty && (
                  <span className="text-xs text-neutral-500">{person.duty}</span>
                )}
                {person.email && (
                  <span className="text-xs text-neutral-500">{person.email}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
