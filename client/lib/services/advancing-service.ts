import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../database.types'

type Tables = Database['public']['Tables']

/**
 * AdvancingService - Platform-agnostic service for advancing operations
 * Works with both Next.js (web) and Flutter (mobile)
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
   */
  async verifyAccessCode(accessCode: string) {
    const { data, error } = await this.supabase
      .rpc('verify_access_code', {
        p_access_code: accessCode.toUpperCase(),
      })

    if (error) throw error
    return data
  }

  /**
   * Submit hospitality information
   */
  async submitHospitality(
    sessionId: string,
    guestCount: number,
    catering: any,
    notes?: string
  ) {
    const { data, error } = await this.supabase
      .rpc('submit_hospitality', {
        p_session_id: sessionId,
        p_guest_count: guestCount,
        p_catering: catering,
        p_notes: notes,
      })

    if (error) throw error
    return data
  }

  /**
   * Update technical requirements
   */
  async updateTechnical(sessionId: string, updates: Tables['technical']['Update']) {
    const { data, error } = await this.supabase
      .from('technical')
      .update(updates)
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update production details
   */
  async updateProduction(sessionId: string, updates: Tables['production']['Update']) {
    const { data, error } = await this.supabase
      .from('production')
      .update(updates)
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'draft' | 'in_progress' | 'shared' | 'completed' | 'archived'
  ) {
    const { data, error } = await this.supabase
      .from('advancing_sessions')
      .update({ status })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
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
  subscribeToSession(sessionId: string, callback: (payload: any) => void) {
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
