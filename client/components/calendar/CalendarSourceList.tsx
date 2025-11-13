"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/lib/database.types";
import {
  updateCalendarSource,
  deleteCalendarSource,
  triggerCalendarSync,
} from "@/lib/actions/calendar-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CalendarSourceListProps {
  orgId: string;
  sources: Database["public"]["Tables"]["calendar_sync_sources"]["Row"][];
}

export function CalendarSourceList({ orgId, sources }: CalendarSourceListProps) {
  if (sources.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No calendar feeds connected yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <CalendarSourceCard key={source.id} orgId={orgId} source={source} />
      ))}
    </div>
  );
}

function CalendarSourceCard({
  orgId,
  source,
}: {
  orgId: string;
  source: Database["public"]["Tables"]["calendar_sync_sources"]["Row"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const nextStatus = source.status === "active" ? "paused" : "active";
    startTransition(async () => {
      const result = await updateCalendarSource({
        orgId,
        sourceId: source.id,
        status: nextStatus,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to update calendar feed");
        return;
      }

      toast.success(nextStatus === "active" ? "Calendar feed resumed" : "Calendar feed paused");
      router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCalendarSource({ orgId, sourceId: source.id });
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove calendar feed");
        return;
      }

      toast.success("Calendar feed removed");
      router.refresh();
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      const result = await triggerCalendarSync({ orgId, sourceId: source.id });
      if (!result.success) {
        toast.error(result.error ?? "Calendar sync failed");
        return;
      }

      const message = result.eventsProcessed
        ? `${result.eventsProcessed} events synced`
        : "Sync completed";
      toast.success(message);
      router.refresh();
    });
  };

  const lastSyncedLabel = source.last_synced_at
    ? `${formatDistanceToNow(new Date(source.last_synced_at), { addSuffix: true })}`
    : "Never";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{source.source_url}</CardTitle>
          <div className="text-xs text-muted-foreground">
            Sync every {source.sync_interval_minutes} minutes • Last synced {lastSyncedLabel}
          </div>
          {source.last_error ? (
            <div className="text-xs text-destructive">Last error: {source.last_error}</div>
          ) : null}
        </div>
        <Badge variant={source.status === "active" ? "secondary" : "outline"}>
          {source.status === "active" ? "Active" : "Paused"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleSync} disabled={isPending}>
          {isPending ? "Syncing…" : "Sync now"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleToggle} disabled={isPending}>
          {source.status === "active" ? "Pause" : "Resume"}
        </Button>
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
          Remove
        </Button>
      </CardContent>
    </Card>
  );
}
