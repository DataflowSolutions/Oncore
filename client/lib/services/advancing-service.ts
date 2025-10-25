/* eslint-disable @typescript-eslint/no-unused-vars */
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../database.types'

type Tables = Database['public']['Tables']

/**
 * AdvancingService - Platform-agnostic service for advancing operations
 * Works with both Next.js (web) and Flutter (mobile)
 * NOTE: Many methods deprecated due to removed database features (access codes, technical/production tables)
 */
export class AdvancingService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new advancing session using RPC function
   * This ensures atomic creation with access code generation
   */
  async createSession(showId: string, orgId: string) {
    const { data, error } = await this.supabase
      .rpc('create_advancing_session', {
        p_show_id: showId,
        p_org_id: orgId,
      })

    if (error) throw error
    return data
  }

  /**
   * Get session by ID with all related data
   */
  async getSession(sessionId: string) {
    const { data, error } = await this.supabase
      .from('advancing_sessions')
      .select(`
        *,
        shows (
          id,
          title,
          date,
          venues (
            id,
            name,
            city,
            state,
            country,
            capacity,
            load_in_time,
            doors_time,
            curfew_time
          )
        ),
        hospitality (*),
        technical (*),
        production (*)
      `)
      .eq('id', sessionId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Verify access code and get session (for venue access)
   * @deprecated Access code system has been replaced with invitation tokens
   */
  async verifyAccessCode(_accessCode: string) {
    // This function is deprecated - access codes have been replaced with invitation tokens
    return { data: null, error: new Error('Access code system deprecated') }
  }

  /**
   * Submit hospitality information
   * @deprecated This RPC function does not exist in the current database schema
   */
  async submitHospitality(
    _sessionId: string,
    _guestCount: number,
    _catering: Record<string, unknown>,
    _notes?: string
  ) {
    // This function references an RPC that doesn't exist
    return { data: null, error: new Error('Function not implemented') }
  }

  /**
   * Update technical requirements
   * @deprecated Technical table does not exist in current schema
   */
  async updateTechnical(_sessionId: string, _updates: Record<string, unknown>) {
    // This function references a table that doesn't exist
    return { data: null, error: new Error('Technical table not implemented') }
  }

  /**
   * Update production details
   * @deprecated Production table does not exist in current schema
   */
  async updateProduction(_sessionId: string, _updates: Record<string, unknown>) {
    // This function references a table that doesn't exist
    return { data: null, error: new Error('Production table not implemented') }
  }

  /**
   * Update session status
   * @deprecated Status field does not exist in advancing_sessions table
   */
  async updateSessionStatus(
    _sessionId: string,
    _status: 'draft' | 'in_progress' | 'shared' | 'completed' | 'archived'
  ) {
    // Status field doesn't exist in the advancing_sessions table
    return { data: null, error: new Error('Status field not implemented') }
  }

  /**
   * Get all sessions for a show
   */
  async getSessionsByShow(showId: string) {
    const { data, error } = await this.supabase
      .from('advancing_sessions')
      .select(`
        *,
        hospitality (*),
        technical (*),
        production (*)
      `)
      .eq('show_id', showId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Subscribe to real-time updates on a session
   * Note: In Flutter, use supabase.channel() directly
   */
  subscribeToSession(sessionId: string, callback: (payload: Record<string, unknown>) => void) {
    const channel = this.supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hospitality',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technical',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe()

    return channel
  }
}
