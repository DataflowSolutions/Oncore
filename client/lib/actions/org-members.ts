// @ts-nocheck
'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { OrgRole } from '@/lib/utils/role-permissions'

type OrgMember = Database['public']['Tables']['org_members']['Row']
type OrgMemberWithUser = OrgMember & {
  user_email: string
  user_name: string | null
}

/**
 * Get all members of an organization with their user and person details
 */
export async function getOrgMembers(orgId: string): Promise<OrgMemberWithUser[]> {
  const supabase = await getSupabaseServer()
  // Supabase typings can be strict in server actions; cast to bypass noisy overload resolution.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseClient = supabase as any
  
  const { data, error } = await supabaseClient
    .from('org_members')
    .select(`
      *
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching org members', error)
    throw new Error(`Failed to fetch org members: ${error.message}`)
  }

  // Fetch user details separately for each member
  const members = (data || []) as OrgMember[]
  const membersWithDetails: OrgMemberWithUser[] = await Promise.all(
    members.map(async (member) => {
      // Fetch user details
      const { data: userData } = await supabase.auth.admin.getUserById(member.user_id)
      
      const userEmail = userData?.user?.email || 'Unknown'
      const userName = (userData?.user?.user_metadata as { full_name?: string })?.full_name || null

      return {
        ...member,
        user_email: userEmail,
        user_name: userName
      }
    })
  )

  return membersWithDetails
}

/**
 * Get the current user's role in an organization
 */
export async function getCurrentUserRole(orgId: string): Promise<OrgRole | null> {
  const supabase = await getSupabaseServer()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseClient = supabase as any
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return null
  }

  const { data, error } = await supabaseClient
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return null
  }

  return data.role as OrgRole
}

/**
 * Update a member's role
 * Only owners and admins can update roles
 * Owners cannot be demoted by admins
 */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  newRole: OrgRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseClient = supabase as any
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if current user has permission to update roles
  const { data: currentUserMembership } = await supabaseClient
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!currentUserMembership || !['owner', 'admin'].includes(currentUserMembership.role)) {
    return { success: false, error: 'Insufficient permissions to update roles' }
  }

  // Get the target member's current role
  const { data: targetMembership } = await supabaseClient
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()

  if (!targetMembership) {
    return { success: false, error: 'Member not found' }
  }

  // Prevent admins from changing owner roles
  if (currentUserMembership.role === 'admin' && targetMembership.role === 'owner') {
    return { success: false, error: 'Admins cannot modify owner roles' }
  }

  // Prevent admins from promoting users to owner
  if (currentUserMembership.role === 'admin' && newRole === 'owner') {
    return { success: false, error: 'Admins cannot promote users to owner' }
  }

  // Prevent users from demoting themselves if they're the only owner
  if (user.id === userId && targetMembership.role === 'owner' && newRole !== 'owner') {
    const { data: ownerCount } = await supabaseClient
      .from('org_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'owner')

    if (ownerCount && ownerCount.length === 1) {
      return { success: false, error: 'Cannot demote the only owner. Transfer ownership first.' }
    }
  }

  // Update the role
  const { error: updateError } = await supabaseClient
    .from('org_members')
    .update({ role: newRole })
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (updateError) {
    logger.error('Error updating member role', updateError)
    return { success: false, error: 'Failed to update role' }
  }

  // Get org slug for revalidation using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc('get_org_by_id', {
    p_org_id: orgId
  })
  
  if (org?.slug) {
    revalidatePath(`/${org.slug}/settings`)
    revalidatePath(`/${org.slug}/people`)
  }

  return { success: true }
}

/**
 * Remove a member from an organization
 * Only owners and admins can remove members
 * Cannot remove the last owner
 */
export async function removeMember(
  orgId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseClient = supabase as any
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if current user has permission to remove members
  const { data: currentUserMembership } = await supabaseClient
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!currentUserMembership || !['owner', 'admin'].includes(currentUserMembership.role)) {
    return { success: false, error: 'Insufficient permissions to remove members' }
  }

  // Get the target member's role
  const { data: targetMembership } = await supabaseClient
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()

  if (!targetMembership) {
    return { success: false, error: 'Member not found' }
  }

  // Prevent admins from removing owners
  if (currentUserMembership.role === 'admin' && targetMembership.role === 'owner') {
    return { success: false, error: 'Admins cannot remove owners' }
  }

  // Prevent removing the last owner
  if (targetMembership.role === 'owner') {
    const { count } = await supabaseClient
      .from('org_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'owner')

    if (count === 1) {
      return { success: false, error: 'Cannot remove the only owner. Transfer ownership first.' }
    }
  }

  // Remove the member
  const { error: deleteError } = await supabaseClient
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (deleteError) {
    logger.error('Error removing member', deleteError)
    return { success: false, error: 'Failed to remove member' }
  }

  // Get org slug for revalidation using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc('get_org_by_id', {
    p_org_id: orgId
  })
  
  if (org?.slug) {
    revalidatePath(`/${org.slug}/settings`)
    revalidatePath(`/${org.slug}/people`)
  }

  return { success: true }
}
