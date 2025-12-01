"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { logger } from "@/lib/logger";

export interface ShowContactData {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  isPromoter?: boolean;
  notes?: string;
}

export interface ShowContactRow {
  id: string;
  org_id: string;
  show_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  is_promoter: boolean;
  contact_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  venues?: Array<{
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    is_primary: boolean;
  }>;
}

/**
 * Get contacts for a show (cached)
 */
export const getShowContacts = cache(
  async (showId: string): Promise<ShowContactRow[]> => {
    const supabase = await getSupabaseServer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_show_contacts", {
      p_show_id: showId,
    });
    if (error) {
      logger.error("Error fetching show contacts", error);
      return [];
    }
    return (data || []) as ShowContactRow[];
  }
);

/**
 * Save a show contact (create only for now)
 */
export async function saveShowContact(
  orgSlug: string,
  showId: string,
  contact: ShowContactData
): Promise<{ success: boolean; error?: string; data?: ShowContactRow }> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "User not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("save_show_contact", {
    p_show_id: showId,
    p_name: contact.name,
    p_role: contact.role || null,
    p_phone: contact.phone || null,
    p_email: contact.email || null,
    p_is_promoter: contact.isPromoter || false,
    p_notes: contact.notes || null,
  });

  if (error) {
    logger.error("Error saving show contact", error);
    return { success: false, error: error.message };
  }

  // After insertion fetch the fresh list for the single created ID (we return ID only from RPC)
  let created: ShowContactRow | undefined;
  if (data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fetchData, error: fetchError } = await (supabase as any)
      .from("show_contacts")
      .select("*")
      .eq("id", data)
      .limit(1)
      .maybeSingle();
    if (!fetchError) created = fetchData as ShowContactRow;
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  return { success: true, data: created };
}

/**
 * Update a show contact
 */
export async function updateShowContact(
  orgSlug: string,
  showId: string,
  contactId: string,
  updates: Partial<ShowContactData>
): Promise<{ success: boolean; error?: string; data?: ShowContactRow }> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "User not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("update_show_contact", {
    p_show_contact_id: contactId,
    p_name: updates.name ?? null,
    p_role: updates.role ?? null,
    p_phone: updates.phone ?? null,
    p_email: updates.email ?? null,
    p_notes: updates.notes ?? null,
  });

  if (error) {
    logger.error("Error updating show contact", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  return { success: true, data: data as ShowContactRow };
}
