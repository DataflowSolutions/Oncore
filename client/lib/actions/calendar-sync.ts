"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { CalendarService } from "@/lib/services/calendar-sync";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MANAGER_ROLES = new Set(["owner", "admin", "editor"]);

const createSourceSchema = z.object({
  orgId: z.string().uuid(),
  sourceUrl: z.string().url(),
  syncIntervalMinutes: z.number().int().min(15).max(1440).default(60),
});

const updateSourceSchema = z.object({
  orgId: z.string().uuid(),
  sourceId: z.string().uuid(),
  sourceUrl: z.string().url().optional(),
  status: z.enum(["active", "paused"]).optional(),
  syncIntervalMinutes: z.number().int().min(15).max(1440).optional(),
});

const deleteSourceSchema = z.object({
  orgId: z.string().uuid(),
  sourceId: z.string().uuid(),
});

const triggerSyncSchema = z.object({
  orgId: z.string().uuid(),
  sourceId: z.string().uuid(),
});

async function ensureOrgManager(
  supabase: SupabaseServerClient,
  orgId: string,
  userId: string,
) {
  const { data: membership, error } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to verify org membership", error);
    throw new Error("Unable to verify organization access");
  }

  if (!membership || !MANAGER_ROLES.has(membership.role)) {
    throw new Error("You do not have permission to manage calendar sync");
  }
}

async function getOrgSlug(supabase: SupabaseServerClient, orgId: string) {
  const { data } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .single();

  return data?.slug ?? null;
}

export async function createCalendarSource(input: z.infer<typeof createSourceSchema>) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Authentication required" };
  }

  const validation = createSourceSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const { orgId, sourceUrl, syncIntervalMinutes } = validation.data;

  try {
    await ensureOrgManager(supabase, orgId, session.user.id);
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }

  const { error } = await supabase.from("calendar_sync_sources").insert({
    org_id: orgId,
    source_url: sourceUrl,
    sync_interval_minutes: syncIntervalMinutes,
    created_by: session.user.id,
  });

  if (error) {
    logger.error("Failed to create calendar source", error);
    return { success: false, error: error.message };
  }

  const slug = await getOrgSlug(supabase, orgId);
  if (slug) {
    revalidatePath(`/${slug}/calendar`);
  }

  return { success: true };
}

export async function updateCalendarSource(input: z.infer<typeof updateSourceSchema>) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Authentication required" };
  }

  const validation = updateSourceSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const { orgId, sourceId, status, sourceUrl, syncIntervalMinutes } = validation.data;

  try {
    await ensureOrgManager(supabase, orgId, session.user.id);
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (sourceUrl) updates.source_url = sourceUrl;
  if (typeof syncIntervalMinutes === "number") updates.sync_interval_minutes = syncIntervalMinutes;

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("calendar_sync_sources")
    .update(updates)
    .eq("id", sourceId)
    .eq("org_id", orgId);

  if (error) {
    logger.error("Failed to update calendar source", error);
    return { success: false, error: error.message };
  }

  const slug = await getOrgSlug(supabase, orgId);
  if (slug) {
    revalidatePath(`/${slug}/calendar`);
  }

  return { success: true };
}

export async function deleteCalendarSource(input: z.infer<typeof deleteSourceSchema>) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Authentication required" };
  }

  const validation = deleteSourceSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const { orgId, sourceId } = validation.data;

  try {
    await ensureOrgManager(supabase, orgId, session.user.id);
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }

  const { error } = await supabase
    .from("calendar_sync_sources")
    .delete()
    .eq("id", sourceId)
    .eq("org_id", orgId);

  if (error) {
    logger.error("Failed to delete calendar source", error);
    return { success: false, error: error.message };
  }

  const slug = await getOrgSlug(supabase, orgId);
  if (slug) {
    revalidatePath(`/${slug}/calendar`);
  }

  return { success: true };
}

export async function triggerCalendarSync(input: z.infer<typeof triggerSyncSchema>) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Authentication required" };
  }

  const validation = triggerSyncSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const { orgId, sourceId } = validation.data;

  try {
    await ensureOrgManager(supabase, orgId, session.user.id);
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }

  const { data: source, error: sourceError } = await supabase
    .from("calendar_sync_sources")
    .select("id, org_id, source_url")
    .eq("id", sourceId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (sourceError || !source) {
    logger.error("Calendar source lookup failed", sourceError);
    return { success: false, error: "Calendar source not found" };
  }

  let status: "success" | "failed" = "success";
  let message: string | null = null;
  let eventsProcessed = 0;

  try {
    const response = await fetch(source.source_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar feed (${response.status})`);
    }

    const icalContent = await response.text();
    const service = new CalendarService(supabase);
    const result = await service.importICalendar(orgId, icalContent);

    if (!result.success) {
      status = "failed";
      message = result.error ?? "Calendar import failed";
    }

    eventsProcessed = result.count ?? 0;
  } catch (error) {
    const err = error as Error;
    status = "failed";
    message = err.message ?? "Calendar sync failed";
    logger.error("Calendar sync failed", err);
  }

  const runInsert = await supabase
    .from("calendar_sync_runs")
    .insert({
      source_id: sourceId,
      status,
      message,
      events_processed: eventsProcessed,
      finished_at: new Date().toISOString(),
    });

  if (runInsert.error) {
    logger.error("Failed to record calendar sync run", runInsert.error);
  }

  const { error: updateError } = await supabase
    .from("calendar_sync_sources")
    .update({
      last_synced_at: status === "success" ? new Date().toISOString() : source.last_synced_at,
      last_error: message,
    })
    .eq("id", sourceId)
    .eq("org_id", orgId);

  if (updateError) {
    logger.error("Failed to update calendar source metadata", updateError);
  }

  const slug = await getOrgSlug(supabase, orgId);
  if (slug) {
    revalidatePath(`/${slug}/calendar`);
  }

  if (status === "failed") {
    return { success: false, error: message ?? "Calendar sync failed" };
  }

  return { success: true, eventsProcessed };
}
