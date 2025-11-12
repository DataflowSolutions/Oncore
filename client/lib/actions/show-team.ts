'use server'
import { logger } from '@/lib/logger'

import { getSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'
import { cache } from 'react'
import { z } from 'zod'

type Person = Database['public']['Tables']['people']['Row']

// Lightweight person for list contexts - omits large text fields
export type PersonListItem = Pick<Person, 'id' | 'name' | 'member_type' | 'email' | 'phone'> & { duty?: string }

// Get all people assigned to a specific show, optionally filtered by party type
// Lightweight version for list contexts - omits large fields like notes, address, etc.
export const getShowTeam = cache(async (showId: string, partyType?: 'from_us' | 'from_you'): Promise<PersonListItem[]> => {
  const supabase = await getSupabaseServer()
  
  try {
    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('get_show_team', {
      p_show_id: showId,
      p_party_type: partyType || null
    })

    if (error) {
      logger.error('Error fetching show team', error)
      throw new Error(`Failed to fetch show team: ${error.message}`)
    }

    return data || []
  } catch (error) {
    logger.error('Exception in getShowTeam', error)
    throw error
  }
})

// Get all available people from the organization (people pool), optionally filtered by party type
// Lightweight version for list contexts - omits large text fields
export const getAvailablePeople = cache(async (orgId: string, partyType?: 'from_us' | 'from_you'): Promise<PersonListItem[]> => {
  const supabase = await getSupabaseServer()
  
  try {
    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('get_available_people', {
      p_org_id: orgId,
      p_party_type: partyType || null
    })

    if (error) {
      logger.error('Error fetching available people', error)
      throw new Error(`Failed to fetch available people: ${error.message}`)
    }

    return data || []
  } catch (error) {
    logger.error('Exception in getAvailablePeople', error)
    throw error
  }
})

// Assign a person to a show
const assignPersonSchema = z.object({
  showId: z.string().uuid(),
  personId: z.string().uuid(),
  duty: z.string().nullable().optional().transform(val => {
    if (!val || val === '') return null
    return val
  })
})

export async function assignPersonToShow(formData: FormData) {
  const supabase = await getSupabaseServer()
  
  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const rawData = {
    showId: formData.get('showId') as string,
    personId: formData.get('personId') as string,
    duty: formData.get('duty') as string
  }

  const validatedData = assignPersonSchema.parse(rawData)

  // Use RPC to assign person to show (bypasses RLS issues)
  const { data, error } = await supabase
    .rpc('assign_person_to_show', {
      p_show_id: validatedData.showId,
      p_person_id: validatedData.personId,
      p_duty: validatedData.duty || null
    })

  if (error) {
    logger.error('Error assigning person to show', error)
    throw new Error(`Failed to assign person to show: ${error.message}`)
  }

  // Revalidate both the layout and the specific show pages
  revalidatePath('/', 'layout')
  return data
}

// Remove a person from a show
export async function removePersonFromShow(showId: string, personId: string) {
  const supabase = await getSupabaseServer()
  
  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  // Use RPC to remove person from show (bypasses RLS issues)
  const { error } = await supabase
    .rpc('remove_person_from_show', {
      p_show_id: showId,
      p_person_id: personId
    })

  if (error) {
    logger.error('Error removing person from show', error)
    throw new Error(`Failed to remove person from show: ${error.message}`)
  }

  // Revalidate both the layout and the specific show pages
  revalidatePath('/', 'layout')
}