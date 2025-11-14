"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCalendarSource } from "@/lib/actions/calendar-sync";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CalendarSourceFormProps {
  orgId: string;
}

export function CalendarSourceForm({ orgId }: CalendarSourceFormProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [interval, setInterval] = useState(60);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sourceUrl.trim()) {
      toast.error("Please provide a calendar feed URL");
      return;
    }

    startTransition(async () => {
      const result = await createCalendarSource({
        orgId,
        sourceUrl: sourceUrl.trim(),
        syncIntervalMinutes: interval,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to add calendar feed");
        return;
      }

      toast.success("Calendar feed added");
      setSourceUrl("");
      setInterval(60);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect external calendar</CardTitle>
        <CardDescription>
          Sync offers and shows from iCal feeds or Google Calendar share links.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calendar-feed-url">Calendar feed URL</Label>
            <Input
              id="calendar-feed-url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://example.com/calendar.ics"
              type="url"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="calendar-sync-interval">Sync frequency (minutes)</Label>
            <Input
              id="calendar-sync-interval"
              type="number"
              min={15}
              max={1440}
              value={interval}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                if (Number.isNaN(next)) {
                  setInterval(15);
                  return;
                }
                setInterval(Math.min(1440, Math.max(15, next)));
              }}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Connecting…" : "Add calendar feed"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
