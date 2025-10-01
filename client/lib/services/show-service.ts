import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../database.types'

type Tables = Database['public']['Tables']
type Show = Tables['shows']['Row']

/**
 * ShowService - Platform-agnostic service for show operations
 * Works with both Next.js (web) and Flutter (mobile)
 * 
 * Usage in Next.js:
 *   const supabase = await getSupabaseServer()
 *   const service = new ShowService(supabase)
 *   const shows = await service.getShowsByOrg(orgId)
 * 
 * Usage in Flutter:
 *   final supabase = Supabase.instance.client
 *   // Implement similar queries directly in Dart
 */
export class ShowService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getShowsByOrg(orgId: string) {
    const { data, error } = await this.supabase
      .from('shows')
      .select(`
        *,
        venues (
          id,
          name,
          city,
          state,
          country
        )
      `)
      .eq('org_id', orgId)
      .order('date', { ascending: false })

    if (error) throw error
    return data
  }

  async getShowById(showId: string) {
    const { data, error } = await this.supabase
      .from('shows')
      .select(`
        *,
        venues (*),
        advancing_sessions (
          id,
          access_code,
          status,
          created_at
        )
      `)
      .eq('id', showId)
      .single()

    if (error) throw error
    return data
  }

  async createShow(show: Tables['shows']['Insert']) {
    const { data, error } = await this.supabase
      .from('shows')
      .insert([show])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateShow(showId: string, updates: Tables['shows']['Update']) {
    const { data, error } = await this.supabase
      .from('shows')
      .update(updates)
      .eq('id', showId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteShow(showId: string) {
    const { error } = await this.supabase
      .from('shows')
      .delete()
      .eq('id', showId)

    if (error) throw error
  }

  async getUpcomingShows(orgId: string, limit = 10) {
    const { data, error } = await this.supabase
      .from('shows')
      .select(`
        *,
        venues (name, city, state)
      `)
      .eq('org_id', orgId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data
  }

  async getShowStats(orgId: string) {
    const { data, error } = await this.supabase
      .rpc('get_show_stats', { p_org_id: orgId })

    if (error) throw error
    return data
  }
}
