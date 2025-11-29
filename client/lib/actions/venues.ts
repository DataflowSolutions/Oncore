"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

// Get all venues for an organization
export async function getVenuesByOrg(orgId: string) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) {
    logger.error("Error fetching venues", error);
    throw new Error(`Failed to fetch venues: ${error.message}`);
  }

  return data || [];
}

// Search venues by name and city for an organization
export async function searchVenues(orgId: string, searchTerm: string) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("org_id", orgId)
    .or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
    .order("name")
    .limit(10);

  if (error) {
    logger.error("Error searching venues", error);
    throw new Error(`Failed to search venues: ${error.message}`);
  }

  return data || [];
}

// Get venue details with shows
export async function getVenueDetails(venueId: string) {
  const supabase = await getSupabaseServer();

  try {
    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_venue_details", {
      p_venue_id: venueId,
    });

    if (error) {
      logger.error("Error fetching venue details", error);
      throw new Error(`Failed to fetch venue: ${error.message}`);
    }

    return {
      venue: data.venue,
      shows: data.shows || [],
    };
  } catch (error) {
    logger.error("Exception in getVenueDetails", error);
    throw error;
  }
}

// Get venues with show counts for an organization
export async function getVenuesWithShowCounts(orgId: string) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("venues")
    .select(
      `
      *,
      shows:shows(count)
    `
    )
    .eq("org_id", orgId)
    .order("name");

  if (error) {
    logger.error("Error fetching venues with show counts", error);
    throw new Error(`Failed to fetch venues: ${error.message}`);
  }

  return data || [];
}

// Create a new venue
export async function createVenue(formData: FormData) {
  try {
    const supabase = await getSupabaseServer();

    const orgId = formData.get("org_id") as string;
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const country = formData.get("country") as string;
    const capacityStr = formData.get("capacity") as string;
    const capacity = capacityStr ? parseInt(capacityStr) : null;

    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("create_venue", {
      p_org_id: orgId,
      p_name: name,
      p_address: address || null,
      p_city: city || null,
      p_country: country || null,
      p_capacity: capacity,
    });

    if (error) {
      logger.error("Error creating venue", error);
      throw new Error(`Failed to create venue: ${error.message}`);
    }

    // Get org slug for revalidation using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org } = await (supabase as any).rpc("get_org_by_id", {
      p_org_id: orgId,
    });

    if (org?.slug) {
      revalidatePath(`/${org.slug}/venues`);
      revalidatePath(`/${org.slug}/shows`);
      revalidatePath(`/${org.slug}/people/venues`);
    }

    return { success: true, venue: data };
  } catch (error) {
    logger.error("Error in createVenue", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create venue",
    };
  }
}

// Update venue
export async function updateVenue(venueId: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServer();

    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const country = formData.get("country") as string;
    const capacityStr = formData.get("capacity") as string;
    const capacity = capacityStr ? parseInt(capacityStr) : null;

    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_venue", {
      p_venue_id: venueId,
      p_name: name || null,
      p_address: address || null,
      p_city: city || null,
      p_country: country || null,
      p_capacity: capacity,
    });

    if (error) {
      logger.error("Error updating venue", error);
      throw new Error(`Failed to update venue: ${error.message}`);
    }

    // Get org slug for revalidation using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org } = await (supabase as any).rpc("get_org_by_id", {
      p_org_id: data.org_id,
    });

    if (org?.slug) {
      revalidatePath(`/${org.slug}/venues`);
      revalidatePath(`/${org.slug}/shows`);
      revalidatePath(`/${org.slug}/venues/${venueId}`);
      revalidatePath(`/${org.slug}/people/venues`);
    }

    return { success: true, venue: data };
  } catch (error) {
    logger.error("Error in updateVenue", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update venue",
    };
  }
}

// Delete venue
export async function deleteVenue(venueId: string) {
  try {
    const supabase = await getSupabaseServer();

    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("delete_venue", {
      p_venue_id: venueId,
    });

    if (error) {
      logger.error("Error deleting venue", error);
      throw new Error(`Failed to delete venue: ${error.message}`);
    }

    // Check if RPC returned an error (e.g., venue has shows)
    if (data && !data.success) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    logger.error("Error in deleteVenue", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete venue",
    };
  }
}
