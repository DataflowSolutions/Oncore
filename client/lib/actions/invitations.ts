'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// Type definitions for RPC function returns
export type SeatCheckResult = {
  can_invite: boolean;
  seats_used: number;
  seats_available: number;
  plan_name: string | null;
  max_seats: number;
  used_seats: number;
  plan_id: string;
  org_id: string;
};

export type AcceptInvitationResult = {
  success: boolean;
  message: string;
  org_id: string;
  person_id: string;
};

export type InvitationData = {
  id: string;
  org_id: string;
  person_id: string;
  email: string;
  expires_at: string;
  org_name: string;
  org_slug: string;
  person_first_name: string | null;
  person_last_name: string | null;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
};

/**
 * Invite a person (ghost account) to join the organization
 * Creates an invitation with a secure token and sends an email
 */
export async function invitePerson(
  personId: string, 
  role: 'owner' | 'admin' | 'editor' | 'viewer' = 'viewer'
) {
  const supabase = await getSupabaseServer()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get person details
  const { data: person, error: personError } = await supabase
    .from('people')
    .select('id, org_id, user_id, email, name, role_title, member_type')
    .eq('id', personId)
    .single()

  if (personError || !person) {
    return { success: false, error: 'Person not found' }
  }

  // Check if person already has a user account
  if (person.user_id) {
    return { success: false, error: 'This person already has an account' }
  }

  // Check if person has an email
  if (!person.email) {
    return { success: false, error: 'Person must have an email address' }
  }

  // Check available seats
  const { data: seatCheckData, error: seatError } = await supabase
    .rpc('check_available_seats', { p_org_id: person.org_id })

  if (seatError || !seatCheckData) {
    return { success: false, error: 'Failed to check seat availability' }
  }

  const seatCheck = seatCheckData as SeatCheckResult

  if (!seatCheck.can_invite) {
    return {
      success: false,
      error: 'No available seats',
      seatInfo: seatCheck
    }
  }

  // Check if there's already a pending invitation
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id, token, expires_at')
    .eq('person_id', personId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvitation) {
    return {
      success: false,
      error: 'Invitation already sent',
      invitation: existingInvitation
    }
  }

  // Generate secure token (32 bytes = 256 bits)
  const token = crypto.randomBytes(32).toString('base64url')

  // Set expiration to 7 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      org_id: person.org_id,
      person_id: personId,
      email: person.email,
      role,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id
    })
    .select()
    .single()

  if (inviteError || !invitation) {
    console.error('Error creating invitation:', inviteError)
    return { success: false, error: 'Failed to create invitation' }
  }

  // TODO: Send invitation email
  // await sendInvitationEmail({
  //   to: person.email,
  //   name: person.name,
  //   token: token,
  //   orgId: person.org_id,
  //   roleTitle: person.role_title,
  //   memberType: person.member_type
  // })

  // Revalidate people page
  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', person.org_id)
    .single()

  if (org?.slug) {
    revalidatePath(`/${org.slug}/people`)
  }

  return {
    success: true,
    invitation,
    token, // Return token for testing purposes (remove in production)
    inviteLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/${token}`
  }
}

/**
 * Get invitation details by token (public endpoint)
 */
export async function getInvitation(token: string) {
  const supabase = await getSupabaseServer()

  try {
    const { data: rpcData, error } = await supabase
      .rpc('get_invitation_by_token', { p_token: token })

    if (error) {
      console.error('Error getting invitation:', error)
      return { success: false, error: error.message }
    }

    if (!rpcData) {
      return { success: false, error: 'Invitation not found or expired' }
    }

    const invitation = rpcData as InvitationData

    return { success: true, invitation }
  } catch (err) {
    console.error('Error getting invitation:', err)
    return { success: false, error: 'Failed to get invitation' }
  }
}

/**
 * Accept an invitation and link user account to person record
 * This should be called after the user signs up
 */
export async function acceptInvitation(token: string) {
  const supabase = await getSupabaseServer()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Call RPC to accept invitation
    const { data: rpcData, error } = await supabase
      .rpc('accept_invitation', {
        p_token: token,
        p_user_id: user.id
      })

    if (error) {
      console.error('Error accepting invitation:', error)
      return { success: false, error: error.message }
    }

    const data = rpcData as AcceptInvitationResult

    if (!data || !data.success) {
      return { success: false, error: data?.message || 'Failed to accept invitation' }
    }

    // Revalidate relevant paths
    const { data: org } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', data.org_id)
      .single()

    if (org?.slug) {
      revalidatePath(`/${org.slug}`)
      revalidatePath(`/${org.slug}/people`)
    }

    return {
      success: true,
      orgId: data.org_id,
      personId: data.person_id,
      orgSlug: org?.slug
    }
  } catch (err) {
    console.error('Error accepting invitation:', err)
    return { success: false, error: 'Failed to accept invitation' }
  }
}

/**
 * Resend an invitation (generates new token and extends expiration)
 */
export async function resendInvitation(invitationId: string) {
  const supabase = await getSupabaseServer()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get existing invitation
  const { data: invitation, error: getError } = await supabase
    .from('invitations')
    .select('*, people(email, name, org_id, role_title, member_type)')
    .eq('id', invitationId)
    .is('accepted_at', null)
    .single()

  if (getError || !invitation) {
    return { success: false, error: 'Invitation not found' }
  }

  // Generate new token
  const newToken = crypto.randomBytes(32).toString('base64url')

  // Extend expiration to 7 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Update invitation
  const { data: updated, error: updateError } = await supabase
    .from('invitations')
    .update({
      token: newToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', invitationId)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('Error updating invitation:', updateError)
    return { success: false, error: 'Failed to resend invitation' }
  }

  // TODO: Send invitation email
  // await sendInvitationEmail({
  //   to: invitation.people.email,
  //   name: invitation.people.name,
  //   token: newToken,
  //   orgId: invitation.people.org_id,
  //   roleTitle: invitation.people.role_title,
  //   memberType: invitation.people.member_type
  // })

  // Revalidate people page
  const person = invitation.people
  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', person.org_id)
    .single()

  if (org?.slug) {
    revalidatePath(`/${org.slug}/people`)
  }

  return {
    success: true,
    invitation: updated,
    inviteLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/${newToken}`
  }
}

/**
 * Cancel an invitation (delete it)
 */
export async function cancelInvitation(invitationId: string) {
  const supabase = await getSupabaseServer()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get invitation to get org_id for revalidation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('org_id')
    .eq('id', invitationId)
    .single()

  // Delete invitation
  const { error: deleteError } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)

  if (deleteError) {
    console.error('Error deleting invitation:', deleteError)
    return { success: false, error: 'Failed to cancel invitation' }
  }

  // Revalidate people page
  if (invitation) {
    const { data: org } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', invitation.org_id)
      .single()

    if (org?.slug) {
      revalidatePath(`/${org.slug}/people`)
    }
  }

  return { success: true }
}

/**
 * Get all invitations for an organization
 */
export async function getOrgInvitations(orgId: string) {
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

  if (error) {
    console.error('Error fetching invitations:', error)
    return []
  }

  return data || []
}

/**
 * Get invitation status for a person
 */
export async function getPersonInvitationStatus(personId: string) {
  const supabase = await getSupabaseServer()

  // Check if person has a user account
  const { data: person } = await supabase
    .from('people')
    .select('user_id')
    .eq('id', personId)
    .single()

  if (person?.user_id) {
    return { status: 'active', hasAccount: true }
  }

  // Check for pending invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, expires_at, created_at')
    .eq('person_id', personId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (invitation) {
    return {
      status: 'invited',
      hasAccount: false,
      invitation
    }
  }

  return { status: 'not_invited', hasAccount: false }
}

/**
 * Check available seats for an organization
 */
export async function checkAvailableSeats(orgId: string): Promise<SeatCheckResult | null> {
  const supabase = await getSupabaseServer()

  try {
    const { data, error } = await supabase
      .rpc('check_available_seats', { p_org_id: orgId })

    if (error) {
      console.error('Error checking seats:', error)
      return null
    }

    return data as SeatCheckResult
  } catch (err) {
    console.error('Error checking seats:', err)
    return null
  }
}
