'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Database } from '@/lib/database.types'

type Person = Database['public']['Tables']['people']['Row']

/**
 * Fetch all people for an organization
 * Uses: People list page
 * Caching: 2 minutes stale time (less frequently changing)
 */
export function usePeople(orgSlug: string, filter?: string) {
  return useQuery({
    queryKey: filter 
      ? queryKeys.peopleByType(orgSlug, filter)
      : queryKeys.peopleFull(orgSlug),
    queryFn: async () => {
      const url = filter 
        ? `/api/${orgSlug}/people?filter=${filter}`
        : `/api/${orgSlug}/people`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch people')
      return response.json() as Promise<Person[]>
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Fetch invitations for an organization
 * Uses: People list page
 * Caching: 1 minute
 */
export function useInvitations(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.invitations(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/invitations`)
      if (!response.ok) throw new Error('Failed to fetch invitations')
      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Fetch available seats for an organization
 * Uses: People list page
 * Caching: 5 minutes (rarely changes)
 */
export function useAvailableSeats(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.seats(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/seats`)
      if (!response.ok) throw new Error('Failed to fetch seat info')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
