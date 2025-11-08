'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, invalidationKeys } from '@/lib/query-keys'
import { 
  createScheduleItem, 
  updateScheduleItem, 
  deleteScheduleItem 
} from '@/lib/actions/schedule'
import type { Database } from '@/lib/database.types'

type ScheduleItem = Database['public']['Tables']['schedule_items']['Row']
type ScheduleItemInsert = Database['public']['Tables']['schedule_items']['Insert']
type ScheduleItemUpdate = Database['public']['Tables']['schedule_items']['Update']

/**
 * Create a new schedule item with optimistic update
 * Uses: ScheduleManager component
 */
export function useCreateScheduleItem(orgSlug: string, showId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (itemData: Omit<ScheduleItemInsert, 'org_id' | 'show_id'>) => {
      return await createScheduleItem(orgSlug, showId, itemData)
    },
    
    // Optimistic update - add item immediately
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.showSchedule(showId) })
      
      const previousSchedule = queryClient.getQueryData(queryKeys.showSchedule(showId))
      
      // Optimistically add the new item
      queryClient.setQueryData(
        queryKeys.showSchedule(showId),
        (old: ScheduleItem[] | undefined) => {
          const optimisticItem: ScheduleItem = {
            id: `temp-${Date.now()}`, // Temporary ID
            show_id: showId,
            created_at: new Date().toISOString(),
            ...newItem,
          } as ScheduleItem
          
          return [...(old || []), optimisticItem].sort((a, b) => 
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
          )
        }
      )
      
      return { previousSchedule }
    },
    
    onError: (err, variables, context) => {
      if (context?.previousSchedule) {
        queryClient.setQueryData(
          queryKeys.showSchedule(showId),
          context.previousSchedule
        )
      }
    },
    
    onSettled: () => {
      invalidationKeys.schedule(showId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

/**
 * Update an existing schedule item with optimistic update
 * Uses: ScheduleManager component
 */
export function useUpdateScheduleItem(orgSlug: string, showId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: ScheduleItemUpdate }) => {
      return await updateScheduleItem(orgSlug, showId, itemId, updates)
    },
    
    // Optimistic update
    onMutate: async ({ itemId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.showSchedule(showId) })
      
      const previousSchedule = queryClient.getQueryData(queryKeys.showSchedule(showId))
      
      queryClient.setQueryData(
        queryKeys.showSchedule(showId),
        (old: ScheduleItem[] | undefined) => {
          return (old || [])
            .map(item => item.id === itemId ? { ...item, ...updates } : item)
            .sort((a, b) => 
              new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
            )
        }
      )
      
      return { previousSchedule }
    },
    
    onError: (err, variables, context) => {
      if (context?.previousSchedule) {
        queryClient.setQueryData(
          queryKeys.showSchedule(showId),
          context.previousSchedule
        )
      }
    },
    
    onSettled: () => {
      invalidationKeys.schedule(showId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

/**
 * Delete a schedule item with optimistic update
 * Uses: ScheduleManager component
 */
export function useDeleteScheduleItem(orgSlug: string, showId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      return await deleteScheduleItem(orgSlug, showId, itemId)
    },
    
    // Optimistic delete
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.showSchedule(showId) })
      
      const previousSchedule = queryClient.getQueryData(queryKeys.showSchedule(showId))
      
      queryClient.setQueryData(
        queryKeys.showSchedule(showId),
        (old: ScheduleItem[] | undefined) => 
          (old || []).filter(item => item.id !== itemId)
      )
      
      return { previousSchedule }
    },
    
    onError: (err, variables, context) => {
      if (context?.previousSchedule) {
        queryClient.setQueryData(
          queryKeys.showSchedule(showId),
          context.previousSchedule
        )
      }
    },
    
    onSettled: () => {
      invalidationKeys.schedule(showId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}
