"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { logger } from "@/lib/logger";
import { createScheduleItem, deleteScheduleItem } from "@/lib/actions/schedule";

type AdvancingLodging =
  Database["public"]["Tables"]["advancing_lodging"]["Row"];

export interface LodgingData {
  name?: string;
  address?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  bookingRefs?: string[];
  phone?: string;
  email?: string;
  notes?: string;
}

/**
 * Get lodging data for a show (cached)
 */
export const getShowLodging = cache(
  async (showId: string): Promise<AdvancingLodging[]> => {
    const supabase = await getSupabaseServer();

    // Use RPC to avoid RLS recursion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_show_lodging", {
      p_show_id: showId,
    });

    if (error) {
      logger.error("Error fetching lodging data", error);
      return [];
    }

    return data || [];
  }
);

/**
 * Create or update lodging for a show
 */
export async function saveLodging(
  orgSlug: string,
  showId: string,
  lodgingData: LodgingData,
  personId?: string,
  source: "artist" | "promoter" = "artist"
): Promise<{ success: boolean; error?: string; data?: AdvancingLodging }> {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Check if lodging already exists for this show/person combo using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any).rpc(
    "get_lodging_by_show_person",
    {
      p_show_id: showId,
      p_person_id: personId || null,
    }
  );

  let result;
  if (existing?.id) {
    // Update existing using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_lodging", {
      p_lodging_id: existing.id,
      p_hotel_name: lodgingData.name || null,
      p_address: lodgingData.address || null,
      p_city: lodgingData.city || null,
      p_check_in_at: lodgingData.checkIn
        ? new Date(lodgingData.checkIn).toISOString()
        : null,
      p_check_out_at: lodgingData.checkOut
        ? new Date(lodgingData.checkOut).toISOString()
        : null,
      p_booking_refs: lodgingData.bookingRefs || null,
      p_phone: lodgingData.phone || null,
      p_email: lodgingData.email || null,
      p_notes: lodgingData.notes || null,
      p_source: source,
    });

    if (error) {
      logger.error("Error updating lodging", error);
      return { success: false, error: error.message };
    }
    result = data;
  } else {
    // Insert new using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("create_lodging", {
      p_show_id: showId,
      p_person_id: personId || null,
      p_hotel_name: lodgingData.name || null,
      p_address: lodgingData.address || null,
      p_city: lodgingData.city || null,
      p_check_in_at: lodgingData.checkIn
        ? new Date(lodgingData.checkIn).toISOString()
        : null,
      p_check_out_at: lodgingData.checkOut
        ? new Date(lodgingData.checkOut).toISOString()
        : null,
      p_booking_refs: lodgingData.bookingRefs || null,
      p_phone: lodgingData.phone || null,
      p_email: lodgingData.email || null,
      p_notes: lodgingData.notes || null,
      p_source: source,
    });

    if (error) {
      logger.error("Error creating lodging", error);
      return { success: false, error: error.message };
    }
    result = data;
  }

  const lodgingRecord = result as AdvancingLodging | undefined;

  if (lodgingRecord?.id && !lodgingRecord.person_id) {
    await syncLodgingScheduleItems({
      supabase,
      orgSlug,
      showId,
      lodging: lodgingRecord,
    });
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  revalidatePath(`/${orgSlug}/shows/${showId}/advancing`);

  return { success: true, data: result };
}

/**
 * Delete lodging record
 */
export async function deleteLodging(
  orgSlug: string,
  showId: string,
  lodgingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  await removeLodgingScheduleItems({
    supabase,
    orgSlug,
    showId,
    lodgingId,
  });

  // Use RPC to avoid RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("delete_lodging", {
    p_lodging_id: lodgingId,
  });

  if (error) {
    logger.error("Error deleting lodging", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  revalidatePath(`/${orgSlug}/shows/${showId}/advancing`);

  return { success: true };
}

async function syncLodgingScheduleItems({
  supabase,
  orgSlug,
  showId,
  lodging,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>;
  orgSlug: string;
  showId: string;
  lodging: AdvancingLodging;
}) {
  try {
    const { data: existingItems, error } = await supabase
      .from("schedule_items")
      .select("id")
      .eq("show_id", showId)
      .eq("source", "advancing_lodging")
      .eq("source_ref", lodging.id);

    if (error) {
      logger.error("Failed to fetch lodging schedule items", error);
      return;
    }

    await Promise.all(
      ((existingItems ?? []) as { id: string }[]).map((item) =>
        deleteScheduleItem(orgSlug, showId, item.id)
      )
    );

    const locationParts = [lodging.address, lodging.city].filter(Boolean);
    const location = locationParts.length
      ? locationParts.join(", ")
      : lodging.hotel_name || null;

    const tasks: Array<Promise<unknown>> = [];

    if (lodging.check_in_at) {
      const checkIn = new Date(lodging.check_in_at);
      if (!Number.isNaN(checkIn.getTime())) {
        const checkInEnd = new Date(checkIn);
        checkInEnd.setMinutes(checkInEnd.getMinutes() + 15);
        tasks.push(
          createScheduleItem(orgSlug, showId, {
            title: `Hotel Check-in - ${lodging.hotel_name || "Hotel"}`,
            starts_at: checkIn.toISOString(),
            ends_at: checkInEnd.toISOString(),
            location,
            notes: `Check-in at ${lodging.hotel_name || "hotel"}`,
            item_type: "hotel",
            auto_generated: true,
            source: "advancing_lodging",
            source_ref: lodging.id,
          })
        );
      }
    }

    if (lodging.check_out_at) {
      const checkOut = new Date(lodging.check_out_at);
      if (!Number.isNaN(checkOut.getTime())) {
        const checkOutEnd = new Date(checkOut);
        checkOutEnd.setMinutes(checkOutEnd.getMinutes() + 15);
        tasks.push(
          createScheduleItem(orgSlug, showId, {
            title: `Hotel Check-out - ${lodging.hotel_name || "Hotel"}`,
            starts_at: checkOut.toISOString(),
            ends_at: checkOutEnd.toISOString(),
            location,
            notes: `Check-out from ${lodging.hotel_name || "hotel"}`,
            item_type: "hotel",
            auto_generated: true,
            source: "advancing_lodging",
            source_ref: lodging.id,
          })
        );
      }
    }

    await Promise.all(tasks);
  } catch (error) {
    logger.error("Failed to sync lodging schedule items", error);
  }
}

async function removeLodgingScheduleItems({
  supabase,
  orgSlug,
  showId,
  lodgingId,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>;
  orgSlug: string;
  showId: string;
  lodgingId: string;
}) {
  try {
    const { data: existingItems, error } = await supabase
      .from("schedule_items")
      .select("id")
      .eq("show_id", showId)
      .eq("source", "advancing_lodging")
      .eq("source_ref", lodgingId);

    if (error) {
      logger.error("Failed to fetch lodging schedule items for removal", error);
      return;
    }

    await Promise.all(
      ((existingItems ?? []) as { id: string }[]).map((item) =>
        deleteScheduleItem(orgSlug, showId, item.id)
      )
    );
  } catch (error) {
    logger.error("Failed to remove lodging schedule items", error);
  }
}
