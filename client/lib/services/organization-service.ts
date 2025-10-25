/* eslint-disable @typescript-eslint/no-unused-vars */
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../database.types'

type Tables = Database['public']['Tables']

/**
 * OrganizationService - Platform-agnostic service for organization operations
 * Works with both Next.js (web) and Flutter (mobile)
 */
export class OrganizationService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getOrganization(orgId: string) {
    const { data, error } = await this.supabase
      .from('organizations')
      .select(`
        *,
        org_members (
          id,
          user_id,
          role,
          created_at,
          users (
            id,
            email,
            full_name
          )
        )
      `)
      .eq('id', orgId)
      .single()

    if (error) throw error
    return data
  }

  async getOrganizationsByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('org_members')
      .select(`
        role,
        created_at,
        organizations (
          id,
          name,
          slug,
          avatar_url,
          created_at
        )
      `)
      .eq('user_id', userId)

    if (error) throw error
    return data
  }

  async createOrganization(org: Tables['organizations']['Insert']) {
    const { data, error } = await this.supabase
      .from('organizations')
      .insert([org])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateOrganization(orgId: string, updates: Tables['organizations']['Update']) {
    const { data, error } = await this.supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * @deprecated Invitation system has changed. Use invitation actions instead.
   * The invitations table now requires person_id, token, and expires_at.
   * Role enum changed from 'member' to 'editor'/'viewer'.
   */
  async inviteMember(_orgId: string, _email: string, _role: 'owner' | 'admin' | 'member') {
    throw new Error('inviteMember is deprecated. Use invitation actions from lib/actions/invitations.ts')
  }

  async removeMember(orgId: string, userId: string) {
    const { error } = await this.supabase
      .from('org_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId)

    if (error) throw error
  }

  /**
   * @deprecated Role enum changed from 'member' to 'editor'/'viewer'
   */
  async updateMemberRole(
    _orgId: string,
    _userId: string,
    _role: 'owner' | 'admin' | 'member'
  ) {
    throw new Error('updateMemberRole is deprecated. Update to use editor/viewer roles')
  }
}
