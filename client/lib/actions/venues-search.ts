'use server'

import { getSupabaseServer } from '@/lib/supabase/server'

// Search venues by name and city for an organization (client-safe)
export async function searchVenues(orgId: string, searchTerm: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('org_id', orgId)
    .or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
    .order('name')
    .limit(10)

  if (error) {
    console.error('Error searching venues:', error)
    throw new Error(`Failed to search venues: ${error.message}`)
  }

  return data || []
}

// Get all venues for an organization (client-safe)
export async function getVenuesByOrg(orgId: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (error) {
    console.error('Error fetching venues:', error)
    throw new Error(`Failed to fetch venues: ${error.message}`)
  }

  return data || []
}