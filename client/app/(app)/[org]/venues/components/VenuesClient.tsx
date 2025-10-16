"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Calendar, Users, Building } from "lucide-react";
import Link from "next/link";
import VenueViewToggler from "./VenueViewToggler";
import VenuesSearchbar from "./VenuesSearchbar";
import { PromotersList } from "@/components/promoters/PromotersList";
import type { PromoterWithVenues } from "@/lib/actions/promoters";

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
  promoters: PromoterWithVenues[];
  orgId: string;
  orgSlug: string;
  view: string;
}

export default function VenuesClient({
  venues,
  promoters,
  orgId,
  orgSlug,
  view,
}: VenuesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter venues based on search query
  const filteredVenues = useMemo(() => {
    if (!searchQuery.trim()) {
      return venues;
    }

    const query = searchQuery.toLowerCase();

    return venues.filter((venue) => {
      // Search in venue name
      const nameMatch = venue.name?.toLowerCase().includes(query);

      // Search in city
      const cityMatch = venue.city?.toLowerCase().includes(query);

      // Search in country
      const countryMatch = venue.country?.toLowerCase().includes(query);

      // Search in address
      const addressMatch = venue.address?.toLowerCase().includes(query);

      return nameMatch || cityMatch || countryMatch || addressMatch;
    });
  }, [venues, searchQuery]);

  return (
    <>
      {view === "promoters" ? (
        // Promoters view - show actual promoters
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Promoters</h2>
              <p className="text-muted-foreground mt-1">
                Manage promoters and their venue relationships
              </p>
            </div>
            <VenueViewToggler />
          </div>
          <PromotersList promoters={promoters} orgId={orgId} />
        </>
      ) : (
        // Venues view - full functionality
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1">
              <VenuesSearchbar value={searchQuery} onChange={setSearchQuery} />
            </div>
            <VenueViewToggler />
          </div>

          <div className="space-y-6">
            {/* All Venues */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  <CardTitle className="text-lg">
                    All Venues ({filteredVenues.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {filteredVenues.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery.trim()
                        ? "No venues found matching your search."
                        : "No venues added yet. Add your first venue to get started!"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredVenues.map((venue) => {
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
          </div>
        </>
      )}
    </>
  );
}
