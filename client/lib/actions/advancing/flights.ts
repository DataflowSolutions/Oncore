"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { logger } from "@/lib/logger";

type AdvancingFlight = Database["public"]["Tables"]["advancing_flights"]["Row"];

export interface FlightData {
  direction: "arrival" | "departure";
  airline?: string;
  flightNumber?: string;
  bookingRef?: string;
  ticketNumber?: string;
  aircraftModel?: string;
  passengerName?: string;
  departAirportCode?: string;
  departCity?: string;
  departAt?: string;
  arrivalAirportCode?: string;
  arrivalCity?: string;
  arrivalAt?: string;
  seatNumber?: string;
  travelClass?: string;
  notes?: string;
  autoSchedule?: boolean;
}

/**
 * Get all flights for a show (cached)
 */
export const getShowFlights = cache(async (showId: string): Promise<AdvancingFlight[]> => {
  const supabase = await getSupabaseServer();

  // Use RPC to avoid RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_show_flights", {
    p_show_id: showId,
  });

  if (error) {
    logger.error("Error fetching flights data", error);
    return [];
  }

  return data || [];
});

/**
 * Get flights for a specific person on a show
 */
export const getPersonFlights = cache(async (showId: string, personId: string): Promise<AdvancingFlight[]> => {
  const supabase = await getSupabaseServer();

  // Use RPC to avoid RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_show_flights", {
    p_show_id: showId,
  });

  if (error) {
    logger.error("Error fetching person flights", error);
    return [];
  }

  // Filter by person_id client-side
  return (data || []).filter((f: AdvancingFlight) => f.person_id === personId);
});

/**
 * Create or update a flight
 */
export async function saveFlight(
  orgSlug: string,
  showId: string,
  flightData: FlightData,
  personId?: string,
  flightId?: string,
  source: "artist" | "promoter" = "artist"
): Promise<{ success: boolean; error?: string; data?: AdvancingFlight }> {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  let result;
  if (flightId) {
    // Update existing using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_flight", {
      p_flight_id: flightId,
      p_direction: flightData.direction,
      p_person_id: personId || null,
      p_airline: flightData.airline || null,
      p_flight_number: flightData.flightNumber || null,
      p_booking_ref: flightData.bookingRef || null,
      p_ticket_number: flightData.ticketNumber || null,
      p_aircraft_model: flightData.aircraftModel || null,
      p_passenger_name: flightData.passengerName || null,
      p_depart_airport_code: flightData.departAirportCode || null,
      p_depart_city: flightData.departCity || null,
      p_depart_at: flightData.departAt ? new Date(flightData.departAt).toISOString() : null,
      p_arrival_airport_code: flightData.arrivalAirportCode || null,
      p_arrival_city: flightData.arrivalCity || null,
      p_arrival_at: flightData.arrivalAt ? new Date(flightData.arrivalAt).toISOString() : null,
      p_seat_number: flightData.seatNumber || null,
      p_travel_class: flightData.travelClass || null,
      p_notes: flightData.notes || null,
      p_source: source,
      p_auto_schedule: flightData.autoSchedule ?? true,
    });

    if (error) {
      logger.error("Error updating flight", error);
      return { success: false, error: error.message };
    }
    result = data;
  } else {
    // Insert new using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("create_flight", {
      p_show_id: showId,
      p_direction: flightData.direction,
      p_person_id: personId || null,
      p_airline: flightData.airline || null,
      p_flight_number: flightData.flightNumber || null,
      p_booking_ref: flightData.bookingRef || null,
      p_ticket_number: flightData.ticketNumber || null,
      p_aircraft_model: flightData.aircraftModel || null,
      p_passenger_name: flightData.passengerName || null,
      p_depart_airport_code: flightData.departAirportCode || null,
      p_depart_city: flightData.departCity || null,
      p_depart_at: flightData.departAt ? new Date(flightData.departAt).toISOString() : null,
      p_arrival_airport_code: flightData.arrivalAirportCode || null,
      p_arrival_city: flightData.arrivalCity || null,
      p_arrival_at: flightData.arrivalAt ? new Date(flightData.arrivalAt).toISOString() : null,
      p_seat_number: flightData.seatNumber || null,
      p_travel_class: flightData.travelClass || null,
      p_notes: flightData.notes || null,
      p_source: source,
      p_auto_schedule: flightData.autoSchedule ?? true,
    });

    if (error) {
      logger.error("Error creating flight", error);
      return { success: false, error: error.message };
    }
    result = data;
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  revalidatePath(`/${orgSlug}/shows/${showId}/advancing`);

  return { success: true, data: result };
}

/**
 * Delete a flight
 */
export async function deleteFlight(
  orgSlug: string,
  showId: string,
  flightId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  // Use RPC to avoid RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("delete_flight", {
    p_flight_id: flightId,
  });

  if (error) {
    logger.error("Error deleting flight", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${orgSlug}/shows/${showId}/day`);
  revalidatePath(`/${orgSlug}/shows/${showId}/advancing`);

  return { success: true };
}

/**
 * Bulk save flights (for grid data)
 */
export async function saveFlightsBulk(
  orgSlug: string,
  showId: string,
  flights: Array<FlightData & { personId?: string; id?: string }>,
  source: "artist" | "promoter" = "artist"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Process each flight
  for (const flight of flights) {
    const result = await saveFlight(
      orgSlug,
      showId,
      flight,
      flight.personId,
      flight.id,
      source
    );
    
    if (!result.success) {
      return result;
    }
  }

  return { success: true };
}
