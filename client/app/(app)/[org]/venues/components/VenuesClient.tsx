"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Calendar, Users, Building } from "lucide-react";
import Link from "next/link";
import VenueViewToggler from "./VenueViewToggler";

interface Venue {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  capacity: number | null;
  contacts: unknown;
  created_at: string;
  shows?: Array<{ count: number }>;
}

interface VenuesClientProps {
  venues: Venue[];
  orgSlug: string;
  view: string;
}

export default function VenuesClient({
  venues,
  orgSlug,
  view,
}: VenuesClientProps) {
  const totalShows = venues.reduce(
    (sum, venue) => sum + (venue.shows?.[0]?.count || 0),
    0
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Venues</h1>
          <p className="mt-2 text-foreground/50">
            Manage venue contacts, technical specs, and show history
          </p>
        </div>
        <VenueViewToggler />
      </div>

      <div className="space-y-6">
        {view === "promoters" ? (
          // Promoters placeholder
          <Card>
            <CardContent className="text-center py-16">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Promoters</h3>
              <p className="text-muted-foreground mb-4">
                Manage promoters and external collaborators
              </p>
              <p className="text-sm text-muted-foreground">
                Promoter list functionality coming soon
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{venues.length}</p>
                      <p className="text-xs text-muted-foreground">
                        Total Venues
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{totalShows}</p>
                      <p className="text-xs text-muted-foreground">
                        Total Shows
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">
                        {venues.filter((v) => v.city).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Cities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Venues */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  <CardTitle className="text-lg">
                    All Venues ({venues.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {venues.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No venues added yet. Add your first venue to get started!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {venues.map((venue) => {
                      const showCount = venue.shows?.[0]?.count || 0;
                      return (
                        <Link
                          key={venue.id}
                          href={`/${orgSlug}/venues/${venue.id}`}
                          className="block rounded-lg border border-input bg-card text-foreground shadow-sm p-2.5 sm:p-3 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="flex flex-col gap-2">
                            {/* Header with name and badges */}
                            <div className="flex flex-col gap-1.5">
                              <h4 className="font-semibold text-foreground text-sm">
                                {venue.name}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {showCount > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs h-5"
                                  >
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {showCount} show{showCount !== 1 ? "s" : ""}
                                  </Badge>
                                )}
                                {venue.capacity && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs h-5"
                                  >
                                    <Building className="w-3 h-3 mr-1" />
                                    Cap. {venue.capacity}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Location and contact information */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-xs text-muted-foreground">
                              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                                {venue.city && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span>
                                      {venue.city}
                                      {venue.country && `, ${venue.country}`}
                                    </span>
                                  </div>
                                )}
                                {venue.address && (
                                  <div className="flex items-center gap-1">
                                    <Globe className="w-3 h-3 flex-shrink-0" />
                                    <span className="break-all">
                                      {venue.address}
                                    </span>
                                  </div>
                                )}
                                {venue.contacts !== null &&
                                  venue.contacts !== undefined && (
                                    <div className="flex items-center gap-1">
                                      <Users className="w-3 h-3 flex-shrink-0" />
                                      <span>Contact info available</span>
                                    </div>
                                  )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span>
                                  Added{" "}
                                  {new Date(
                                    venue.created_at
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
