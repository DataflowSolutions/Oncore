'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Database } from '@/lib/database.types'

type Venue = Database['public']['Tables']['venues']['Row']

/**
 * Fetch all venues for an organization
 * Uses: Venue selector components
 * Caching: 5 minutes (venues change rarely)
 */
export function useVenues(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.venues(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/venues`)
      if (!response.ok) throw new Error('Failed to fetch venues')
      return response.json() as Promise<Venue[]>
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch venues with show counts for an organization
 * Uses: Venues list page
 * Caching: 2 minutes
 */
export function useVenuesWithCounts(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.venuesWithCounts(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/venues?includeCounts=true`)
      if (!response.ok) throw new Error('Failed to fetch venues')
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
