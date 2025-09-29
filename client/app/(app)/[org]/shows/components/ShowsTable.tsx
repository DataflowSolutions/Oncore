import React from "react";
import Link from "next/link";
import { getShowsByOrg, ShowWithVenue } from "@/lib/actions/shows";
import { VenueLink } from "./VenueLink";

interface ShowsTableProps {
  orgId: string
  orgSlug: string
}

function getShowsByMonth(shows: ShowWithVenue[]) {
  const groupedShows: { [key: string]: ShowWithVenue[] } = {}

  shows.forEach((show) => {
    const showDate = new Date(show.date)
    const monthYear = showDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })

    if (!groupedShows[monthYear]) {
      groupedShows[monthYear] = []
    }

    groupedShows[monthYear].push(show)
  })

  // Sort shows within each month by date
  Object.keys(groupedShows).forEach((monthYear) => {
    groupedShows[monthYear].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  })

  // Sort months chronologically
  const sortedEntries = Object.entries(groupedShows).sort(
    ([, showsA], [, showsB]) => {
      return new Date(showsA[0].date).getTime() - new Date(showsB[0].date).getTime()
    }
  )

  return Object.fromEntries(sortedEntries)
}

const ShowsTable = async ({ orgId, orgSlug }: ShowsTableProps) => {
  const shows = await getShowsByOrg(orgId)
  const showsByMonth = getShowsByMonth(shows)

  if (shows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No shows yet. Create your first show to get started!</p>
      </div>
    )
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
            {shows.map((show: ShowWithVenue) => (
              <div key={show.id} className="rounded-lg border border-input bg-card text-foreground shadow-sm p-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex justify-between items-center group">
                <div className="flex flex-col gap-2 flex-1">
                  <Link
                    href={`/${orgSlug}/shows/${show.id}`}
                    className="cursor-pointer"
                  >
                    <h4 className="font-semibold text-sm truncate group-hover:text-primary">
                      {show.title || 'Untitled Show'}
                    </h4>
                  </Link>
                  {show.venue ? (
                    <VenueLink
                      href={`/${orgSlug}/venues/${show.venue?.id}`}
                      venueName={show.venue.name}
                      className="text-xs text-foreground/50 font-medium hover:text-primary hover:underline"
                    />
                  ) : (
                    <span className="text-xs text-foreground/50 font-medium">
                      No venue set
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <span className="text-xs text-foreground/50 font-medium">
                    {show.venue?.city || 'Location TBD'}
                  </span>
                  <span className="text-xs text-foreground/50 font-medium">
                    {new Date(show.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShowsTable;
