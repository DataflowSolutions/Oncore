'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GlobalSearchResult } from '@/lib/database.types'

/**
 * Global search hook with debouncing
 * Searches across shows, venues, people, contacts, calendar events, documents, and files
 */
export function useGlobalSearch(orgId: string, searchQuery: string, enabled = true) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)

  // Debounce the search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return useQuery({
    queryKey: ['global-search', orgId, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return []
      }

      const supabase = createClient()
      const { data, error } = await supabase.rpc('global_search', {
        p_org_id: orgId,
        p_query: debouncedQuery.trim(),
        p_limit: 50,
      })

      if (error) {
        console.error('Global search error:', error)
        throw error
      }

      return (data as GlobalSearchResult[]) || []
    },
    enabled: enabled && debouncedQuery.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Group search results by type
 */
export function groupSearchResults(results: GlobalSearchResult[]) {
  const grouped: Record<string, GlobalSearchResult[]> = {
    show: [],
    venue: [],
    person: [],
    promoter: [],
    contact: [],
    event: [],
    document: [],
    file: [],
  }

  results.forEach((result) => {
    if (grouped[result.type]) {
      grouped[result.type].push(result)
    }
  })

  return grouped
}

/**
 * Get display label for result type
 */
export function getResultTypeLabel(type: string, count: number): string {
  const labels: Record<string, string> = {
    show: count === 1 ? 'Show' : 'Shows',
    venue: count === 1 ? 'Venue' : 'Venues',
    person: count === 1 ? 'Person' : 'People',
    promoter: count === 1 ? 'Promoter' : 'Promoters',
    contact: count === 1 ? 'Contact' : 'Contacts',
    event: count === 1 ? 'Calendar Event' : 'Calendar Events',
    document: count === 1 ? 'Document' : 'Documents',
    file: count === 1 ? 'File' : 'Files',
  }
  return labels[type] || type
}
