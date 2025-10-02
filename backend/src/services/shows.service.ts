// Shows Service - Business Logic Layer
// This service contains all the business logic for show operations
// It's platform-agnostic and can be reused across web, mobile, and other platforms

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import {
  Show,
  ShowWithVenue,
  CreateShowRequest,
  UpdateShowRequest,
  ShowsListParams,
} from "../types";
import { NotFoundError, ValidationError } from "../utils/errors";

type Tables = Database["public"]["Tables"];
type ShowRow = Tables["shows"]["Row"];
type ShowInsert = Tables["shows"]["Insert"];
type ShowUpdate = Tables["shows"]["Update"];

export class ShowsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get all shows for an organization
   */
  async getShowsByOrg(params: ShowsListParams): Promise<ShowWithVenue[]> {
    const { org_id, upcoming = false, limit = 20, offset = 0 } = params;

    let query = this.supabase
      .from("shows")
      .select(
        `
        *,
        venue:venues(*)
      `
      )
      .eq("org_id", org_id)
      .order("date", { ascending: !upcoming })
      .range(offset, offset + limit - 1);

    // Filter for upcoming shows only
    if (upcoming) {
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("date", today);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch shows: ${error.message}`);
    }

    return data as ShowWithVenue[];
  }

  /**
   * Get a single show by ID with full details
   */
  async getShowById(showId: string, orgId: string): Promise<ShowWithVenue> {
    const { data, error } = await this.supabase
      .from("shows")
      .select(
        `
        *,
        venue:venues(*),
        advancing_sessions(
          id,
          access_code,
          status,
          created_at
        )
      `
      )
      .eq("id", showId)
      .eq("org_id", orgId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Show");
      }
      throw new Error(`Failed to fetch show: ${error.message}`);
    }

    return data as ShowWithVenue;
  }

  /**
   * Create a new show
   * Can optionally create a venue inline
   */
  async createShow(request: CreateShowRequest): Promise<ShowWithVenue> {
    let venueId = request.venue_id;

    // If venue data is provided but no venue_id, create the venue first
    if (!venueId && request.venue_name && request.venue_city) {
      const { data: venue, error: venueError } = await this.supabase
        .from("venues")
        .insert({
          org_id: request.org_id,
          name: request.venue_name,
          city: request.venue_city,
          state: request.venue_state || null,
          address: request.venue_address || null,
        })
        .select()
        .single();

      if (venueError) {
        throw new Error(`Failed to create venue: ${venueError.message}`);
      }

      venueId = venue.id;
    }

    // Format set_time as a proper timestamp if provided
    let formattedSetTime = null;
    if (request.set_time) {
      formattedSetTime = request.set_time.includes("T")
        ? request.set_time
        : `${request.date}T${request.set_time}:00`;
    }

    // Format doors_at as a proper timestamp if provided
    let formattedDoorsAt = null;
    if (request.doors_at) {
      formattedDoorsAt = request.doors_at.includes("T")
        ? request.doors_at
        : `${request.date}T${request.doors_at}:00`;
    }

    const showData: ShowInsert = {
      org_id: request.org_id,
      title: request.title,
      date: request.date,
      venue_id: venueId || null,
      set_time: formattedSetTime,
      doors_at: formattedDoorsAt,
      notes: request.notes || null,
    };

    const { data, error } = await this.supabase
      .from("shows")
      .insert(showData)
      .select(
        `
        *,
        venue:venues(*)
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create show: ${error.message}`);
    }

    return data as ShowWithVenue;
  }

  /**
   * Update an existing show
   */
  async updateShow(
    showId: string,
    orgId: string,
    updates: UpdateShowRequest
  ): Promise<ShowWithVenue> {
    // Verify the show exists and belongs to the org
    await this.getShowById(showId, orgId);

    // Format timestamps if provided
    const updateData: ShowUpdate = { ...updates };

    if (updates.set_time) {
      updateData.set_time = updates.set_time.includes("T")
        ? updates.set_time
        : `${updates.date || ""}T${updates.set_time}:00`;
    }

    if (updates.doors_at) {
      updateData.doors_at = updates.doors_at.includes("T")
        ? updates.doors_at
        : `${updates.date || ""}T${updates.doors_at}:00`;
    }

    const { data, error } = await this.supabase
      .from("shows")
      .update(updateData)
      .eq("id", showId)
      .eq("org_id", orgId)
      .select(
        `
        *,
        venue:venues(*)
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to update show: ${error.message}`);
    }

    return data as ShowWithVenue;
  }

  /**
   * Delete a show
   */
  async deleteShow(showId: string, orgId: string): Promise<void> {
    // Verify the show exists and belongs to the org
    await this.getShowById(showId, orgId);

    const { error } = await this.supabase
      .from("shows")
      .delete()
      .eq("id", showId)
      .eq("org_id", orgId);

    if (error) {
      throw new Error(`Failed to delete show: ${error.message}`);
    }
  }

  /**
   * Get upcoming shows (next N shows)
   */
  async getUpcomingShows(
    orgId: string,
    limit: number = 10
  ): Promise<ShowWithVenue[]> {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await this.supabase
      .from("shows")
      .select(
        `
        *,
        venue:venues(name, city, state)
      `
      )
      .eq("org_id", orgId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch upcoming shows: ${error.message}`);
    }

    return data as ShowWithVenue[];
  }

  /**
   * Get show count for an organization
   */
  async getShowCount(
    orgId: string,
    upcoming: boolean = false
  ): Promise<number> {
    let query = this.supabase
      .from("shows")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (upcoming) {
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("date", today);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count shows: ${error.message}`);
    }

    return count || 0;
  }
}
