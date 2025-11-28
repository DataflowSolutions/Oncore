"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";

type ShowAdvancing = Database["public"]["Tables"]["show_advancing"]["Row"];

/**
 * Get or create show_advancing record for a show
 * In the new schema, each show has exactly one show_advancing record
 */
export async function getOrCreateShowAdvancing(showId: string): Promise<ShowAdvancing | null> {
  const supabase = await getSupabaseServer();

  // Use RPC to avoid RLS recursion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_or_create_show_advancing", {
    p_show_id: showId,
    p_status: "draft",
  });

  if (error) {
    logger.error("Error getting/creating show_advancing", error);
    return null;
  }

  return data;
}
