'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

type Person = Database['public']['Tables']['people']['Row']
type ShowAssignmentInsert = Database['public']['Tables']['show_assignments']['Insert']

// Get all people assigned to a specific show
export async function getShowTeam(showId: string): Promise<(Person & { duty?: string })[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('show_assignments')
    .select(`
      duty,
      people (*)
    `)
    .eq('show_id', showId)

  if (error) {
    console.error('Error fetching show team:', error)
    throw new Error(`Failed to fetch show team: ${error.message}`)
  }

  // Transform the data to include duty in the person object
  const teamMembers = (data || []).map(assignment => ({
    ...assignment.people,
    duty: assignment.duty
  })) as (Person & { duty?: string })[]

  return teamMembers
}

// Get all available people from the organization (people pool)
export async function getAvailablePeople(orgId: string): Promise<Person[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (error) {
    console.error('Error fetching available people:', error)
    throw new Error(`Failed to fetch available people: ${error.message}`)
  }

  return data || []
}

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

  // Verify user has access to this show's organization
  const { data: show } = await supabase
    .from('shows')
    .select('org_id')
    .eq('id', validatedData.showId)
    .single()

  if (!show) {
    throw new Error('Show not found')
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', show.org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw new Error('You do not have permission to assign people to this show')
  }

  const assignmentData: ShowAssignmentInsert = {
    show_id: validatedData.showId,
    person_id: validatedData.personId,
    duty: validatedData.duty || null
  }

  const { data, error } = await supabase
    .from('show_assignments')
    .insert(assignmentData)
    .select()
    .single()

  if (error) {
    console.error('Error assigning person to show:', error)
    throw new Error(`Failed to assign person to show: ${error.message}`)
  }

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

  // Verify user has access to this show's organization
  const { data: show } = await supabase
    .from('shows')
    .select('org_id')
    .eq('id', showId)
    .single()

  if (!show) {
    throw new Error('Show not found')
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', show.org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw new Error('You do not have permission to modify this show team')
  }

  const { error } = await supabase
    .from('show_assignments')
    .delete()
    .eq('show_id', showId)
    .eq('person_id', personId)

  if (error) {
    console.error('Error removing person from show:', error)
    throw new Error(`Failed to remove person from show: ${error.message}`)
  }

  revalidatePath('/', 'layout')
}