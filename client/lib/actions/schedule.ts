// @ts-nocheck
"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

type ScheduleItem = Database["public"]["Tables"]["schedule_items"]["Row"];
type ScheduleItemInsert =
  Database["public"]["Tables"]["schedule_items"]["Insert"];
type ScheduleItemUpdate =
  Database["public"]["Tables"]["schedule_items"]["Update"];

// Schedule visibility types
export type ScheduleVisibility =
  | "all"
  | "artist_team"
  | "promoter_team"
  | "crew"
  | "management"
  | "venue_staff"
  | "security"
  | "session_specific";

// Schedule item types for categorization
export type ScheduleItemType =
  | "custom"
  | "load_in"
  | "soundcheck"
  | "doors"
  | "set_time"
  | "load_out"
  | "arrival"
  | "departure"
  | "hotel"
  | "transport"
  | "catering"
  | "meeting"
  | "press"
  | "technical";

export async function getScheduleItemsForShow(
  showId: string
): Promise<ScheduleItem[]> {
  const supabase = await getSupabaseServer();

  // Use RPC to get schedule items to avoid RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "get_schedule_items_for_show",
    { p_show_id: showId }
  );

  if (error) {
    logger.error("Error fetching schedule items", error);
    return [];
  }

  return data || [];
}

// Get schedule items filtered by visibility/role
export async function getScheduleItemsForRole(
  showId: string,
  visibility: ScheduleVisibility[] = ["all"],
  sessionId?: string
): Promise<ScheduleItem[]> {
  const supabase = await getSupabaseServer();

  let query = supabase
    .from("schedule_items")
    .select("*")
    .eq("show_id", showId)
    .in("visibility", visibility);

  // If sessionId provided, also include session-specific items
  if (sessionId) {
    query = supabase
      .from("schedule_items")
      .select("*")
      .eq("show_id", showId)
      .or(`visibility.in.(${visibility.join(",")}),session_id.eq.${sessionId}`);
  }

  const { data, error } = await query
    .order("priority", { ascending: true })
    .order("starts_at", { ascending: true });

  if (error) {
    logger.error("Error fetching filtered schedule items", error);
    return [];
  }

  return data || [];
}

// Get global (shared) schedule items only
export async function getGlobalScheduleItems(
  showId: string
): Promise<ScheduleItem[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("show_id", showId)
    .eq("visibility", "all")
    .is("session_id", null)
    .order("priority", { ascending: true })
    .order("starts_at", { ascending: true });

  if (error) {
    logger.error("Error fetching global schedule items", error);
    return [];
  }

  return data || [];
}

export async function createScheduleItem(
  orgSlug: string,
  showId: string,
  scheduleItem: Omit<ScheduleItemInsert, "org_id" | "show_id">
): Promise<{ success: boolean; error?: string; data?: ScheduleItem }> {
  const supabase = await getSupabaseServer();

  // Get org_id from org slug using RPC to bypass RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org, error: orgError } = await (supabase as any).rpc(
    "get_org_by_slug",
    { p_slug: orgSlug }
  );

  if (orgError || !org) {
    logger.error("Error fetching org for schedule item", { orgError, orgSlug });
    return { success: false, error: "Organization not found" };
  }

  // Use RPC to create schedule item to bypass RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("create_schedule_item", {
    p_org_id: org.id,
    p_show_id: showId,
    p_title: scheduleItem.title,
    p_starts_at: scheduleItem.starts_at,
    p_ends_at: scheduleItem.ends_at || null,
    p_location: scheduleItem.location || null,
    p_item_type: scheduleItem.item_type || "custom",
    p_visibility: scheduleItem.visibility || "all",
    p_person_id: scheduleItem.person_id || null,
    p_notes: scheduleItem.notes || null,
    p_auto_generated: scheduleItem.auto_generated || false,
    p_source: scheduleItem.source || null,
    p_source_ref: scheduleItem.source_ref || null,
    p_priority: scheduleItem.priority || 0,
  });

  if (error) {
    logger.error("Error creating schedule item", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}`);
  return { success: true, data };
}

export async function updateScheduleItem(
  orgSlug: string,
  showId: string,
  itemId: string,
  updates: ScheduleItemUpdate
): Promise<{ success: boolean; error?: string; data?: ScheduleItem }> {
  const supabase = await getSupabaseServer();

  // Use RPC to update schedule item to bypass RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("update_schedule_item", {
    p_item_id: itemId,
    p_title: updates.title || null,
    p_starts_at: updates.starts_at || null,
    p_ends_at: updates.ends_at || null,
    p_location: updates.location || null,
    p_item_type: updates.item_type || null,
    p_visibility: updates.visibility || null,
    p_person_id: updates.person_id || null,
    p_notes: updates.notes || null,
    p_priority: updates.priority || null,
  });

  if (error) {
    logger.error("Error updating schedule item", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}`);
  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  return { success: true, data };
}

export async function deleteScheduleItem(
  orgSlug: string,
  showId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  // Use RPC to delete schedule item to bypass RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("delete_schedule_item", {
    p_item_id: itemId,
  });

  if (error) {
    logger.error("Error deleting schedule item", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}`);
  return { success: true };
}

// Auto-generate schedule items from advancing session fields
export async function generateScheduleFromAdvancing(
  orgSlug: string,
  showId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string; created?: number }> {
  const supabase = await getSupabaseServer();

  // Get advancing fields that could become schedule items
  const { data: fields, error: fieldsError } = await supabase
    .from("advancing_fields")
    .select("*")
    .eq("session_id", sessionId)
    .in("field_type", ["time", "text"])
    .not("value", "is", null);

  if (fieldsError) {
    return { success: false, error: "Failed to fetch advancing fields" };
  }

  if (!fields || fields.length === 0) {
    return { success: true, created: 0 };
  }

  // Get org_id using RPC to bypass RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc("get_org_by_slug", {
    p_slug: orgSlug,
  });

  if (!org) {
    return { success: false, error: "Organization not found" };
  }

  const scheduleItems: ScheduleItemInsert[] = [];

  // Process advancing fields and convert relevant ones to schedule items
  for (const field of fields) {
    const fieldValue = field.value as Record<string, unknown>;
    let scheduleItem: Partial<ScheduleItemInsert> | null = null;

    // Handle time-based fields
    if (
      field.field_type === "time" &&
      fieldValue?.time &&
      typeof fieldValue.time === "string"
    ) {
      scheduleItem = {
        org_id: org.id,
        show_id: showId,
        title: field.field_name,
        starts_at: fieldValue.time,
        notes: `Auto-generated from advancing: ${field.section} (${field.party_type})`,
      };
    }

    // Handle text fields that contain time information
    if (
      field.field_type === "text" &&
      fieldValue?.text &&
      typeof fieldValue.text === "string"
    ) {
      const timeMatch = extractTimeFromText(fieldValue.text);
      if (timeMatch) {
        scheduleItem = {
          org_id: org.id,
          show_id: showId,
          title: field.field_name,
          starts_at: timeMatch,
          notes: `Auto-generated from advancing: ${field.section} (${field.party_type})`,
        };
      }
    }

    if (scheduleItem) {
      scheduleItems.push(scheduleItem as ScheduleItemInsert);
    }
  }

  if (scheduleItems.length === 0) {
    return { success: true, created: 0 };
  }

  // Use RPC to insert schedule items (bypasses RLS issues with PostgREST)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: insertResult, error: insertError } = await (
    supabase as any
  ).rpc("app_insert_schedule_items", {
    p_items: JSON.stringify(scheduleItems),
  });

  if (insertError) {
    logger.error("Error inserting auto-generated schedule items", insertError);
    return { success: false, error: insertError.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}`);
  revalidatePath(`/${orgSlug}/shows/${showId}/day`);

  return {
    success: true,
    created: insertResult?.inserted || scheduleItems.length,
  };
}

// Helper functions for schedule generation (will be enhanced after DB migration)

function extractTimeFromText(text: string): string | null {
  // Simple regex to extract time patterns like "14:30", "2:30 PM", etc.
  const timePatterns = [
    /\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/, // 24-hour format
    /\b(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)\b/i, // 12-hour format
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Convert to 24-hour format for database storage
      let hours = parseInt(match[1]);
      const minutes = match[2];

      if (match[3] && match[3].toUpperCase() === "PM" && hours !== 12) {
        hours += 12;
      } else if (match[3] && match[3].toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, "0")}:${minutes}:00`;
    }
  }

  return null;
}

export async function getScheduleItemsForOrg(
  orgSlug: string
): Promise<ScheduleItem[]> {
  const supabase = await getSupabaseServer();

  // Get org_id from org slug using RPC to bypass RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org, error: orgError } = await (supabase as any).rpc(
    "get_org_by_slug",
    { p_slug: orgSlug }
  );

  if (orgError || !org) {
    return [];
  }

  const { data, error } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("org_id", org.id)
    .order("starts_at", { ascending: true });

  if (error) {
    logger.error("Error fetching org schedule items", error);
    return [];
  }

  return data || [];
}
