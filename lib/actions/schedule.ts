'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'

type ScheduleItem = Database['public']['Tables']['schedule_items']['Row']
type ScheduleItemInsert = Database['public']['Tables']['schedule_items']['Insert']
type ScheduleItemUpdate = Database['public']['Tables']['schedule_items']['Update']

export async function getScheduleItemsForShow(showId: string): Promise<ScheduleItem[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('show_id', showId)
    .order('starts_at', { ascending: true })
    
  if (error) {
    console.error('Error fetching schedule items:', error)
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
    console.error('Error creating schedule item:', error)
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
    console.error('Error updating schedule item:', error)
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
    console.error('Error deleting schedule item:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/${orgSlug}/shows/${showId}`)
  return { success: true }
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
    console.error('Error fetching org schedule items:', error)
    return []
  }
  
  return data || []
}