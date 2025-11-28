'use server'
import { logger } from '@/lib/logger'

import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// Helper: send invitation email via Supabase Edge Function (send-email)
async function sendInvitationEmail(payload: {
  to: string
  inviterName?: string
  orgName?: string
  inviteLink: string
}) {
  try {
    const isProduction = process.env.PROD_DB === 'true'
    const supabaseUrl = isProduction
      ? process.env.PROD_SUPABASE_URL!
      : process.env.LOCAL_SUPABASE_URL!

    // Get the current user's session to send authenticated request
    const supabase = await getSupabaseServer()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      logger.error('No session found when trying to send invitation email')
      return { success: false, error: 'Not authenticated' }
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Send the user's auth token, not the anon key
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        to: payload.to,
        subject: `${payload.inviterName || 'Someone'} invited you to join ${payload.orgName || 'Oncore'}`,
        type: 'invitation',
        data: {
          inviterName: payload.inviterName,
          orgName: payload.orgName,
          inviteLink: payload.inviteLink,
        },
      }),
    })

    if (!res.ok) {
      const txt = await res.text()
      logger.error('Failed to send invitation email', txt)
      return { success: false, error: txt }
    }

    const json = await res.json()
    return { success: true, result: json }
  } catch (err) {
    logger.error('Error sending invitation email', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

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
 * Note: The person's role should already be set in the people table
 */
export async function invitePerson(personId: string) {
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

  // Create invitation (note: role is not stored in invitations table)
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      org_id: person.org_id,
      person_id: personId,
      email: person.email,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id
    })
    .select()
    .single()

  if (inviteError || !invitation) {
    logger.error('Error creating invitation', inviteError)
    return { success: false, error: 'Failed to create invitation' }
  }

  // Fetch org name/slug so we can include it in the email and revalidate paths using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc('get_org_by_id', {
    p_org_id: person.org_id
  })

  // Send invitation email (best-effort: log errors but don't fail the flow)
  try {
  const inviterName = ((user.user_metadata as { full_name?: string } | undefined)?.full_name) || user.email || 'Someone'
    const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/${token}`

    const emailResult = await sendInvitationEmail({
      to: person.email,
      inviterName,
      orgName: org?.name,
      inviteLink,
    })

    if (!emailResult.success) {
      logger.error('Invitation email failed to send', emailResult.error)
    }
  } catch (err) {
    logger.error('Unexpected error sending invitation email', err)
  }

  // Revalidate people page
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
      logger.error('Error getting invitation', error)
      return { success: false, error: error.message }
    }

    if (!rpcData) {
      return { success: false, error: 'Invitation not found or expired' }
    }

    const invitation = rpcData as InvitationData

    return { success: true, invitation }
  } catch (err) {
    logger.error('Error getting invitation', err)
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
      logger.error('Error accepting invitation', error)
      return { success: false, error: error.message }
    }

    const data = rpcData as AcceptInvitationResult

    if (!data || !data.success) {
      return { success: false, error: data?.message || 'Failed to accept invitation' }
    }

    // Revalidate relevant paths using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org } = await (supabase as any).rpc('get_org_by_id', {
      p_org_id: data.org_id
    })

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
    logger.error('Error accepting invitation', err)
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
    logger.error('Error updating invitation', updateError)
    return { success: false, error: 'Failed to resend invitation' }
  }
  // Send invitation email (best-effort)
  // Prepare person object (from the joined people relation)
  const person = invitation.people

  try {
  const inviterName = ((user.user_metadata as { full_name?: string } | undefined)?.full_name) || user.email || 'Someone'
    const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/${newToken}`

    // Get org name for email content using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orgInfo } = await (supabase as any).rpc('get_org_by_id', {
      p_org_id: invitation.people.org_id
    })

    if (invitation.people.email) {
      const emailResult = await sendInvitationEmail({
        to: invitation.people.email,
        inviterName,
        orgName: orgInfo?.name,
        inviteLink,
      })

      if (!emailResult.success) {
        logger.error('Resend invitation email failed', emailResult.error)
      }
    } else {
      logger.warn('No email available on invitation.people; skipping resend email')
    }
  } catch (err) {
    logger.error('Unexpected error resending invitation email', err)
  }

  // Revalidate people page using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc('get_org_by_id', {
    p_org_id: person.org_id
  })

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
    logger.error('Error deleting invitation', deleteError)
    return { success: false, error: 'Failed to cancel invitation' }
  }

  // Revalidate people page using RPC
  if (invitation) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org } = await (supabase as any).rpc('get_org_by_id', {
      p_org_id: invitation.org_id
    })

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
    logger.error('Error fetching invitations', error)
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
      logger.error('Error checking seats', error)
      return null
    }

    return data as SeatCheckResult
  } catch (err) {
    logger.error('Error checking seats', err)
    return null
  }
}
