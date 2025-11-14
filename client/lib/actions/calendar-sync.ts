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
  sourceName: z.string().optional(),
});

const updateSourceSchema = z.object({
  orgId: z.string().uuid(),
  sourceId: z.string().uuid(),
  sourceUrl: z.string().url().optional(),
  status: z.enum(["active", "paused"]).optional(),
  syncIntervalMinutes: z.number().int().min(15).max(1440).optional(),
  sourceName: z.string().optional(),
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
  const { data: membership, error } = await (supabase as any)
    .rpc('get_org_membership', { p_org_id: orgId });

  if (error) {
    logger.error("Failed to verify org membership", error);
    throw new Error("Unable to verify organization access");
  }

  if (!membership || !MANAGER_ROLES.has(membership.role)) {
    throw new Error("You do not have permission to manage calendar sync");
  }
}

async function getOrgSlug(supabase: SupabaseServerClient, orgId: string) {
  const { data } = await (supabase as any)
    .rpc('get_org_by_id', { p_org_id: orgId });

  return data?.slug ?? null;
}

export async function createCalendarSource(input: z.infer<typeof createSourceSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  const validation = createSourceSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const { orgId, sourceUrl, syncIntervalMinutes, sourceName } = validation.data;

  const { data: sourceId, error } = await (supabase as any).rpc(
    'create_calendar_sync_source',
    {
      p_org_id: orgId,
      p_source_url: sourceUrl,
      p_sync_interval_minutes: syncIntervalMinutes,
      p_created_by: user.id,
      p_source_name: sourceName,
    }
  );

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
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  const validation = updateSourceSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const { orgId, sourceId, status, sourceUrl, syncIntervalMinutes, sourceName } = validation.data;

  const { error } = await (supabase as any).rpc(
    'update_calendar_sync_source',
    {
      p_source_id: sourceId,
      p_org_id: orgId,
      p_source_url: sourceUrl || null,
      p_status: status || null,
      p_sync_interval_minutes: syncIntervalMinutes || null,
      p_source_name: sourceName || null,
    }
  );

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
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  const validation = deleteSourceSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const { orgId, sourceId } = validation.data;

  const { error } = await (supabase as any).rpc(
    'delete_calendar_sync_source',
    {
      p_source_id: sourceId,
      p_org_id: orgId,
    }
  );

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

export async function triggerSync(input: z.infer<typeof triggerSyncSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  const validation = triggerSyncSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const { orgId, sourceId } = validation.data;

  const { data: sources, error: sourceError } = await (supabase as any)
    .rpc('get_calendar_sync_source', { 
      p_source_id: sourceId,
      p_org_id: orgId 
    });

  const source = sources?.[0];

  if (sourceError || !source) {
    logger.error("Calendar source lookup failed", sourceError);
    return { success: false, error: "Calendar source not found" };
  }

  let status: "success" | "failed" = "success";
  let message: string | null = null;
  let eventsProcessed = 0;
  let syncRunId: string | null = null;

  try {
    console.log('[calendar-sync] Fetching calendar feed', { url: source.source_url });
    
    const response = await fetch(source.source_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar feed (${response.status})`);
    }

    const icalContent = await response.text();
    console.log('[calendar-sync] Calendar feed fetched', { 
      size: icalContent.length,
      preview: icalContent.substring(0, 100) 
    });

    // Create sync run record first to get the ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: runData, error: runCreateError } = await (supabase as any).rpc(
      'create_calendar_sync_run',
      {
        p_source_id: sourceId,
        p_org_id: orgId,
        p_status: 'running',
        p_message: null,
        p_events_processed: 0,
      }
    );

    if (runCreateError) {
      console.error('[calendar-sync] Failed to create sync run', runCreateError);
    } else if (runData) {
      syncRunId = runData;
    }

    // Parse and import calendar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new CalendarService(supabase as any);
    const result = await service.importICalendar(orgId, icalContent, syncRunId);
    
    console.log('[calendar-sync] Import result', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to import calendar');
    }
    
    eventsProcessed = result.count || 0;
    message = `Successfully imported ${eventsProcessed} event${eventsProcessed !== 1 ? 's' : ''}`;
    logger.info('Calendar sync completed', { sourceId, eventsProcessed });
  } catch (error) {
    const err = error as Error;
    status = "failed";
    message = err.message ?? "Calendar sync failed";
    logger.error("Calendar sync failed", err);
    console.error('[calendar-sync] Error', err);
  }

  // Update sync run with final status
  if (syncRunId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateRunError } = await (supabase as any).rpc(
      'update_calendar_sync_run_status',
      {
        p_run_id: syncRunId,
        p_status: status,
        p_message: message,
        p_events_processed: eventsProcessed,
      }
    );

    if (updateRunError) {
      logger.error("Failed to update sync run status", updateRunError);
    }
  } else {
    // Fallback: create sync run log if we couldn't create it earlier
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: runError } = await (supabase as any).rpc(
      'create_calendar_sync_run',
      {
        p_source_id: sourceId,
        p_org_id: orgId,
        p_status: status,
        p_message: message,
        p_events_processed: eventsProcessed,
      }
    );

    if (runError) {
      logger.error("Failed to record calendar sync run", runError);
    }
  }

  // Update source metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any).rpc(
    'update_calendar_source_sync_metadata',
    {
      p_source_id: sourceId,
      p_org_id: orgId,
      p_last_synced_at: status === "success" ? new Date().toISOString() : null,
      p_last_error: message,
    }
  );

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

  return { success: true, eventsProcessed, message };
}

export async function getSyncRunItems(input: { orgId: string; runId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Authentication required");
  }

  // Verify user has access to org
  const { data: membership } = await (supabase as any).rpc('get_org_membership', {
    p_org_id: input.orgId,
  });

  if (!membership) {
    throw new Error("Access denied");
  }

  const { data, error } = await (supabase as any).rpc('get_sync_run_items', {
    p_sync_run_id: input.runId,
  });

  if (error) {
    logger.error("Failed to fetch sync run items", error);
    throw new Error(error.message);
  }

  return data || [];
}

