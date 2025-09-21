'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'
import { z } from 'zod'

type Person = Database['public']['Tables']['people']['Row']
type ShowAssignmentInsert = Database['public']['Tables']['show_assignments']['Insert']

// Get all people assigned to a specific show, optionally filtered by party type
export async function getShowTeam(showId: string, partyType?: 'from_us' | 'from_you'): Promise<(Person & { duty?: string })[]> {
  noStore() // Prevent caching to ensure fresh data
  console.log(`[SERVER] getShowTeam called with showId: ${showId}, partyType: ${partyType}`)
  
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
  let teamMembers = (data || []).map(assignment => ({
    ...assignment.people,
    duty: assignment.duty
  })) as (Person & { duty?: string })[]

  console.log(`[SERVER] Raw team members before filtering:`, teamMembers.length)

  // Filter by party type based on member_type
  if (partyType) {
    const beforeFilter = teamMembers.length
    teamMembers = teamMembers.filter(member => {
      if (partyType === 'from_us') {
        // Artist team: Artists, Crew, Managers, Agents
        const isArtistTeam = ['Artist', 'Crew', 'Manager', 'Agent'].includes(member.member_type || '')
        console.log(`[SERVER] Member ${member.name} (${member.member_type}) - Artist team: ${isArtistTeam}`)
        return isArtistTeam
      } else {
        // Promoter team: Only show people with promoter-specific member types
        // Since no promoter member types exist yet, return empty for promoter team
        // TODO: Add member types like "Promoter", "Venue Staff", "Sound Engineer", etc.
        const promoterTypes = ['Promoter', 'Venue Staff', 'Sound Engineer', 'Local Crew']
        const isPromoterTeam = promoterTypes.includes(member.member_type || '')
        console.log(`[SERVER] Member ${member.name} (${member.member_type}) - Promoter team: ${isPromoterTeam}`)
        return isPromoterTeam
      }
    })
    console.log(`[SERVER] Filtered team members: ${beforeFilter} -> ${teamMembers.length} for party ${partyType}`)
  }

  return teamMembers
}

// Get all available people from the organization (people pool), optionally filtered by party type
export async function getAvailablePeople(orgId: string, partyType?: 'from_us' | 'from_you'): Promise<Person[]> {
  noStore() // Prevent caching to ensure fresh data
  console.log(`[SERVER] getAvailablePeople called with orgId: ${orgId}, partyType: ${partyType}`)
  
  const supabase = await getSupabaseServer()
  
  let query = supabase
    .from('people')
    .select('*')
    .eq('org_id', orgId)

  // Filter by member type based on party
  if (partyType === 'from_us') {
    // Artist team: Artists, Crew, Managers, Agents
    query = query.in('member_type', ['Artist', 'Crew', 'Manager', 'Agent'])
  } else if (partyType === 'from_you') {
    // Promoter team: No promoter member types exist in the current schema
    // Return empty result by filtering to impossible condition
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await query.order('name')

  if (error) {
    console.error('Error fetching available people:', error)
    throw new Error(`Failed to fetch available people: ${error.message}`)
  }

  console.log(`[SERVER] Available people fetched: ${(data || []).length} for party ${partyType}`)
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