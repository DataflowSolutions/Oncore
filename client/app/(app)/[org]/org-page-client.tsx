"use client";

import { useShows } from "@/lib/hooks/use-shows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, MapPin, Music } from "lucide-react";
import Link from "next/link";
import { VenueLink } from "./shows/components/VenueLink";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

export function OrgPageClient({
  orgSlug,
  orgName,
}: {
  orgSlug: string;
  orgName: string;
}) {
  const router = useRouter();
  // Use prefetched data - instant load!
  const { data: allShows = [] } = useShows(orgSlug);

  // Filter to upcoming shows only (client-side filtering of cached data)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const upcomingShows = useMemo(
    () => allShows?.filter((show) => show.date >= todayStr).slice(0, 5) || [],
    [allShows, todayStr]
  );

  const todaysShows = useMemo(
    () => upcomingShows?.filter((show) => show.date === todayStr) || [],
    [upcomingShows, todayStr]
  );

  const nextWeekShows = useMemo(
    () => upcomingShows?.filter((show) => show.date !== todayStr) || [],
    [upcomingShows, todayStr]
  );

  type ShowAssignment = {
    people: {
      id: string;
      name: string;
      member_type: string | null;
    } | null;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            {orgName}
          </h1>
          <p className="text-muted-foreground mt-2">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* TODAY'S SHOWS - Most Important */}
      {todaysShows.length > 0 && (
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              Today&apos;s Shows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysShows.map((show) => (
              <div
                key={show.id}
                className="p-4 bg-background rounded-lg hover:shadow-md transition-all border border-border hover:border-primary cursor-pointer"
                onClick={() => router.push(`/${orgSlug}/shows/${show.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{show.title}</h3>
                    <p className="text-muted-foreground">
                      {show.venue?.id ? (
                        <VenueLink
                          href={`/${orgSlug}/venues/${show.venue.id}`}
                          venueName={show.venue.name}
                          className="hover:text-primary hover:underline"
                        />
                      ) : (
                        show.venue?.name || "No venue"
                      )}
                      {show.venue?.city && ` • ${show.venue.city}`}
                    </p>
                  </div>
                  <Badge className="text-base px-3 py-1">
                    {show.set_time || "TBD"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* UPCOMING THIS WEEK */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Upcoming Shows</h2>
          <div className="flex gap-3">
            <Link href={`/${orgSlug}/shows`} prefetch={true}>
              <Button size="lg" className="cursor-pointer">
                <Calendar className="w-5 h-5" />
                View All Shows
              </Button>
            </Link>
          </div>
        </div>

        {nextWeekShows.length === 0 && todaysShows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Upcoming Shows</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first show
              </p>
              <Link href={`/${orgSlug}/shows`}>
                <Button size="lg">
                  <Calendar className="w-5 h-5" />
                  Create Show
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {nextWeekShows.map((show) => {
              // Get all artists assigned to this show
              const artists =
                show.show_assignments
                  ?.map((assignment: ShowAssignment) => assignment.people)
                  .filter(
                    (
                      person: ShowAssignment["people"]
                    ): person is NonNullable<typeof person> =>
                      person?.member_type === "Artist"
                  )
                  .map(
                    (person: NonNullable<ShowAssignment["people"]>) =>
                      person.name
                  )
                  .filter(Boolean) || [];

              const artistNames =
                artists.length > 0 ? artists.join(", ") : "No Artist";

              // Format the date with day of week
              const showDate = new Date(show.date);
              const formattedDate = showDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={show.id}
                  className="rounded-lg border border-input bg-card text-foreground shadow-sm p-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
                  onClick={() => router.push(`/${orgSlug}/shows/${show.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    {/* Left side - Main content */}
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {show.title || "Untitled Show"}
                      </h4>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs">
                        {/* Artists */}
                        <div className="flex items-center gap-1.5">
                          <Music className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground/70 font-medium">
                            {artistNames}
                          </span>
                        </div>

                        {/* Venue */}
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          {show.venue ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <VenueLink
                                href={`/${orgSlug}/venues/${show.venue.id}`}
                                venueName={show.venue.name}
                                className="text-foreground/70 font-medium hover:text-primary hover:underline"
                              />
                              {show.venue.city && (
                                <>
                                  <span className="text-muted-foreground">
                                    •
                                  </span>
                                  <span className="text-muted-foreground">
                                    {show.venue.city}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              No venue set
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side - Date */}
                    <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground sm:hidden" />
                      <span className="text-foreground/70 font-medium">
                        {formattedDate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK ACTIONS - BIG BUTTONS */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href={`/${orgSlug}/people`} prefetch={true}>
            <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full bg-gradient-to-br from-blue-500/10 to-transparent border-2 hover:border-blue-500/50">
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                <h3 className="font-bold text-xl mb-1">People</h3>
                <p className="text-sm text-muted-foreground">
                  Manage team & contacts
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/${orgSlug}/venues`} prefetch={true}>
            <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full bg-gradient-to-br from-green-500/10 to-transparent border-2 hover:border-green-500/50">
              <CardContent className="py-8 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <h3 className="font-bold text-xl mb-1">Venues</h3>
                <p className="text-sm text-muted-foreground">
                  Find & manage venues
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/${orgSlug}/profile`} prefetch={true}>
            <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full bg-gradient-to-br from-purple-500/10 to-transparent border-2 hover:border-purple-500/50">
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-purple-500" />
                <h3 className="font-bold text-xl mb-1">Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Organization settings
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
