"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Calendar, Users, Building } from "lucide-react";
import Link from "next/link";
import VenueViewToggler from "./VenueViewToggler";
import PromotersListPlaceholder from "./PromotersListPlaceholder";

interface Show {
  id: string;
  title: string | null;
  date: string;
  status: string;
}

interface Venue {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  capacity: number | null;
  created_at: string;
  org_id: string;
}

interface VenueClientProps {
  venue: Venue;
  shows: Show[];
  orgSlug: string;
  view: string;
}

export default function VenueClient({
  venue,
  shows,
  orgSlug,
  view,
}: VenueClientProps) {
  const upcomingShows = shows.filter(
    (show) => new Date(show.date) >= new Date()
  );
  const pastShows = shows.filter((show) => new Date(show.date) < new Date());

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{venue.name}</h1>
          <p className="mt-2 text-foreground/50">
            {venue.city && venue.country
              ? `${venue.city}, ${venue.country}`
              : venue.city || venue.country || "Venue details"}
          </p>
        </div>
        <VenueViewToggler />
      </div>

      {view === "promoters" ? (
        <PromotersListPlaceholder />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Venue Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Venue Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {venue.address && (
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {venue.address}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {venue.city && venue.country
                        ? `${venue.city}, ${venue.country}`
                        : venue.city || venue.country || "Not specified"}
                    </p>
                  </div>
                </div>

                {venue.capacity && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Capacity</p>
                      <p className="text-sm text-muted-foreground">
                        {venue.capacity.toLocaleString()} people
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Added on{" "}
                  {new Date(venue.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shows at this venue */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Show History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Total Shows:</span>
                    <span className="font-medium">{shows.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Upcoming:</span>
                    <span className="font-medium">{upcomingShows.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Past:</span>
                    <span className="font-medium">{pastShows.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Shows */}
            {upcomingShows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Shows</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingShows.slice(0, 5).map((show) => (
                      <Link
                        key={show.id}
                        href={`/${orgSlug}/shows/${show.id}`}
                        className="block p-3 rounded border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {show.title || "Untitled Show"}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {new Date(show.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <Badge
                            variant={
                              show.status === "confirmed"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {show.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                    {upcomingShows.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        And {upcomingShows.length - 5} more upcoming shows
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Past Shows */}
            {pastShows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Shows</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pastShows.slice(0, 3).map((show) => (
                      <Link
                        key={show.id}
                        href={`/${orgSlug}/shows/${show.id}`}
                        className="block p-3 rounded border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {show.title || "Untitled Show"}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {new Date(show.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {show.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                    {pastShows.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        And {pastShows.length - 3} more past shows
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {shows.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No shows at this venue yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a show and select this venue
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
