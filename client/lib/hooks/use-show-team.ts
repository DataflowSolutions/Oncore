'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, invalidationKeys } from '@/lib/query-keys'
import { assignPersonToShow, removePersonFromShow } from '@/lib/actions/show-team'
import { useRouter } from 'next/navigation'
import type { PersonListItem } from '@/lib/actions/show-team'

/**
 * OPTIMIZED: Direct Supabase access for team data
 * Bypasses API route to eliminate network hop
 * Uses cached server actions that are already authenticated
 */

interface TeamData {
  assignedTeam: PersonListItem[]
  availablePeople: PersonListItem[]
}

/**
 * Fetch assigned team and available people (unified query)
 * Uses: Show detail page
 * OPTIMIZED: Direct server action call instead of API route
 */
export function useShowTeamData(showId: string, orgSlug: string, orgId: string) {
  return useQuery<TeamData>({
    queryKey: queryKeys.showTeam(showId),
    queryFn: async () => {
      // Call server actions directly instead of API route
      const { getShowTeam, getAvailablePeople } = await import('@/lib/actions/show-team')
      
      const [assignedTeam, availablePeople] = await Promise.all([
        getShowTeam(showId),
        getAvailablePeople(orgId)
      ])
      
      return { assignedTeam, availablePeople }
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Fetch only assigned team members (independent resource)
 * Uses: Team page, components that only need assigned members
 */
export function useAssignedTeam(showId: string) {
  return useQuery<PersonListItem[]>({
    queryKey: queryKeys.showAssignedTeam(showId),
    queryFn: async () => {
      const { getShowTeam } = await import('@/lib/actions/show-team')
      return await getShowTeam(showId)
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Fetch only available people (independent resource)
 * Uses: Assignment modals, team selectors
 */
export function useAvailablePeopleForShow(orgId: string) {
  return useQuery<PersonListItem[]>({
    queryKey: queryKeys.showAvailablePeople(orgId),
    queryFn: async () => {
      const { getAvailablePeople } = await import('@/lib/actions/show-team')
      return await getAvailablePeople(orgId)
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Assign a person to a show with optimistic update
 */
export function useAssignPerson(showId: string, orgSlug: string, orgId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  
  return useMutation({
    mutationFn: async ({ personId, duty }: { personId: string; duty?: string | null }) => {
      const formData = new FormData()
      formData.append('showId', showId)
      formData.append('personId', personId)
      if (duty) formData.append('duty', duty)
      
      return await assignPersonToShow(formData)
    },
    
    onSuccess: () => {
      // Invalidate all related queries
      invalidationKeys.showTeam(showId, orgSlug, orgId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
      
      // Refresh the page data
      router.refresh()
    },
  })
}

/**
 * Remove a person from a show with optimistic update
 */
export function useUnassignPerson(showId: string, orgSlug: string, orgId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  
  return useMutation({
    mutationFn: async ({ personId }: { personId: string }) => {
      return await removePersonFromShow(showId, personId)
    },
    
    onSuccess: () => {
      // Invalidate all related queries
      invalidationKeys.showTeam(showId, orgSlug, orgId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
      
      // Refresh the page data
      router.refresh()
    },
  })
}
