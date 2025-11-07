/**
 * Performance optimized cache helpers
 * Uses React's cache() to deduplicate requests within a single render
 */

import { cache } from 'react'
import { getSupabaseServer } from './supabase/server'
import { logger } from './logger'

/**
 * Cache organization lookup for the duration of the request
 * This prevents multiple components from fetching the same org
 */
export const getCachedOrg = cache(async (slug: string) => {
  logger.debug('Cache: getCachedOrg called', { slug });
  
  const supabase = await getSupabaseServer()
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  logger.debug('Cache: User authenticated', { authenticated: !!user });
  
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  
  if (error) {
    logger.warn('Cache: Org lookup failed', { 
      found: !!data, 
      errorMessage: error?.message,
      errorCode: error?.code
    });
  }
  
  // If RLS is blocking, check if user is an org member
  if (!data && user) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .limit(5)
    logger.debug('Cache: User memberships fetched', { count: membership?.length ?? 0 });
  }
  
  return { data, error }
})

/**
 * Cache organization subscription status
 * Used frequently in RLS checks and billing displays
 */
export const getCachedOrgSubscription = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('org_subscriptions')
    .select('status, plan_id, current_period_end, current_period_start')
    .eq('org_id', orgId)
    .single()
  
  return { data, error }
})

/**
 * Cache user's org membership
 * Prevents redundant lookups when checking permissions
 */
export const getCachedOrgMembership = cache(async (orgId: string, userId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()
  
  return { data, error }
})

/**
 * Cache user's organizations list
 * Used in navigation and org switcher
 */
export const getCachedUserOrgs = cache(async (userId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('org_members')
    .select(`
      role,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  
  return { data, error }
})

/**
 * Cache show details
 * Prevents multiple queries for the same show in different components
 */
export const getCachedShow = cache(async (showId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('shows')
    .select(`
      id,
      title,
      date,
      doors_at,
      set_time,
      status,
      notes,
      org_id,
      venues (
        id,
        name,
        address,
        city,
        country,
        capacity
      ),
      artists (
        id,
        name
      )
    `)
    .eq('id', showId)
    .single()
  
  return { data, error }
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
  const { data, error } = await supabase
    .from('shows')
    .select(`
      *,
      venue:venues(*),
      show_assignments(
        people(*)
      )
    `)
    .eq('org_id', orgId)
    .order('date', { ascending: true })
  
  return { data, error }
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
