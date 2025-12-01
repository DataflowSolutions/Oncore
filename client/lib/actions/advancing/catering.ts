"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { logger } from "@/lib/logger";
import { createScheduleItem, deleteScheduleItem } from "@/lib/actions/schedule";

// Type for the advancing_catering table row
// Note: These types should match the database schema
type AdvancingCatering = {
  id: string;
  show_id: string;
  provider_name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  service_at: string | null;
  guest_count: number | null;
  booking_refs: string[] | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  source: Database["public"]["Enums"]["advancing_party"];
  created_at: string;
};

export interface CateringData {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  serviceDateTime?: string;
  guestCount?: number;
  bookingRefs?: string[];
  phone?: string;
  email?: string;
  notes?: string;
}

/**
 * Get catering data for a show (cached)
 */
export const getShowCatering = cache(
  async (showId: string): Promise<AdvancingCatering[]> => {
    const supabase = await getSupabaseServer();

    // Use RPC to avoid RLS recursion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_show_catering", {
      p_show_id: showId,
    });

    if (error) {
      logger.error("Error fetching catering data", error);
      return [];
    }

    return (data || []) as AdvancingCatering[];
  }
);

/**
 * Create or update catering for a show
 */
export async function saveCatering(
  orgSlug: string,
  showId: string,
  cateringData: CateringData,
  cateringId?: string,
  source: "artist" | "promoter" = "artist"
): Promise<{ success: boolean; error?: string; data?: AdvancingCatering }> {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  let result;

  if (cateringId) {
    // Update existing using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_catering", {
      p_catering_id: cateringId,
      p_provider_name: cateringData.name || null,
      p_address: cateringData.address || null,
      p_city: cateringData.city || null,
      p_service_at: cateringData.serviceDateTime
        ? new Date(cateringData.serviceDateTime).toISOString()
        : null,
      p_guest_count: cateringData.guestCount || null,
      p_booking_refs: cateringData.bookingRefs || null,
      p_phone: cateringData.phone || null,
      p_email: cateringData.email || null,
      p_notes: cateringData.notes || null,
      p_source: source,
    });

    if (error) {
      logger.error("Error updating catering", error);
      return { success: false, error: error.message };
    }
    result = data;
  } else {
    // Insert new using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("create_catering", {
      p_show_id: showId,
      p_provider_name: cateringData.name || null,
      p_address: cateringData.address || null,
      p_city: cateringData.city || null,
      p_service_at: cateringData.serviceDateTime
        ? new Date(cateringData.serviceDateTime).toISOString()
        : null,
      p_guest_count: cateringData.guestCount || null,
      p_booking_refs: cateringData.bookingRefs || null,
      p_phone: cateringData.phone || null,
      p_email: cateringData.email || null,
      p_notes: cateringData.notes || null,
      p_source: source,
    });

    if (error) {
      logger.error("Error creating catering", error);
      return { success: false, error: error.message };
    }
    result = data;
  }

  const cateringRecord = result as AdvancingCatering | undefined;

  if (cateringRecord?.id) {
    await syncCateringScheduleItem({
      supabase,
      orgSlug,
      showId,
      catering: cateringRecord,
    });
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  revalidatePath(`/${orgSlug}/shows/${showId}/advancing`);

  return { success: true, data: result as AdvancingCatering };
}

/**
 * Delete catering record
 */
export async function deleteCatering(
  orgSlug: string,
  showId: string,
  cateringId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  // Use RPC to avoid RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("delete_catering", {
    p_catering_id: cateringId,
  });

  if (error) {
    logger.error("Error deleting catering", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  revalidatePath(`/${orgSlug}/shows/${showId}/advancing`);

  return { success: true };
}

async function syncCateringScheduleItem({
  supabase,
  orgSlug,
  showId,
  catering,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>;
  orgSlug: string;
  showId: string;
  catering: AdvancingCatering;
}) {
  if (!catering.id) return;
  try {
    const { data: existingItems, error } = await supabase
      .from("schedule_items")
      .select("id")
      .eq("show_id", showId)
      .eq("source", "advancing_catering")
      .eq("source_ref", catering.id);

    if (error) {
      logger.error("Failed to fetch catering schedule items", error);
      return;
    }

    await Promise.all(
      (existingItems ?? []).map((item: { id: string }) =>
        deleteScheduleItem(orgSlug, showId, item.id)
      )
    );

    if (!catering.service_at) {
      return;
    }

    const serviceStart = new Date(catering.service_at);
    if (Number.isNaN(serviceStart.getTime())) {
      return;
    }
    const serviceEnd = new Date(serviceStart);
    serviceEnd.setMinutes(serviceEnd.getMinutes() + 30);

    const locationParts = [catering.address, catering.city].filter(Boolean);

    await createScheduleItem(orgSlug, showId, {
      title: `Food Service - ${catering.provider_name || "Catering"}`,
      starts_at: serviceStart.toISOString(),
      ends_at: serviceEnd.toISOString(),
      location: locationParts.length ? locationParts.join(", ") : null,
      notes: catering.notes,
      item_type: "catering",
      auto_generated: true,
      source: "advancing_catering",
      source_ref: catering.id,
    });
  } catch (error) {
    logger.error("Failed to sync catering schedule item", error);
  }
}
