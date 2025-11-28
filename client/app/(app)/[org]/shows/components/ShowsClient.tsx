"use client";

import React, { useState, useMemo } from "react";
import { ShowWithVenue } from "@/lib/actions/shows";
import ShowsSearchbar from "./ShowsSearchbar";
import ShowsTable from "./ShowsTable";
import ShowsCalendar from "./ShowsCalendar";
import CreateShowButton from "./CreateShowButton";
// import ImportDataButton from "./ImportDataButton";

interface ShowsClientProps {
  shows: ShowWithVenue[];
  orgSlug: string;
  orgId: string;
}

export default function ShowsClient({
  shows,
  orgSlug,
  orgId,
}: ShowsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter shows based on search query
  const filteredShows = useMemo(() => {
    if (!searchQuery.trim()) {
      return shows;
    }

    const query = searchQuery.toLowerCase();

    return shows.filter((show) => {
      // Search in show title
      const titleMatch = show.title?.toLowerCase().includes(query);

      // Search in venue name and city
      const venueNameMatch = show.venue?.name?.toLowerCase().includes(query);
      const venueCityMatch = show.venue?.city?.toLowerCase().includes(query);

      // Search in artists (from show_assignments)
      const artistMatch = show.show_assignments?.some((assignment) => {
        const person = assignment.people;
        return (
          person?.member_type === "Artist" &&
          person?.name?.toLowerCase().includes(query)
        );
      });

      return titleMatch || venueNameMatch || venueCityMatch || artistMatch;
    });
  }, [shows, searchQuery]);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <ShowsSearchbar value={searchQuery} onChange={setSearchQuery} />
        <div className="flex flex-wrap gap-3">
          {/* <ImportDataButton orgId={orgId} /> */}
          <CreateShowButton orgId={orgId} orgSlug={orgSlug} />
        </div>
      </div>

      <div className="flex gap-10">
        <ShowsTable shows={filteredShows} orgSlug={orgSlug} />
        <div className="flex-1 hidden md:block">
          <ShowsCalendar shows={filteredShows} orgSlug={orgSlug} />
        </div>
      </div>
    </>
  );
}
