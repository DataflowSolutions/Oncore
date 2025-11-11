/**
 * Performance optimized cache helpers
 * Uses React's cache() to deduplicate requests within a single render
 * 
 * IMPORTANT: Always use static imports for these utilities
 * ✅ DO:   import { getCachedOrg } from '@/lib/cache'
 * ❌ DON'T: const cache = await import('@/lib/cache')
 * 
 * For cache invalidation patterns and best practices, see:
 * @see docs/CACHE_PATTERNS.md
 */

import { cache } from 'react'
import { getSupabaseServer } from './supabase/server'
import { logger } from './logger'

/**
 * Cache organization lookup for the duration of the request
 * This prevents multiple components from fetching the same org
 */
export const getCachedOrg = cache(async (slug: string) => {
  const supabase = await getSupabaseServer()
  
  // Use RPC function to bypass RLS issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_org_by_slug', { p_slug: slug })
  
  if (error) {
    logger.warn('Org lookup failed', { 
      slug,
      errorMessage: error?.message,
      errorCode: error?.code
    })
  }
  
  return { data, error }
})

/**
 * Cache organization subscription status
 * Used frequently in RLS checks and billing displays
 */
export const getCachedOrgSubscription = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  // Use RPC function to bypass RLS issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_org_subscription', { p_org_id: orgId })
  
  return { data, error }
})

/**
 * Cache user's org membership
 * Prevents redundant lookups when checking permissions
 */
export const getCachedOrgMembership = cache(async (orgId: string, _userId: string) => {
  const supabase = await getSupabaseServer()
  // Use RPC function to bypass RLS issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_org_membership', { p_org_id: orgId })
  
  return { data, error }
})

/**
 * Cache user's organizations list
 * Used in navigation and org switcher
 */
export const getCachedUserOrgs = cache(async (_userId: string) => {
  const supabase = await getSupabaseServer()
  // Use RPC function to bypass RLS issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_user_orgs')
  
  return { data, error }
})

/**
 * Cache show details
 * Prevents multiple queries for the same show in different components
 */
export const getCachedShow = cache(async (showId: string) => {
  const supabase = await getSupabaseServer()
  
  try {
    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('get_show_by_id', {
      p_show_id: showId
    })
    
    if (error) {
      console.error('Error in getCachedShow:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Exception in getCachedShow:', error)
    return { data: null, error }
  }
})

/**
 * Cache venues for an org
 * Used in venue selectors across multiple forms
 */
export const getCachedOrgVenues = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, city, country, capacity')
    .eq('org_id', orgId)
    .order('name', { ascending: true })
  
  return { data, error }
})

/**
 * Cache people/team members for an org
 * Used in assignment selectors
 */
export const getCachedOrgPeople = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('people')
    .select('id, name, email, role_title, member_type')
    .eq('org_id', orgId)
    .order('name', { ascending: true })
  
  return { data, error }
})

/**
 * Cache advancing session with show details
 * Used in advancing pages
 */
export const getCachedAdvancingSession = cache(async (sessionId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('advancing_sessions')
    .select(`
      *,
      shows (
        id,
        title,
        date,
        venues (
          name,
          city,
          address
        ),
        artists (
          name
        )
      )
    `)
    .eq('id', sessionId)
    .single()
  
  return { data, error }
})

/**
 * Cache schedule items for a show
 * Used in day view and schedule displays
 */
export const getCachedShowSchedule = cache(async (showId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('schedule_items')
    .select(`
      *,
      people (
        id,
        name
      )
    `)
    .eq('show_id', showId)
    .order('starts_at', { ascending: true })
  
  return { data, error }
})

/**
 * Cache all shows for an org with full details
 * Used in home page and shows list page
 */
export const getCachedOrgShows = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  
  // Use RPC function to bypass RLS issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: shows, error } = await (supabase as any).rpc('get_shows_by_org', {
    p_org_id: orgId
  })

  if (error) {
    console.error('Error in getCachedOrgShows:', error)
    return { data: null, error }
  }

  console.log('Shows fetched:', shows?.length || 0)

  // Transform the flat data structure back to nested format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformedShows = (shows || []).map((show: any) => ({
    id: show.id,
    org_id: show.org_id,
    title: show.title,
    date: show.date,
    venue_id: show.venue_id,
    set_time: show.set_time,
    doors_at: show.doors_at,
    notes: show.notes,
    status: show.status,
    created_at: show.created_at,
    updated_at: show.updated_at,
    venue: show.venue_id ? {
      id: show.venue_id,
      name: show.venue_name,
      city: show.venue_city,
      address: show.venue_address,
      org_id: show.org_id,
      created_at: show.created_at,
      updated_at: show.updated_at,
    } : null,
    show_assignments: null, // TODO: Add show assignments to RPC if needed
  }))
  
  return { data: transformedShows, error: null }
})

/**
 * Cache venues with show counts
 * Used in venues page
 */
export const getCachedOrgVenuesWithCounts = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('venues')
    .select(`
      *,
      shows:shows(count)
    `)
    .eq('org_id', orgId)
    .order('name')
  
  return { data, error }
})

/**
 * Cache all people for an org with full details
 * Used in people page
 */
export const getCachedOrgPeopleFull = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('org_id', orgId)
    .order('name')
  
  return { data, error }
})

/**
 * Cache promoters for an org
 * Used in venues page
 */
export const getCachedPromoters = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      venue_contacts (
        venue_id,
        is_primary,
        venues (
          id,
          name,
          city
        )
      )
    `)
    .eq('org_id', orgId)
    .eq('type', 'promoter')
    .eq('status', 'active')
    .order('name')
  
  // Transform the data to include venues array (same as getPromotersByOrg)
  const transformedData = (data || []).map((promoter) => ({
    ...promoter,
    status: promoter.status as 'active' | 'inactive',
    type: promoter.type as 'promoter' | 'agent' | 'manager' | 'vendor' | 'other',
    venues: promoter.venue_contacts?.map((vp: { venue_id: string; is_primary: boolean | null; venues: { id: string; name: string; city: string | null } }) => ({
      id: vp.venues.id,
      name: vp.venues.name,
      city: vp.venues.city,
      is_primary: vp.is_primary ?? false,
    })) || [],
    venue_contacts: undefined, // Remove the nested structure
  }))
  
  return { data: transformedData, error }
})

/**
 * Cache org invitations
 * Used in people page
 */
export const getCachedOrgInvitations = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      people (
        id,
        name,
        email,
        role_title,
        member_type
      )
    `)
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
  
  return { data: data || [], error }
})

/**
 * Cache available seats check
 * Used in people page
 */
export const getCachedAvailableSeats = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  try {
    const { data, error } = await supabase
      .rpc('check_available_seats', { p_org_id: orgId })
    
    if (error) {
      logger.error('Error checking seats', error)
      return null
    }
    
    // Cast to proper type - RPC returns Json but we know the structure
    return data as unknown as {
      can_invite: boolean;
      seats_used: number;
      seats_available: number;
      plan_name: string | null;
      max_seats: number;
      used_seats: number;
      plan_id: string;
      org_id: string;
    } | null
  } catch (err) {
    logger.error('Error checking seats', err)
    return null
  }
})
