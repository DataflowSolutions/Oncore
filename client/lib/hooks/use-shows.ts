'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, invalidationKeys } from '@/lib/query-keys'
import { updateShow, deleteShow } from '@/lib/actions/shows'
import type { ShowWithVenue } from '@/lib/actions/shows'
import type { Database } from '@/lib/database.types'

type ShowUpdate = Database['public']['Tables']['shows']['Update']

/**
 * Fetch all shows for an organization
 * Uses: Shows list page
 * Caching: 1 minute stale time, refetch in background
 */
export function useShows(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.shows(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/shows`)
      if (!response.ok) {
        throw new Error('Failed to fetch shows')
      }
      return response.json() as Promise<ShowWithVenue[]>
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch single show details
 * Uses: Show detail page
 * Caching: 30 seconds stale time (more dynamic data)
 */
export function useShow(showId: string, orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.show(showId),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/shows/${showId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch show')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Fetch show schedule
 * Uses: Show detail page, day schedule page
 */
export function useShowSchedule(showId: string, orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.showSchedule(showId),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/shows/${showId}/schedule`)
      if (!response.ok) {
        throw new Error('Failed to fetch schedule')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Fetch show team
 * Uses: Show detail page, team page
 */
export function useShowTeam(showId: string, orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.showTeam(showId),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/shows/${showId}/team`)
      if (!response.ok) {
        throw new Error('Failed to fetch show team')
      }
      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Update show with optimistic update
 * Uses: Editable fields throughout show pages
 */
export function useUpdateShow(orgSlug: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ showId, updates }: { showId: string; updates: ShowUpdate }) => {
      return await updateShow(showId, updates)
    },
    
    // Optimistic update - update UI immediately
    onMutate: async ({ showId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.show(showId) })
      
      // Snapshot current value
      const previousShow = queryClient.getQueryData(queryKeys.show(showId))
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.show(showId), (old: unknown) => ({
        ...(old as Record<string, unknown>),
        ...updates,
      }))
      
      // Return context with previous value
      return { previousShow, showId }
    },
    
    // On error, rollback to previous value
    onError: (err, variables, context) => {
      if (context?.previousShow) {
        queryClient.setQueryData(
          queryKeys.show(context.showId),
          context.previousShow
        )
      }
    },
    
    // Always refetch after mutation (success or error)
    onSettled: (data, error, { showId }) => {
      // Invalidate related queries
      invalidationKeys.show(showId, orgSlug).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

/**
 * Delete show with optimistic update
 * Uses: Show list page, show detail page
 */
export function useDeleteShow(orgSlug: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ showId }: { showId: string }) => {
      return await deleteShow(showId)
    },
    
    // Optimistic delete
    onMutate: async ({ showId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shows(orgSlug) })
      
      const previousShows = queryClient.getQueryData(queryKeys.shows(orgSlug))
      
      // Remove show from list immediately
      queryClient.setQueryData(
        queryKeys.shows(orgSlug),
        (old: ShowWithVenue[] | undefined) => old?.filter(show => show.id !== showId) || []
      )
      
      return { previousShows }
    },
    
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousShows) {
        queryClient.setQueryData(queryKeys.shows(orgSlug), context.previousShows)
      }
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shows(orgSlug) })
    },
  })
}
