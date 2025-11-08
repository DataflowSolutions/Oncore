import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type AdvancingField = Database['public']['Tables']['advancing_fields']['Row']
type AdvancingComment = Database['public']['Tables']['advancing_comments']['Row']
type AdvancingDocument = Database['public']['Tables']['advancing_documents']['Row']

/**
 * AdvancingService - Platform-agnostic service for advancing operations
 * Works with both Next.js (web) and Flutter (mobile)
 * Uses the field-based advancing system with proper real-time subscriptions
 */
export class AdvancingService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new advancing session using RPC function
   * This ensures atomic creation with proper org and show validation
   */
  async createSession(showId: string, orgId: string, title?: string) {
    const { data, error } = await this.supabase
      .rpc('create_advancing_session', {
        p_show_id: showId,
        p_org_id: orgId,
        p_title: title,
      })

    if (error) throw error
    return data
  }

  /**
   * Get session by ID with all related data including fields, comments, and documents
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
            capacity
          ),
          artists (
            id,
            name
          )
        )
      `)
      .eq('id', sessionId)
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
      .select('*')
      .eq('show_id', showId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Get all fields for a session
   */
  async getFields(sessionId: string): Promise<AdvancingField[]> {
    const { data, error } = await this.supabase
      .from('advancing_fields')
      .select('*')
      .eq('session_id', sessionId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Create or update an advancing field
   */
  async upsertField(
    sessionId: string,
    orgId: string,
    fieldData: {
      section: string
      fieldName: string
      fieldType: string
      value?: Database['public']['Tables']['advancing_fields']['Insert']['value']
      status?: 'pending' | 'confirmed'
      partyType: 'from_us' | 'from_you'
      sortOrder?: number
    }
  ): Promise<AdvancingField> {
    const { data: userData } = await this.supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('advancing_fields')
      .insert({
        session_id: sessionId,
        org_id: orgId,
        section: fieldData.section,
        field_name: fieldData.fieldName,
        field_type: fieldData.fieldType,
        value: fieldData.value ?? null,
        status: fieldData.status || 'pending',
        party_type: fieldData.partyType,
        sort_order: fieldData.sortOrder || 1000,
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update field status (pending/confirmed)
   */
  async updateFieldStatus(fieldId: string, status: 'pending' | 'confirmed') {
    const { data, error } = await this.supabase
      .from('advancing_fields')
      .update({ status })
      .eq('id', fieldId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update field value
   */
  async updateFieldValue(fieldId: string, value: Database['public']['Tables']['advancing_fields']['Update']['value']) {
    const { data, error } = await this.supabase
      .from('advancing_fields')
      .update({ value })
      .eq('id', fieldId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete an advancing field
   */
  async deleteField(fieldId: string) {
    const { error } = await this.supabase
      .from('advancing_fields')
      .delete()
      .eq('id', fieldId)

    if (error) throw error
  }

  /**
   * Get comments for a field
   */
  async getComments(fieldId: string): Promise<AdvancingComment[]> {
    const { data, error } = await this.supabase
      .from('advancing_comments')
      .select('*')
      .eq('field_id', fieldId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Add a comment to a field
   */
  async addComment(
    fieldId: string,
    orgId: string,
    body: string,
    authorName?: string
  ): Promise<AdvancingComment> {
    const { data: userData } = await this.supabase.auth.getUser()
    const userId = userData.user?.id

    const { data, error } = await this.supabase
      .from('advancing_comments')
      .insert({
        field_id: fieldId,
        org_id: orgId,
        author_id: userId || null,
        author_name: authorName || userData.user?.email || 'Anonymous',
        body,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get documents for a session
   */
  async getDocuments(sessionId: string): Promise<AdvancingDocument[]> {
    const { data, error } = await this.supabase
      .from('advancing_documents')
      .select(`
        *,
        files (
          id,
          original_name,
          content_type,
          size_bytes,
          storage_path,
          created_at
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Create a document container
   */
  async createDocument(
    sessionId: string,
    orgId: string,
    partyType: 'from_us' | 'from_you',
    label?: string
  ): Promise<AdvancingDocument> {
    const { data: userData } = await this.supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('advancing_documents')
      .insert({
        session_id: sessionId,
        org_id: orgId,
        party_type: partyType,
        label: label || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Subscribe to real-time updates on a session
   * Listens for changes to fields, comments, and documents
   * Note: In Flutter, use supabase.channel() directly
   */
  subscribeToSession(
    sessionId: string,
    callback: (payload: {
      table: string
      eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      new: Record<string, unknown>
      old: Record<string, unknown>
    }) => void
  ): RealtimeChannel {
    const channel = this.supabase
      .channel(`advancing_session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advancing_fields',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => callback({
          table: 'advancing_fields',
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown>,
        })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advancing_comments',
        },
        (payload) => callback({
          table: 'advancing_comments',
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown>,
        })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advancing_documents',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => callback({
          table: 'advancing_documents',
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown>,
        })
      )
      .subscribe()

    return channel
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: RealtimeChannel) {
    await this.supabase.removeChannel(channel)
  }
}
