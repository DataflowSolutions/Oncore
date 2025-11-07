'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

type ScheduleItem = Database['public']['Tables']['schedule_items']['Row']
type ScheduleItemInsert = Database['public']['Tables']['schedule_items']['Insert']
type ScheduleItemUpdate = Database['public']['Tables']['schedule_items']['Update']

// Schedule visibility types
export type ScheduleVisibility = 'all' | 'artist_team' | 'promoter_team' | 'crew' | 'management' | 'venue_staff' | 'security' | 'session_specific'

// Schedule item types for categorization
export type ScheduleItemType = 'custom' | 'load_in' | 'soundcheck' | 'doors' | 'set_time' | 'load_out' | 'arrival' | 'departure' | 'hotel' | 'transport' | 'catering' | 'meeting' | 'press' | 'technical'

export async function getScheduleItemsForShow(showId: string): Promise<ScheduleItem[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('show_id', showId)
    .order('priority', { ascending: true })
    .order('starts_at', { ascending: true })
    
  if (error) {
    logger.error('Error fetching schedule items', error)
    return []
  }
  
  return data || []
}

// Get schedule items filtered by visibility/role
export async function getScheduleItemsForRole(
  showId: string, 
  visibility: ScheduleVisibility[] = ['all'],
  sessionId?: string
): Promise<ScheduleItem[]> {
  const supabase = await getSupabaseServer()
  
  let query = supabase
    .from('schedule_items')
    .select('*')
    .eq('show_id', showId)
    .in('visibility', visibility)
  
  // If sessionId provided, also include session-specific items
  if (sessionId) {
    query = supabase
      .from('schedule_items')
      .select('*')
      .eq('show_id', showId)
      .or(`visibility.in.(${visibility.join(',')}),session_id.eq.${sessionId}`)
  }
  
  const { data, error } = await query
    .order('priority', { ascending: true })
    .order('starts_at', { ascending: true })
    
  if (error) {
    logger.error('Error fetching filtered schedule items', error)
    return []
  }
  
  return data || []
}

// Get global (shared) schedule items only
export async function getGlobalScheduleItems(showId: string): Promise<ScheduleItem[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('show_id', showId)
    .eq('visibility', 'all')
    .is('session_id', null)
    .order('priority', { ascending: true })
    .order('starts_at', { ascending: true })
    
  if (error) {
    logger.error('Error fetching global schedule items', error)
    return []
  }
  
  return data || []
}

export async function createScheduleItem(
  orgSlug: string,
  showId: string,
  scheduleItem: Omit<ScheduleItemInsert, 'org_id' | 'show_id'>
): Promise<{ success: boolean; error?: string; data?: ScheduleItem }> {
  const supabase = await getSupabaseServer()
  
  // Get org_id from org slug
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()
    
  if (orgError || !org) {
    return { success: false, error: 'Organization not found' }
  }
  
  const { data, error } = await supabase
    .from('schedule_items')
    .insert({
      ...scheduleItem,
      org_id: org.id,
      show_id: showId
    })
    .select()
    .single()
    
  if (error) {
    logger.error('Error creating schedule item', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/${orgSlug}/shows/${showId}`)
  return { success: true, data }
}

export async function updateScheduleItem(
  orgSlug: string,
  showId: string,
  itemId: string,
  updates: ScheduleItemUpdate
): Promise<{ success: boolean; error?: string; data?: ScheduleItem }> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('schedule_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()
    
  if (error) {
    logger.error('Error updating schedule item', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/${orgSlug}/shows/${showId}`)
  return { success: true, data }
}

export async function deleteScheduleItem(
  orgSlug: string,
  showId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer()
  
  const { error } = await supabase
    .from('schedule_items')
    .delete()
    .eq('id', itemId)
    
  if (error) {
    logger.error('Error deleting schedule item', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/${orgSlug}/shows/${showId}`)
  return { success: true }
}

// Auto-generate schedule items from advancing session fields
export async function generateScheduleFromAdvancing(
  orgSlug: string,
  showId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string; created?: number }> {
  const supabase = await getSupabaseServer()
  
  // Get advancing fields that could become schedule items
  const { data: fields, error: fieldsError } = await supabase
    .from('advancing_fields')
    .select('*')
    .eq('session_id', sessionId)
    .in('field_type', ['time', 'text'])
    .not('value', 'is', null)
    
  if (fieldsError) {
    return { success: false, error: 'Failed to fetch advancing fields' }
  }
  
  if (!fields || fields.length === 0) {
    return { success: true, created: 0 }
  }
  
  // Get org_id
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()
    
  if (!org) {
    return { success: false, error: 'Organization not found' }
  }
  
  const scheduleItems: ScheduleItemInsert[] = []
  
  // Process advancing fields and convert relevant ones to schedule items
  for (const field of fields) {
    const fieldValue = field.value as Record<string, unknown>
    let scheduleItem: Partial<ScheduleItemInsert> | null = null
    
    // Handle time-based fields
    if (field.field_type === 'time' && fieldValue?.time && typeof fieldValue.time === 'string') {
      scheduleItem = {
        org_id: org.id,
        show_id: showId,
        title: field.field_name,
        starts_at: fieldValue.time,
        notes: `Auto-generated from advancing: ${field.section} (${field.party_type})`
      }
    }
    
    // Handle text fields that contain time information
    if (field.field_type === 'text' && fieldValue?.text && typeof fieldValue.text === 'string') {
      const timeMatch = extractTimeFromText(fieldValue.text)
      if (timeMatch) {
        scheduleItem = {
          org_id: org.id,
          show_id: showId,
          title: field.field_name,
          starts_at: timeMatch,
          notes: `Auto-generated from advancing: ${field.section} (${field.party_type})`
        }
      }
    }
    
    if (scheduleItem) {
      scheduleItems.push(scheduleItem as ScheduleItemInsert)
    }
  }
  
  if (scheduleItems.length === 0) {
    return { success: true, created: 0 }
  }
  
  // Insert schedule items
  const { error: insertError } = await supabase
    .from('schedule_items')
    .insert(scheduleItems)
    
  if (insertError) {
    logger.error('Error inserting auto-generated schedule items', insertError)
    return { success: false, error: insertError.message }
  }
  
  revalidatePath(`/${orgSlug}/shows/${showId}`)
  revalidatePath(`/${orgSlug}/shows/${showId}/day`)
  
  return { success: true, created: scheduleItems.length }
}

// Helper functions for schedule generation (will be enhanced after DB migration)

function extractTimeFromText(text: string): string | null {
  // Simple regex to extract time patterns like "14:30", "2:30 PM", etc.
  const timePatterns = [
    /\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/, // 24-hour format
    /\b(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)\b/i, // 12-hour format
  ]
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern)
    if (match) {
      // Convert to 24-hour format for database storage
      let hours = parseInt(match[1])
      const minutes = match[2]
      
      if (match[3] && match[3].toUpperCase() === 'PM' && hours !== 12) {
        hours += 12
      } else if (match[3] && match[3].toUpperCase() === 'AM' && hours === 12) {
        hours = 0
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}:00`
    }
  }
  
  return null
}

export async function getScheduleItemsForOrg(orgSlug: string): Promise<ScheduleItem[]> {
  const supabase = await getSupabaseServer()
  
  // Get org_id from org slug
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()
    
  if (orgError || !org) {
    return []
  }
  
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('org_id', org.id)
    .order('starts_at', { ascending: true })
    
  if (error) {
    logger.error('Error fetching org schedule items', error)
    return []
  }
  
  return data || []
}