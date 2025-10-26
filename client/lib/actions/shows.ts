"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";

type Show = Database["public"]["Tables"]["shows"]["Row"];
type ShowInsert = Database["public"]["Tables"]["shows"]["Insert"];
type ShowUpdate = Database["public"]["Tables"]["shows"]["Update"];
type Venue = Database["public"]["Tables"]["venues"]["Row"];
type Person = Database["public"]["Tables"]["people"]["Row"];

export interface ShowWithVenue extends Show {
  venue?: Venue | null;
  show_assignments?: { people: Person | null }[] | null;
}

export async function getShowsByOrg(orgId: string): Promise<ShowWithVenue[]> {
  const supabase = await getSupabaseServer();

  const { data: shows, error } = await supabase
    .from("shows")
    .select(
      `
      *,
      venue:venues(*),
      show_assignments(
        people(*)
      )
    `
    )
    .eq("org_id", orgId)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching shows:", error);
    return [];
  }

  return shows || [];
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

  let finalVenueId = null;

  // Use existing venue if selected
  if (venueId) {
    finalVenueId = venueId;
  }
  // Create new venue if venue data is provided
  else if (venueName && venueCity) {
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .insert({
        name: venueName,
        city: venueCity,
        address: venueAddress || null,
        org_id: orgId,
      })
      .select()
      .single();

    if (venueError) {
      console.error("Error creating venue:", venueError);
      throw new Error(`Failed to create venue: ${venueError.message}`);
    } else {
      finalVenueId = venue.id;

      // Clear venue cache when new venue is created
      // Note: This will be cleared on next page load since cache is client-side
    }
  }

  // Format set_time as a proper timestamp if provided
  let formattedSetTime = null;
  if (setTime) {
    // Combine date and time into a proper timestamp
    formattedSetTime = `${date}T${setTime}:00`;
  }

  const showData: ShowInsert = {
    org_id: orgId,
    title,
    date,
    venue_id: finalVenueId,
    set_time: formattedSetTime,
    doors_at: null,
    notes: notes || null,
    status: "draft",
  };

  const { data, error } = await supabase
    .from("shows")
    .insert(showData)
    .select()
    .single();

  if (error) {
    console.error("Error creating show:", error);
    throw new Error("Failed to create show");
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
    console.error("Error updating show:", error);
    throw new Error("Failed to update show");
  }

  // Targeted revalidation: only revalidate the specific show page
  revalidatePath(`/shows/${showId}`);
  revalidatePath(`/shows`); // Also revalidate list view
  return data;
}

export async function deleteShow(showId: string, orgId: string) {
  const supabase = await getSupabaseServer();

  const { error } = await supabase.from("shows").delete().eq("id", showId);

  if (error) {
    console.error("Error deleting show:", error);
    throw new Error("Failed to delete show");
  }

  revalidatePath(`/${orgId}/shows`);
}

export async function getVenuesByOrg(orgId: string): Promise<Venue[]> {
  const supabase = await getSupabaseServer();

  const { data: venues, error } = await supabase
    .from("venues")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching venues:", error);
    return [];
  }

  return venues || [];
}
