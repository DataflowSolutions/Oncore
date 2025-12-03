// @ts-nocheck
"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import type { OrgRole } from "@/lib/utils/role-permissions";

type OrgMember = Database["public"]["Tables"]["org_members"]["Row"];
type OrgMemberWithUser = OrgMember & {
  user_email: string;
  user_name: string | null;
};

/**
 * Get all members of an organization with their user and person details
 */
export async function getOrgMembers(
  orgId: string
): Promise<OrgMemberWithUser[]> {
  const supabase = await getSupabaseServer();
  // Supabase typings can be strict in server actions; cast to bypass noisy overload resolution.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseClient = supabase as any;

  const { data, error } = await supabaseClient
    .from("org_members")
    .select(
      `
      *
    `
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching org members", error);
    throw new Error(`Failed to fetch org members: ${error.message}`);
  }

  // Fetch user details separately for each member
  const members = (data || []) as OrgMember[];
  const membersWithDetails: OrgMemberWithUser[] = await Promise.all(
    members.map(async (member) => {
      // Fetch user details
      const { data: userData } = await supabase.auth.admin.getUserById(
        member.user_id
      );

      const userEmail = userData?.user?.email || "Unknown";
      const userName =
        (userData?.user?.user_metadata as { full_name?: string })?.full_name ||
        null;

      return {
        ...member,
        user_email: userEmail,
        user_name: userName,
      };
    })
  );

  return membersWithDetails;
}

/**
 * Get the current user's role in an organization
 */
export async function getCurrentUserRole(
  orgId: string
): Promise<OrgRole | null> {
  const supabase = await getSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseClient = supabase as any;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as OrgRole;
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
  const supabase = await getSupabaseServer();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  // Use RPC function to update member role (bypasses RLS issues with PostgREST)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: updateError } = await (supabase as any).rpc(
    "app_update_member_role",
    {
      p_org_id: orgId,
      p_user_id: userId,
      p_new_role: newRole,
    }
  );

  if (updateError) {
    logger.error("Error updating member role", updateError);
    // Return the error message from the RPC (contains permission checks)
    return {
      success: false,
      error: updateError.message || "Failed to update role",
    };
  }

  // Get org slug for revalidation using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc("get_org_by_id", {
    p_org_id: orgId,
  });

  if (org?.slug) {
    revalidatePath(`/${org.slug}/settings`);
    revalidatePath(`/${org.slug}/people`);
  }

  return { success: true };
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
  const supabase = await getSupabaseServer();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  // Use RPC function to remove member (bypasses RLS issues with PostgREST)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any).rpc(
    "app_remove_member",
    {
      p_org_id: orgId,
      p_user_id: userId,
    }
  );

  if (deleteError) {
    logger.error("Error removing member", deleteError);
    // Return the error message from the RPC (contains permission checks)
    return {
      success: false,
      error: deleteError.message || "Failed to remove member",
    };
  }

  // Get org slug for revalidation using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc("get_org_by_id", {
    p_org_id: orgId,
  });

  if (org?.slug) {
    revalidatePath(`/${org.slug}/settings`);
    revalidatePath(`/${org.slug}/people`);
  }

  return { success: true };
}
