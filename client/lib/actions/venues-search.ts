'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Search venues by name and city for an organization (client-safe)
export async function searchVenues(orgId: string, searchTerm: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .rpc('get_org_venues_with_counts', { p_org_id: orgId })

  if (error) {
    logger.error('Error searching venues', error)
    throw new Error(`Failed to search venues: ${error.message}`)
  }

  // Filter results client-side
  const searchLower = searchTerm.toLowerCase()
  const filtered = (data || []).filter(v => 
    v.name?.toLowerCase().includes(searchLower) || 
    v.city?.toLowerCase().includes(searchLower)
  )

  return filtered.slice(0, 10)
}

// Get all venues for an organization (client-safe)
export async function getVenuesByOrg(orgId: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .rpc('get_org_venues_with_counts', { p_org_id: orgId })

  if (error) {
    logger.error('Error fetching venues', error)
    throw new Error(`Failed to fetch venues: ${error.message}`)
  }

  return data || []
}