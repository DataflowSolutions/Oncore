'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeUpdate {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

/**
 * Hook to subscribe to real-time updates for an advancing session
 * Listens for changes to fields, comments, and documents
 */
export function useAdvancingRealtime(
  sessionId: string | null,
  onUpdate?: (update: RealtimeUpdate) => void
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    logger.debug('Setting up real-time subscription for session', sessionId)

    const realtimeChannel = supabase
      .channel(`advancing_session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advancing_fields',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          logger.debug('Advancing field changed', payload)
          onUpdate?.({
            table: 'advancing_fields',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advancing_comments',
        },
        (payload) => {
          logger.debug('Advancing comment changed', payload)
          onUpdate?.({
            table: 'advancing_comments',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advancing_documents',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          logger.debug('Advancing document changed', payload)
          onUpdate?.({
            table: 'advancing_documents',
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          })
        }
      )
      .subscribe((status) => {
        logger.debug('Real-time subscription status', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    setChannel(realtimeChannel)

    // Cleanup function
    return () => {
      logger.debug('Cleaning up real-time subscription')
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [sessionId, onUpdate])

  return { channel, isConnected }
}
