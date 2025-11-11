"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { cache } from "react";

type Show = Database["public"]["Tables"]["shows"]["Row"];
type ShowUpdate = Database["public"]["Tables"]["shows"]["Update"];
type Venue = Database["public"]["Tables"]["venues"]["Row"];
type Person = Database["public"]["Tables"]["people"]["Row"];

export interface ShowWithVenue extends Show {
  venue?: Venue | null;
  show_assignments?: { people: Person | null }[] | null;
}

export async function getShowsByOrg(orgId: string): Promise<ShowWithVenue[]> {
  const supabase = await getSupabaseServer();

  // Use RPC function to bypass RLS issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: shows, error } = await (supabase as any).rpc('get_shows_by_org', {
    p_org_id: orgId
  });

  if (error) {
    logger.error("Error fetching shows", error);
    return [];
  }

  // Transform the flat data structure back to nested format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (shows || []).map((show: any) => ({
    id: show.id,
    org_id: show.org_id,
    title: show.title,
    date: show.date,
    venue_id: show.venue_id,
    set_time: show.set_time,
    doors_at: show.doors_at,
    notes: show.notes,
    status: show.status,
    created_at: show.created_at,
    updated_at: show.updated_at,
    venue: show.venue_id ? {
      id: show.venue_id,
      name: show.venue_name,
      city: show.venue_city,
      address: show.venue_address,
      org_id: show.org_id,
      created_at: show.created_at,
      updated_at: show.updated_at,
    } : null,
    show_assignments: null, // TODO: Add show assignments to RPC if needed
  }));
}

export async function createShow(formData: FormData) {
  const supabase = await getSupabaseServer();

  // Get form data
  const orgId = formData.get("orgId") as string;
  const title = formData.get("title") as string;
  const date = formData.get("date") as string;
  const setTime = formData.get("setTime") as string;
  const notes = formData.get("notes") as string;

  // New venue selection logic
  const venueId = formData.get("venueId") as string;
  const venueName = formData.get("venueName") as string;
  const venueCity = formData.get("venueCity") as string;
  const venueAddress = formData.get("venueAddress") as string;

  if (!orgId || !title || !date) {
    throw new Error("Missing required fields");
  }

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Format set_time as a proper timestamp if provided
  let formattedSetTime = null;
  if (setTime) {
    // Combine date and time into a proper timestamp
    formattedSetTime = `${date}T${setTime}:00`;
  }

  // Use RPC function to create show (bypasses RLS issues with PostgREST)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('app_create_show', {
    p_org_id: orgId,
    p_title: title,
    p_date: date,
    p_venue_id: venueId || null,
    p_venue_name: venueName || null,
    p_venue_city: venueCity || null,
    p_venue_address: venueAddress || null,
    p_set_time: formattedSetTime,
    p_notes: notes || null,
  });

  if (error) {
    logger.error("Error creating show", error);
    throw new Error(error.message || "Failed to create show");
  }

  revalidatePath(`/shows`);
  return data;
}

export async function updateShow(showId: string, updates: ShowUpdate) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("shows")
    .update(updates)
    .eq("id", showId)
    .select()
    .single();

  if (error) {
    logger.error("Error updating show", error);
    throw new Error("Failed to update show");
  }

  // Targeted revalidation: only revalidate the specific show page
  revalidatePath(`/shows/${showId}`);
  revalidatePath(`/shows`); // Also revalidate list view
  return data;
}

export async function deleteShow(showId: string) {
  const supabase = await getSupabaseServer();

  const { error } = await supabase.from("shows").delete().eq("id", showId);

  if (error) {
    logger.error("Error deleting show", error);
    throw new Error("Failed to delete show");
  }

  // Revalidate the entire layout to update all shows
  revalidatePath("/", "layout");
}

// Cache venues by org to prevent redundant queries
export const getVenuesByOrg = cache(async (orgId: string): Promise<Venue[]> => {
  const supabase = await getSupabaseServer();

  const { data: venues, error } = await supabase
    .from("venues")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    logger.error("Error fetching venues", error);
    return [];
  }

  return venues || [];
})
