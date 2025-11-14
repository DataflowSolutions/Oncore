import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";
import { CalendarService } from "@/lib/services/calendar-sync";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: sources, error } = await supabase
      .from("calendar_sync_sources")
      .select(
        "id, org_id, source_url, sync_interval_minutes, last_synced_at, status",
      )
      .eq("status", "active");

    if (error) {
      logger.error("Failed to load calendar sources", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = Date.now();
    const dueSources = (sources ?? []).filter((source) => {
      if (!source.last_synced_at) return true;
      const last = new Date(source.last_synced_at).getTime();
      return now - last >= source.sync_interval_minutes * 60 * 1000;
    });

    const calendarService = new CalendarService(supabase);
    const results: Array<{
      sourceId: string;
      status: "success" | "failed";
      eventsProcessed: number;
      message: string | null;
    }> = [];

    for (const source of dueSources) {
      let status: "success" | "failed" = "success";
      let message: string | null = null;
      let eventsProcessed = 0;

      try {
        const response = await fetch(source.source_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch calendar feed (${response.status})`);
        }

        const icalContent = await response.text();
        const result = await calendarService.importICalendar(source.org_id, icalContent);

        if (!result.success) {
          status = "failed";
          message = result.error ?? "Calendar import failed";
        }

        eventsProcessed = result.count ?? 0;
      } catch (error) {
        const err = error as Error;
        status = "failed";
        message = err.message ?? "Calendar sync failed";
        logger.error("Calendar cron sync failed", {
          sourceId: source.id,
          error: err.message,
        });
      }

      const { error: runError } = await supabase
        .from("calendar_sync_runs")
        .insert({
          source_id: source.id,
          status,
          message,
          events_processed: eventsProcessed,
          finished_at: new Date().toISOString(),
        });

      if (runError) {
        logger.error("Failed to record cron calendar run", runError);
      }

      const { error: updateError } = await supabase
        .from("calendar_sync_sources")
        .update({
          last_synced_at: status === "success" ? new Date().toISOString() : source.last_synced_at,
          last_error: message,
        })
        .eq("id", source.id);

      if (updateError) {
        logger.error("Failed to update calendar source after cron", updateError);
      }

      results.push({
        sourceId: source.id,
        status,
        eventsProcessed,
        message,
      });
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    const err = error as Error;
    logger.error("Calendar cron execution failed", err);
    return NextResponse.json({ error: err.message ?? "Calendar cron failed" }, { status: 500 });
  }
}
