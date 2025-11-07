'use client'

import { createContext, useContext, ReactNode } from 'react'

interface ShowContextValue {
  showId: string
  showTitle: string | null
  orgSlug: string
}

const ShowContext = createContext<ShowContextValue | null>(null)

export function ShowProvider({ 
  children, 
  showId,
  showTitle,
  orgSlug 
}: { 
  children: ReactNode
  showId: string
  showTitle: string | null
  orgSlug: string
}) {
  return (
    <ShowContext.Provider value={{ showId, showTitle, orgSlug }}>
      {children}
    </ShowContext.Provider>
  )
}

export function useShowContext() {
  const context = useContext(ShowContext)
  return context // Can be null if not in a show context
}
