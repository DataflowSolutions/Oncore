import React from "react";
import { getShowsByOrg, ShowWithVenue } from "@/lib/actions/shows";

interface ShowsTableProps {
  orgId: string
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

const ShowsTable = async ({ orgId }: ShowsTableProps) => {
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
              <div
                key={show.id}
                className="rounded-lg border border-input bg-card text-foreground shadow-sm p-3 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex justify-between items-center"
              >
                <div className="flex flex-col gap-2">
                  <h4 className="font-semibold text-sm truncate">
                    {show.title || 'Untitled Show'}
                  </h4>
                  <span className="text-xs text-foreground/50 font-medium">
                    {show.venue?.name || 'No venue set'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
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
