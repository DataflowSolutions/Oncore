"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

/**
 * Syncs schedule item changes back to advancing data
 * This ensures that when users drag hotel/catering/flight items in the schedule,
 * the changes are reflected in the advancing data panels
 */
export async function syncScheduleItemToAdvancing(
  orgSlug: string,
  showId: string,
  scheduleItemId: string,
  itemType: "hotel" | "catering" | "departure",
  newStartsAt: string,
  newEndsAt?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  try {
    // Get the schedule item to find its source and source_ref
    const { data: scheduleItem, error: scheduleError } = await supabase
      .from("schedule_items")
      .select("source, source_ref, title, auto_generated")
      .eq("id", scheduleItemId)
      .single();

    if (scheduleError || !scheduleItem) {
      logger.error("Schedule item not found", {
        scheduleItemId,
        error: scheduleError,
      });
      return { success: false, error: "Schedule item not found" };
    }

    // Only sync auto-generated items that have a source
    if (
      !scheduleItem.auto_generated ||
      !scheduleItem.source ||
      !scheduleItem.source_ref
    ) {
      return { success: true }; // Not an auto-generated item or no source, nothing to sync
    }

    const { source, source_ref, title } = scheduleItem;

    // Handle new advancing tables based on source
    if (source === "advancing_lodging") {
      return await syncLodgingFromSchedule(
        supabase,
        orgSlug,
        showId,
        source_ref,
        title,
        newStartsAt
      );
    } else if (source === "advancing_catering") {
      return await syncCateringFromSchedule(
        supabase,
        orgSlug,
        showId,
        source_ref,
        newStartsAt
      );
    } else if (source === "advancing_flights") {
      return await syncFlightFromSchedule(
        supabase,
        orgSlug,
        showId,
        source_ref,
        title,
        newStartsAt,
        newEndsAt
      );
    }

    // Fall back to legacy advancing_fields sync for older data
    return await syncLegacyAdvancingField(
      supabase,
      orgSlug,
      showId,
      scheduleItemId,
      itemType,
      newStartsAt,
      newEndsAt,
      title
    );
  } catch (error) {
    logger.error("Error in syncScheduleItemToAdvancing", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync lodging record from schedule item update
 */
async function syncLodgingFromSchedule(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  orgSlug: string,
  showId: string,
  lodgingId: string,
  title: string,
  newStartsAt: string
): Promise<{ success: boolean; error?: string }> {
  // Determine if this is check-in or check-out based on title
  const isCheckIn = title.toLowerCase().includes("check-in");
  const isCheckOut = title.toLowerCase().includes("check-out");

  if (!isCheckIn && !isCheckOut) {
    return { success: true }; // Can't determine which field to update
  }

  const updateField = isCheckIn ? "p_check_in_at" : "p_check_out_at";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("update_lodging", {
    p_lodging_id: lodgingId,
    [updateField]: newStartsAt,
  });

  if (error) {
    logger.error("Error syncing lodging from schedule", { error, lodgingId });
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  logger.info("Successfully synced lodging from schedule", {
    lodgingId,
    updateField,
    newStartsAt,
  });
  return { success: true };
}

/**
 * Sync catering record from schedule item update
 */
async function syncCateringFromSchedule(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  orgSlug: string,
  showId: string,
  cateringId: string,
  newStartsAt: string
): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("update_catering", {
    p_catering_id: cateringId,
    p_service_time: newStartsAt,
  });

  if (error) {
    logger.error("Error syncing catering from schedule", { error, cateringId });
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  logger.info("Successfully synced catering from schedule", {
    cateringId,
    newStartsAt,
  });
  return { success: true };
}

/**
 * Sync flight record from schedule item update
 */
async function syncFlightFromSchedule(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  orgSlug: string,
  showId: string,
  flightId: string,
  title: string,
  newStartsAt: string,
  newEndsAt?: string | null
): Promise<{ success: boolean; error?: string }> {
  // Determine if this is arrival or departure based on title
  const isArrival =
    title.toLowerCase().includes("arrival") ||
    title.toLowerCase().includes("lands");
  const isDeparture =
    title.toLowerCase().includes("departure") ||
    title.toLowerCase().includes("departs");

  // Get current flight data to preserve other fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: flight, error: fetchError } = await (supabase as any).rpc(
    "get_flight_by_id",
    {
      p_flight_id: flightId,
    }
  );

  if (fetchError || !flight) {
    logger.error("Flight not found for sync", { flightId, error: fetchError });
    return { success: false, error: "Flight not found" };
  }

  // Build update payload based on flight direction and title
  const updateParams: Record<string, unknown> = {
    p_flight_id: flightId,
  };

  if (flight.direction === "arrival") {
    // For arrival flights, update arrival time
    updateParams.p_arrival_at = newStartsAt;
    if (newEndsAt) {
      updateParams.p_depart_at = newEndsAt;
    }
  } else if (flight.direction === "departure") {
    // For departure flights, update departure time
    updateParams.p_depart_at = newStartsAt;
    if (newEndsAt) {
      updateParams.p_arrival_at = newEndsAt;
    }
  } else {
    // Fallback: use title to determine
    if (isArrival) {
      updateParams.p_arrival_at = newStartsAt;
    } else if (isDeparture) {
      updateParams.p_depart_at = newStartsAt;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("update_flight", updateParams);

  if (error) {
    logger.error("Error syncing flight from schedule", { error, flightId });
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  logger.info("Successfully synced flight from schedule", {
    flightId,
    newStartsAt,
  });
  return { success: true };
}

/**
 * Legacy sync for old advancing_fields data structure
 */
async function syncLegacyAdvancingField(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  orgSlug: string,
  showId: string,
  scheduleItemId: string,
  itemType: "hotel" | "catering" | "departure",
  newStartsAt: string,
  newEndsAt: string | null | undefined,
  title: string
): Promise<{ success: boolean; error?: string }> {
  // Get session ID from show ID
  const { data: session } = await supabase
    .from("advancing_sessions")
    .select("id")
    .eq("show_id", showId)
    .single();

  if (!session?.id) {
    logger.error("No advancing session found for show", { showId });
    return { success: false, error: "No advancing session found" };
  }

  // Get the advancing field for this item type
  const fieldName = itemType === "departure" ? "flight" : itemType;

  const { data: advancingField, error: fieldError } = await supabase
    .from("advancing_fields")
    .select("id, value")
    .eq("session_id", session.id)
    .eq("field_name", fieldName)
    .single();

  if (fieldError || !advancingField) {
    logger.error("Advancing field not found", { itemType, error: fieldError });
    return { success: false, error: "Advancing field not found" };
  }

  // Parse the current value
  const currentValue = advancingField.value as Record<string, unknown> | null;

  if (!currentValue) {
    return { success: true }; // No data to sync
  }

  // Update the appropriate datetime field
  const updatedValue = { ...currentValue };

  if (itemType === "hotel") {
    if (title.toLowerCase().includes("check-in")) {
      updatedValue.checkIn = newStartsAt;
    } else if (title.toLowerCase().includes("check-out")) {
      updatedValue.checkOut = newStartsAt;
    }
  } else if (itemType === "catering") {
    updatedValue.serviceDateTime = newStartsAt;
  } else if (itemType === "departure") {
    updatedValue.departureDateTime = newStartsAt;
    if (newEndsAt) {
      updatedValue.arrivalDateTime = newEndsAt;
    }
  }

  // Update the advancing field using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any).rpc(
    "update_advancing_field",
    {
      p_session_id: session.id,
      p_field_id: advancingField.id,
      p_value: updatedValue,
    }
  );

  if (updateError) {
    logger.error("Error updating advancing field", { error: updateError });
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  revalidatePath(`/${orgSlug}/shows/${showId}/advancing/${session.id}`);

  logger.info("Successfully synced schedule item to advancing (legacy)", {
    scheduleItemId,
    itemType,
    newStartsAt,
  });

  return { success: true };
}
