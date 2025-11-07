'use client'
import { logger } from '@/lib/logger'

import { useState } from 'react'
import { Users, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Person {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
}

interface AddTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onAddMembers: (members: Person[]) => void
  availablePeople: Person[]
  existingMemberIds?: string[]
}

export function AddTeamMemberModal({ 
  isOpen, 
  onClose, 
  onAddMembers, 
  availablePeople,
  existingMemberIds = [] 
}: AddTeamMemberModalProps) {
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Filter out people who are already assigned to this show  
  const people = availablePeople.filter(p => !existingMemberIds.includes(p.id))
  
  logger.debug('Modal opened', isOpen)
  logger.debug('Available people', availablePeople.length)
  logger.debug('Existing member IDs', existingMemberIds)
  logger.debug('Filtered people', people.length)

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleSelection = (personId: string) => {
    const newSelection = new Set(selectedPeople)
    if (newSelection.has(personId)) {
      newSelection.delete(personId)
    } else {
      newSelection.add(personId)
    }
    setSelectedPeople(newSelection)
  }

  const handleAddMembers = () => {
    const selectedPersons = people.filter(p => selectedPeople.has(p.id))
    logger.debug('Adding members', selectedPersons)
    onAddMembers(selectedPersons)
    setSelectedPeople(new Set())
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-100">Add Team Members</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-neutral-800">
          <Input
            placeholder="Search people by name, role, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
          />
        </div>

        {/* People List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredPeople.length === 0 ? (
            <div className="p-6 text-center text-neutral-500">
              <p>No people found{searchQuery ? ' matching your search' : ''}.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedPeople.has(person.id)
                      ? 'bg-neutral-800'
                      : 'hover:bg-neutral-900/50'
                  }`}
                  onClick={() => handleToggleSelection(person.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedPeople.has(person.id)
                        ? 'bg-white border-white'
                        : 'border-neutral-600'
                    }`}>
                      {selectedPeople.has(person.id) && (
                        <div className="w-2 h-2 bg-black rounded-sm" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-neutral-100">{person.name}</h3>
                        {person.role && (
                          <span className="text-xs text-neutral-400 bg-neutral-800 px-2 py-1 rounded">
                            {person.role}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        {person.email && (
                          <p className="text-sm text-neutral-400">{person.email}</p>
                        )}
                        {person.phone && (
                          <p className="text-sm text-neutral-400">{person.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-800">
          <p className="text-sm text-neutral-400">
            {selectedPeople.size} {selectedPeople.size === 1 ? 'person' : 'people'} selected
          </p>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedPeople.size === 0}
              className="bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {selectedPeople.size > 0 && `(${selectedPeople.size})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}