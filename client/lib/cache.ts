/**
 * Performance optimized cache helpers
 * Uses React's cache() to deduplicate requests within a single render
 */

import { cache } from 'react'
import { getSupabaseServer } from './supabase/server'

/**
 * Cache organization lookup for the duration of the request
 * This prevents multiple components from fetching the same org
 */
export const getCachedOrg = cache(async (slug: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  
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
