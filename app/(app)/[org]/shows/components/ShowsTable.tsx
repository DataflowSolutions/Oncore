import React from "react";
import { SHOWS_DATA, getShowsByMonth, Show } from "../constants/shows";

const ShowsTable = () => {
  const showsByMonth = getShowsByMonth(SHOWS_DATA);

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
            {shows.map((show: Show) => (
              <div
                key={show.id}
                className="rounded-lg border border-input bg-card text-foreground shadow-sm p-3 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex justify-between items-center"
              >
                <div className="flex flex-col gap-2">
                  <h4 className="font-semibold text-sm truncate">
                    {show.title}
                  </h4>
                  <span className="text-xs text-foreground/50 font-medium">
                    {show.description}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-foreground/50 font-medium">
                    {show.location}
                  </span>
                  <span className="text-xs text-foreground/50 font-medium">
                    {show.date}
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
