'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PersonSelector } from './PersonSelector'

interface Person {
  id: string
  name: string
  email: string | null
  duty?: string
}

interface PersonSelectorClientProps {
  showTeam: Person[]
  currentUserId?: string | null
  orgSlug: string
  sessionId: string
}

export function PersonSelectorClient({ 
  showTeam, 
  currentUserId,
  orgSlug,
  sessionId
}: PersonSelectorClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPersonId = searchParams.get('person')
  
  // Determine current person: URL param > current user > first team member
  const [currentPerson, setCurrentPerson] = useState<Person | null>(() => {
    if (selectedPersonId) {
      return showTeam.find(p => p.id === selectedPersonId) || null
    }
    if (currentUserId) {
      return showTeam.find(p => p.id === currentUserId) || null
    }
    return showTeam[0] || null
  })

  // Update when URL changes
  useEffect(() => {
    if (selectedPersonId) {
      const person = showTeam.find(p => p.id === selectedPersonId)
      if (person) {
        setCurrentPerson(person)
      }
    }
  }, [selectedPersonId, showTeam])

  const handlePersonChange = (personId: string) => {
    const person = showTeam.find(p => p.id === personId)
    if (person) {
      setCurrentPerson(person)
      // Update URL with person parameter
      const params = new URLSearchParams(searchParams.toString())
      params.set('person', personId)
      router.push(`/${orgSlug}/advancing/${sessionId}?${params.toString()}`)
    }
  }

  if (showTeam.length === 0) {
    return null
  }

  return (
    <PersonSelector
      currentPerson={currentPerson}
      availablePeople={showTeam}
      onPersonChange={handlePersonChange}
    />
  )
}
