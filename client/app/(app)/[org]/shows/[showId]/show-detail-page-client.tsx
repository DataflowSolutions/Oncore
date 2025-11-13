"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Music, FileText } from "lucide-react";
import Link from "next/link";
import { ScheduleManager } from "@/components/shows/ScheduleManager";
import { ShowClient } from "./ShowClient";
import {
  EditableTitle,
  EditableDate,
  EditableTime,
  EditableVenue,
  EditableNotes,
} from "@/components/shows/EditableShowFields";
import { useShowWithVenue, useShowSchedule } from "@/lib/hooks/use-shows";
import { useShowTeamData } from "@/lib/hooks/use-show-team";
import { useVenues } from "@/lib/hooks/use-venues";
import type { PersonListItem } from "@/lib/actions/show-team";

interface ShowDetailPageClientProps {
  orgSlug: string;
  showId: string;
  orgId: string;
}

export function ShowDetailPageClient({
  orgSlug,
  showId,
  orgId,
}: ShowDetailPageClientProps) {
  // Fetch all data using TanStack Query - will use prefetched data on initial load
  const {
    data: show,
    isLoading: showLoading,
    error: showError,
  } = useShowWithVenue(showId, orgSlug);
  const { data: scheduleItems = [], isLoading: scheduleLoading } =
    useShowSchedule(showId, orgSlug);
  // OPTIMIZED: Direct server action call instead of API route
  const { data: teamData, isLoading: teamLoading } = useShowTeamData(
    showId,
    orgSlug,
    orgId
  );
  const { data: venues = [], isLoading: venuesLoading } = useVenues(orgSlug);

  // Extract team data
  const assignedTeam = (teamData?.assignedTeam || []) as PersonListItem[];
  const availablePeople = (teamData?.availablePeople || []) as PersonListItem[];

  // Loading state
  if (showLoading || scheduleLoading || teamLoading || venuesLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-muted rounded-lg"></div>
        <div className="h-96 bg-muted rounded-lg"></div>
      </div>
    );
  }

  // Error state
  if (showError || !show) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load show details</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Actions */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/${orgSlug}/shows/${showId}/day`} prefetch={true}>
          <Button size="lg" className="gap-2">
            <Calendar className="w-5 h-5" />
            Day Schedule
          </Button>
        </Link>
        <ShowClient
          showId={showId}
          assignedTeam={assignedTeam}
          availablePeople={availablePeople}
        />
        <Link href={`/${orgSlug}/shows/${showId}/advancing`} prefetch={true}>
          <Button size="lg" variant="outline" className="gap-2">
            <FileText className="w-5 h-5" />
            Advancing
          </Button>
        </Link>
      </div>

      {/* Show Details - Simplified Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venue - Most Important */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Venue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {show.venues ? (
              <div className="space-y-4">
                <EditableVenue
                  showId={showId}
                  orgSlug={orgSlug}
                  currentVenueId={show.venues.id}
                  venues={venues}
                />
                {show.venues.capacity && (
                  <Badge variant="outline" className="w-fit">
                    Capacity: {show.venues.capacity}
                  </Badge>
                )}
              </div>
            ) : (
              <EditableVenue
                showId={showId}
                orgSlug={orgSlug}
                currentVenueId={null}
                venues={venues}
              />
            )}
          </CardContent>
        </Card>

        {/* Time Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EditableTime
              showId={showId}
              orgSlug={orgSlug}
              currentValue={show.doors_at}
              fieldName="doors_at"
              label="Doors"
            />
            <EditableTime
              showId={showId}
              orgSlug={orgSlug}
              currentValue={show.set_time}
              fieldName="set_time"
              label="Set Time"
            />
            {!show.doors_at && !show.set_time && (
              <p className="text-muted-foreground">Times TBD</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Artist */}
      {show.artists && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Music className="w-5 h-5" />
              Artist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{show.artists.name}</p>
          </CardContent>
        </Card>
      )}

      {/* Schedule - Most Important for Day-of */}
      <ScheduleManager
        orgSlug={orgSlug}
        showId={showId}
        showDate={show.date}
        scheduleItems={scheduleItems}
      />

      {/* Notes - Less Priority */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditableNotes
            showId={showId}
            orgSlug={orgSlug}
            currentValue={show.notes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
