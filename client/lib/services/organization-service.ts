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

  async inviteMember(orgId: string, email: string, role: 'owner' | 'admin' | 'member') {
    const { data, error } = await this.supabase
      .from('org_invitations')
      .insert([{
        org_id: orgId,
        email,
        role,
        invited_by: (await this.supabase.auth.getUser()).data.user?.id,
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeMember(orgId: string, userId: string) {
    const { error } = await this.supabase
      .from('org_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId)

    if (error) throw error
  }

  async updateMemberRole(
    orgId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member'
  ) {
    const { data, error } = await this.supabase
      .from('org_members')
      .update({ role })
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
