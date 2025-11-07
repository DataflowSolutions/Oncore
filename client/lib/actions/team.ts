'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'

type Person = Database['public']['Tables']['people']['Row']
type PersonInsert = Database['public']['Tables']['people']['Insert']
type PersonUpdate = Database['public']['Tables']['people']['Update']
type OrgMember = Database['public']['Tables']['org_members']['Row']

// Get all people (crew members) for an organization
export async function getPeopleByOrg(orgId: string): Promise<Person[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (error) {
    logger.error('Error fetching people', error)
    throw new Error(`Failed to fetch people: ${error.message}`)
  }

  return data || []
}

// Get detailed person information including show assignments
export async function getPersonDetails(personId: string) {
  const supabase = await getSupabaseServer()
  
  // Get person basic info
  const { data: person, error: personError } = await supabase
    .from('people')
    .select('*')
    .eq('id', personId)
    .single()

  if (personError) {
    logger.error('Error fetching person', personError)
    throw new Error(`Failed to fetch person: ${personError.message}`)
  }

  // Get show assignments with show details
  const { data: assignments, error: assignmentsError } = await supabase
    .from('show_assignments')
    .select(`
      duty,
      shows (
        id,
        title,
        date,
        status,
        venues (
          name,
          city
        )
      )
    `)
    .eq('person_id', personId)
    .order('shows(date)', { ascending: false })

  if (assignmentsError) {
    logger.error('Error fetching show assignments', assignmentsError)
    // Don't throw error, just return empty assignments
  }

  return {
    person,
    assignments: assignments || []
  }
}

// Get organization members (users with accounts)
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at')

  if (error) {
    logger.error('Error fetching org members', error)
    throw new Error(`Failed to fetch org members: ${error.message}`)
  }

  return data || []
}

// Create a new person (crew member)
const createPersonSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional().or(z.literal('')),
  roleTitle: z.string().nullable().optional().or(z.literal('')),
  notes: z.string().nullable().optional().or(z.literal('')),
  experience: z.string().nullable().optional().or(z.literal('')),
  memberType: z.string().optional().transform(val => {
    if (!val || val === '') return null
    // Convert to proper case for database enum
    const typeMap: Record<string, string> = {
      'artist': 'Artist',
      'crew': 'Crew', 
      'agent': 'Agent',
      'manager': 'Manager'
    }
    const convertedVal = typeMap[val.toLowerCase()]
    if (convertedVal) return convertedVal
    throw new Error(`Invalid member type: ${val}`)
  })
})

export async function createPerson(formData: FormData) {
  const supabase = await getSupabaseServer()
  
  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const rawData = {
    orgId: formData.get('orgId') as string,
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    roleTitle: formData.get('roleDescription') as string || formData.get('roleTitle') as string,
    notes: formData.get('notes') as string,
    experience: (formData.get('experience') as string) || '',
    memberType: formData.get('memberType') as string || ''
  }

  const validatedData = createPersonSchema.parse(rawData)

  // Verify user has access to this organization
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', validatedData.orgId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw new Error('You do not have permission to add people to this organization')
  }

  // Combine notes and experience information (but not member type - that goes in its own column)
  let combinedNotes = ''
  
  // Add experience if provided
  if (validatedData.experience && validatedData.experience.trim()) {
    const experienceNote = `Experience: ${validatedData.experience.trim()} years`
    combinedNotes = experienceNote
  }
  
  // Add user notes if provided
  if (validatedData.notes && validatedData.notes.trim()) {
    combinedNotes = combinedNotes 
      ? `${combinedNotes}\n\n${validatedData.notes.trim()}`
      : validatedData.notes.trim()
  }

  const personData: PersonInsert = {
    org_id: validatedData.orgId,
    name: validatedData.name,
    email: validatedData.email || null,
    phone: validatedData.phone || null,
    role_title: validatedData.roleTitle || null,
    notes: combinedNotes || null,
    member_type: validatedData.memberType as Database['public']['Enums']['member_type']
  }

  const { data, error } = await supabase
    .from('people')
    .insert(personData)
    .select()
    .single()

  if (error) {
    logger.error('Error creating person', error)
    throw new Error(`Failed to create person: ${error.message}`)
  }

  // Get org slug for revalidation
  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', validatedData.orgId)
    .single()
  
  if (org?.slug) {
    revalidatePath(`/${org.slug}/people`, 'page')
    revalidatePath(`/${org.slug}/people/crew`, 'page')
    revalidatePath(`/${org.slug}/people/artist`, 'page')
  }
  
  return data
}

// Update a person
export async function updatePerson(personId: string, updates: PersonUpdate) {
  const supabase = await getSupabaseServer()
  
  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  // Get the person to check org access
  const { data: person } = await supabase
    .from('people')
    .select('org_id')
    .eq('id', personId)
    .single()

  if (!person) {
    throw new Error('Person not found')
  }

  // Verify user has access to this organization
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', person.org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw new Error('You do not have permission to update this person')
  }

  const { data, error } = await supabase
    .from('people')
    .update(updates)
    .eq('id', personId)
    .select()
    .single()

  if (error) {
    logger.error('Error updating person', error)
    throw new Error(`Failed to update person: ${error.message}`)
  }

  // Get org slug for revalidation
  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', person.org_id)
    .single()
  
  if (org?.slug) {
    revalidatePath(`/${org.slug}/people`, 'page')
    revalidatePath(`/${org.slug}/people/crew`, 'page')
    revalidatePath(`/${org.slug}/people/artist`, 'page')
  }
  
  return data
}

// Delete a person
export async function deletePerson(personId: string, orgId: string) {
  const supabase = await getSupabaseServer()
  
  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  // Verify user has access to this organization
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw new Error('You do not have permission to delete people from this organization')
  }

  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', personId)
    .eq('org_id', orgId) // Extra safety check

  if (error) {
    logger.error('Error deleting person', error)
    throw new Error(`Failed to delete person: ${error.message}`)
  }

  // Get org slug for revalidation
  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', orgId)
    .single()
  
  if (org?.slug) {
    revalidatePath(`/${org.slug}/people`, 'page')
    revalidatePath(`/${org.slug}/people/crew`, 'page')
    revalidatePath(`/${org.slug}/people/artist`, 'page')
  }
}

// Invite a user to become an org member (this would integrate with auth flow)
const inviteMemberSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer'])
})

export async function inviteOrgMember(formData: FormData) {
  const supabase = await getSupabaseServer()
  
  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const rawData = {
    orgId: formData.get('orgId') as string,
    email: formData.get('email') as string,
    role: formData.get('role') as string
  }

  const validatedData = inviteMemberSchema.parse(rawData)

  // Verify user has admin access to this organization
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', validatedData.orgId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    throw new Error('You must be an admin to invite new members')
  }

  // For now, we'll just create a placeholder entry
  // In a real app, this would send an email invitation
  // and the user would complete signup to be added to org_members
  
  logger.debug('Would send invitation', { email: validatedData.email, role: validatedData.role })
  
  // TODO: Implement actual email invitation system
  // This might involve:
  // 1. Creating an invitation record
  // 2. Sending an email with a signup link
  // 3. The signup flow would then add them to org_members
  
  // Get org slug for revalidation
  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', validatedData.orgId)
    .single()
  
  if (org?.slug) {
    revalidatePath(`/${org.slug}/people`, 'page')
  }
  
  return { success: true, message: 'Invitation functionality coming soon!' }
}