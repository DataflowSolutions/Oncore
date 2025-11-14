"use client";

import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/lib/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParams, useRouter } from "next/navigation";

interface CalendarRunListProps {
  runs: (Database["public"]["Tables"]["calendar_sync_runs"]["Row"] & {
    source?: {
      id: string;
      source_url: string | null;
      source_name: string | null;
      status: string;
    } | null;
  })[];
}

export function CalendarRunList({ runs }: CalendarRunListProps) {
  const params = useParams();
  const router = useRouter();
  const org = params.org as string;
  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No sync activity recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent sync activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {runs.map((run) => (
          <div 
            key={run.id} 
            className="rounded-md border p-4 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => router.push(`/${org}/calendar/${run.id}`)}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium">
                  {run.source?.source_name || run.source?.source_url || "Unknown source"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Started {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                  {run.finished_at
                    ? ` • Finished ${formatDistanceToNow(new Date(run.finished_at), { addSuffix: true })}`
                    : ""}
                </div>
                {run.message ? (
                  <div className="mt-2 text-xs text-muted-foreground">{run.message}</div>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={run.status === "success" ? "secondary" : "destructive"}>
                  {run.status === "success" ? "Success" : "Failed"}
                </Badge>
                {typeof run.events_processed === "number" ? (
                  <span className="text-xs text-muted-foreground">
                    {run.events_processed} events processed
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
