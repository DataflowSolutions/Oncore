import React from "react";
import Link from "next/link";
import { ShowWithVenue } from "@/lib/actions/shows";
import { Music, MapPin, Calendar } from "lucide-react";

interface ShowsTableProps {
  shows: ShowWithVenue[];
  orgSlug: string;
}

function getShowsByMonth(shows: ShowWithVenue[]) {
  const groupedShows: { [key: string]: ShowWithVenue[] } = {};

  shows.forEach((show) => {
    const showDate = new Date(show.date);
    const monthYear = showDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    if (!groupedShows[monthYear]) {
      groupedShows[monthYear] = [];
    }

    groupedShows[monthYear].push(show);
  });

  // Sort shows within each month by date
  Object.keys(groupedShows).forEach((monthYear) => {
    groupedShows[monthYear].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  });

  // Sort months chronologically
  const sortedEntries = Object.entries(groupedShows).sort(
    ([, showsA], [, showsB]) => {
      return (
        new Date(showsA[0].date).getTime() - new Date(showsB[0].date).getTime()
      );
    }
  );

  return Object.fromEntries(sortedEntries);
}

const ShowsTable = ({ shows, orgSlug }: ShowsTableProps) => {
  const showsByMonth = getShowsByMonth(shows);

  if (shows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No shows yet. Create your first show to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(showsByMonth).map(([monthYear, shows]) => (
        <div key={monthYear}>
          <div className="flex gap-2 mb-2">
            <h4 className="text-lg font-semibold text-foreground">
              {monthYear}
            </h4>
            <div className="border border-input flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold text-sm">
              <span>
                {shows.length} {shows.length === 1 ? "show" : "shows"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {shows.map((show: ShowWithVenue) => {
              // Get all artists assigned to this show
              const artists =
                show.show_assignments
                  ?.map((assignment) => assignment.people)
                  .filter((person) => person?.member_type === "Artist")
                  .map((person) => person?.name)
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
                  className="rounded-lg border border-input bg-card text-foreground shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
                >
                  <Link
                    href={`/${orgSlug}/shows/${show.id}`}
                    className="block p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      {/* Left side - Main content */}
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <h4 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {show.title || "Untitled Show"}
                        </h4>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                          {/* Artist and City on one line */}
                          <div className="flex items-center gap-2">
                            <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground/90 font-medium">
                              {artistNames}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            {show.venue?.city && (
                              <span className="text-muted-foreground">
                                {show.venue.city}
                              </span>
                            )}
                          </div>

                          {/* Venue on second line */}
                          {show.venue && (
                            <div className="flex items-center gap-2 sm:ml-auto">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground/70 font-medium hover:text-primary hover:underline">
                                {show.venue.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side - Date */}
                      <div className="flex items-center gap-2 text-sm flex-shrink-0 text-muted-foreground">
                        <Calendar className="h-4 w-4 sm:hidden" />
                        <span className="font-medium">
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShowsTable;
