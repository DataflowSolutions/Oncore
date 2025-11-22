"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

/**
 * Syncs schedule item changes back to advancing fields
 * This ensures that when users drag hotel/catering items in the schedule,
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
    // Get the schedule item to find its source_field_id
    const { data: scheduleItem, error: scheduleError } = await supabase
      .from("schedule_items")
      .select("source_field_id, title, auto_generated")
      .eq("id", scheduleItemId)
      .single();

    if (scheduleError || !scheduleItem) {
      logger.error("Schedule item not found", {
        scheduleItemId,
        error: scheduleError,
      });
      return { success: false, error: "Schedule item not found" };
    }

    // Only sync auto-generated items that have a source field
    if (!scheduleItem.auto_generated) {
      return { success: true }; // Not an auto-generated item, nothing to sync
    }

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
    // Map departure to flight field name
    const fieldName = itemType === "departure" ? "flight" : itemType;

    const { data: advancingField, error: fieldError } = await supabase
      .from("advancing_fields")
      .select("id, value")
      .eq("session_id", session.id)
      .eq("field_name", fieldName)
      .single();

    if (fieldError || !advancingField) {
      logger.error("Advancing field not found", {
        itemType,
        error: fieldError,
      });
      return { success: false, error: "Advancing field not found" };
    }

    // Parse the current value
    const currentValue = advancingField.value as {
      name?: string;
      address?: string;
      city?: string;
      checkIn?: string;
      checkOut?: string;
      serviceDateTime?: string;
      bookingRefs?: string[];
      notes?: string;
      phone?: string;
      email?: string;
      // Flight fields
      airlineName?: string;
      flightNumber?: string;
      bookingRef?: string;
      ticketNumber?: string;
      aircraftModel?: string;
      fullName?: string;
      departureAirportCode?: string;
      departureAirportCity?: string;
      departureDateTime?: string;
      arrivalAirportCode?: string;
      arrivalAirportCity?: string;
      arrivalDateTime?: string;
      seatNumber?: string;
      travelClass?: string;
    } | null;

    if (!currentValue) {
      return { success: true }; // No data to sync
    }

    // Update the appropriate datetime field based on item type and title
    const updatedValue = { ...currentValue };

    if (itemType === "hotel") {
      // Determine if this is check-in or check-out based on title
      if (scheduleItem.title.toLowerCase().includes("check-in")) {
        updatedValue.checkIn = newStartsAt;
      } else if (scheduleItem.title.toLowerCase().includes("check-out")) {
        updatedValue.checkOut = newStartsAt;
      }
    } else if (itemType === "catering") {
      updatedValue.serviceDateTime = newStartsAt;
    } else if (itemType === "departure") {
      // For flights, update both departure and arrival times
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

    // Revalidate paths
    revalidatePath(`/${orgSlug}/shows/${showId}/day`);
    revalidatePath(`/${orgSlug}/shows/${showId}/advancing/${session.id}`);

    logger.info("Successfully synced schedule item to advancing", {
      scheduleItemId,
      itemType,
      newStartsAt,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error in syncScheduleItemToAdvancing", error);
    return { success: false, error: String(error) };
  }
}
