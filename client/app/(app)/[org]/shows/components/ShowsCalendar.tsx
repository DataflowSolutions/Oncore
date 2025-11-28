"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShowWithVenue } from "@/lib/actions/shows";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarqueeText } from "@/components/ui/marquee-text";

interface ShowsCalendarProps {
  shows: ShowWithVenue[];
  orgSlug: string;
}

const ShowsCalendar = ({ shows, orgSlug }: ShowsCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedArtist, setSelectedArtist] = useState<string>("all");
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  const isSameDay = (
    first: Date | string | null | undefined,
    second: Date | string | null | undefined
  ) => {
    if (!first || !second) return false;
    const firstDate = new Date(first);
    const secondDate = new Date(second);
    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  };

  const openDayView = (date: Date) => {
    setDayViewDate(date);
    setCurrentDate(date);
  };

  const closeDayView = () => setDayViewDate(null);

  const goToToday = () => {
    setCurrentDate(new Date());
    setDayViewDate(null);
  };

  const shiftMonth = (months: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + months);
      return next;
    });
  };

  const shiftDayView = (days: number) => {
    setDayViewDate((prev) => {
      if (!prev) return prev;
      const next = new Date(prev);
      next.setDate(prev.getDate() + days);
      setCurrentDate(next);
      return next;
    });
  };

  const formatTime = (value?: string | Date | null) => {
    if (!value) return "TBA";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "TBA";
    return parsed.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Get the first day of the month and how many days in the month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday

  // Get previous month info for padding
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonthLastDay = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

  // Calculate the starting day (Monday = 0, Sunday = 6)
  const mondayBasedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  // Get unique cities and artists for filters
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    shows.forEach((show) => {
      if (show.venue?.city) {
        citySet.add(show.venue.city);
      }
    });
    return Array.from(citySet).sort();
  }, [shows]);

  const artists = useMemo(() => {
    const artistSet = new Set<string>();
    shows.forEach((show) => {
      show.show_assignments?.forEach((assignment) => {
        if (
          assignment.people?.member_type === "artist" &&
          assignment.people?.name
        ) {
          artistSet.add(assignment.people.name);
        }
      });
    });
    return Array.from(artistSet).sort();
  }, [shows]);

  const hasActiveFilters = selectedCity !== "all" || selectedArtist !== "all";

  // Filter shows based on selected filters
  const filteredShows = useMemo(() => {
    return shows.filter((show) => {
      // City filter
      if (selectedCity !== "all" && show.venue?.city !== selectedCity) {
        return false;
      }

      // Artist filter
      if (selectedArtist !== "all") {
        const showArtists =
          show.show_assignments
            ?.map((a) => a.people)
            .filter((p) => p?.member_type === "artist")
            .map((p) => p?.name) || [];
        if (!showArtists.includes(selectedArtist)) {
          return false;
        }
      }

      return true;
    });
  }, [shows, selectedCity, selectedArtist]);

  const dayViewShows = useMemo(() => {
    if (!dayViewDate) return [];
    return filteredShows.filter((show) => isSameDay(show.date, dayViewDate));
  }, [filteredShows, dayViewDate]);

  const allShowsOnDay = useMemo(() => {
    if (!dayViewDate) return [];
    return shows.filter((show) => isSameDay(show.date, dayViewDate));
  }, [shows, dayViewDate]);

  const sortedDayViewShows = useMemo(() => {
    if (!dayViewDate) return [];
    return [...dayViewShows].sort((a, b) => {
      const first = new Date(a.set_time || a.date).getTime();
      const second = new Date(b.set_time || b.date).getTime();
      return first - second;
    });
  }, [dayViewShows, dayViewDate]);

  // Group shows by date
  const showsByDate: { [key: string]: ShowWithVenue[] } = {};
  filteredShows.forEach((show) => {
    const showDate = new Date(show.date);
    const dateKey = `${showDate.getFullYear()}-${String(
      showDate.getMonth() + 1
    ).padStart(2, "0")}-${String(showDate.getDate()).padStart(2, "0")}`;
    if (!showsByDate[dateKey]) {
      showsByDate[dateKey] = [];
    }
    showsByDate[dateKey].push(show);
  });

  // Generate calendar days array
  const calendarDays: Array<{
    day: number;
    isCurrentMonth: boolean;
    date: Date;
  }> = [];

  // Add days from previous month
  for (let i = mondayBasedStart - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(prevMonthYear, prevMonth, day),
    });
  }

  // Add the days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day),
    });
  }

  // Add days from next month to complete the grid (only if needed to reach 5 rows)
  const totalCells = calendarDays.length;
  const minRows = totalCells <= 35 ? 5 : 6; // Use 5 rows unless we need 6
  const targetCells = minRows * 7;
  const remainingCells = targetCells - totalCells;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextMonthYear = month === 11 ? year + 1 : year;
  for (let day = 1; day <= remainingCells; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(nextMonthYear, nextMonth, day),
    });
  }

  // Get shows for a specific date
  const getShowsForDate = (date: Date) => {
    const dateKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return showsByDate[dateKey] || [];
  };

  // Check if a day is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col h-[calc(100vh-15rem)] space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col gap-4 flex-shrink-0">
        {/* Title and Main Navigation */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-4 items-center flex-wrap">
            <h2 className="text-xl font-header truncate">
              {dayViewDate
                ? dayViewDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : currentDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
            </h2>

            <Button
              size="sm"
              className="py-3 px-6 cursor-pointer font-header  rounded-full"
              onClick={goToToday}
            >
              Today
            </Button>
          </div>
          <div className="flex gap-2 justify-center w-full xl:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="size-8 rounded-full flex items-center justify-center cursor-pointer"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="size-8 rounded-full flex items-center justify-center cursor-pointe"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Mobile Filters - Shown on mobile only */}
        <div className="flex lg:hidden gap-2 items-center justify-center flex-wrap">
          {/* City Filter */}
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[150px] h-10 text-base">
              <MapPin className="h-4 w-4 mr-1" />
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-base">
                All Cities
              </SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city} className="text-base">
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Artist Filter */}
          <Select value={selectedArtist} onValueChange={setSelectedArtist}>
            <SelectTrigger className="w-[150px] h-10 text-base">
              <Music className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Artist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-base">
                All Artists
              </SelectItem>
              {artists.map((artist) => (
                <SelectItem key={artist} value={artist} className="text-base">
                  {artist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(selectedCity !== "all" || selectedArtist !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCity("all");
                setSelectedArtist("all");
              }}
              className="h-10 gap-1.5 px-4"
            >
              <X className="h-4 w-4" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>

      {dayViewDate ? (
        <div className="space-y-6 border border-input rounded-lg bg-card p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                Day view
              </span>
              <p className="text-xl sm:text-2xl font-bold leading-tight text-foreground">
                {dayViewDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                Showing {dayViewShows.length}{" "}
                {dayViewShows.length === 1 ? "show" : "shows"}
                {hasActiveFilters &&
                allShowsOnDay.length !== dayViewShows.length
                  ? ` (filtered from ${allShowsOnDay.length} total)`
                  : allShowsOnDay.length > 0
                  ? " scheduled for this day."
                  : " scheduled yet."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 cursor-pointer"
                onClick={() => shiftDayView(-1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous day
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 cursor-pointer"
                onClick={() => shiftDayView(1)}
              >
                Next day
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 cursor-pointer"
                onClick={closeDayView}
              >
                Back to month view
              </Button>
            </div>
          </div>

          {sortedDayViewShows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-input bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              {hasActiveFilters && allShowsOnDay.length > 0
                ? "No shows match your current filters for this day."
                : "No shows scheduled for this day yet."}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDayViewShows.map((show) => {
                const artistNames = Array.from(
                  new Set(
                    show.show_assignments
                      ?.map((assignment) => assignment.people?.name)
                      .filter((name): name is string => Boolean(name)) || []
                  )
                );

                const setTimeLabel = formatTime(show.set_time);
                const doorsTimeLabel = formatTime(show.doors_at);
                const venueLocation = [show.venue?.city, show.venue?.country]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={show.id}
                    className="rounded-lg border border-input bg-background/60 p-4 sm:p-5 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold leading-tight text-foreground">
                          {show.title || "Untitled show"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span>
                            {setTimeLabel !== "TBA" ? setTimeLabel : "Time TBA"}
                          </span>
                          {show.venue?.name && (
                            <span className="hidden sm:inline">•</span>
                          )}
                          {show.venue?.name && <span>{show.venue.name}</span>}
                          {venueLocation && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span>{venueLocation}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {show.status && (
                        <Badge
                          variant="outline"
                          className="uppercase tracking-wide text-xs font-semibold"
                        >
                          {show.status}
                        </Badge>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-foreground">Timing</p>
                        <p>
                          <span className="text-muted-foreground">Set:</span>{" "}
                          {setTimeLabel}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Doors:</span>{" "}
                          {doorsTimeLabel}
                        </p>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-foreground">Venue</p>
                        <p>{show.venue?.name || "No venue assigned"}</p>
                        {show.venue?.address && <p>{show.venue.address}</p>}
                        {venueLocation && <p>{venueLocation}</p>}
                        {show.venue?.capacity !== null &&
                          show.venue?.capacity !== undefined && (
                            <p>
                              <span className="text-muted-foreground">
                                Capacity:
                              </span>{" "}
                              {show.venue.capacity.toLocaleString()}
                            </p>
                          )}
                      </div>
                    </div>

                    {artistNames.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Artists
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {artistNames.map((artist) => (
                            <Badge
                              key={artist}
                              variant="secondary"
                              className="text-xs"
                            >
                              {artist}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {show.notes && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Notes
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {show.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Link
                        href={`/${orgSlug}/shows/${show.id}/day`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Open show →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden select-none w-full flex flex-col flex-1 min-h-0">
            {/* Week day headers */}
            <div className="grid grid-cols-7 flex-shrink-0">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="p-1.5 sm:p-3 text-center text-[11px] sm:text-base font-bold border-b border-card-border text-description-foreground"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.substring(0, 2)}</span>
                </div>
              ))}
            </div>

            {/* Calendar days - Month View */}
            <div
              className="grid grid-cols-7 flex-1 min-h-0"
              style={{
                gridTemplateRows: `repeat(${Math.ceil(
                  calendarDays.length / 7
                )}, minmax(0, 1fr))`,
              }}
            >
              {calendarDays.map((dayInfo, index) => {
                const { day, isCurrentMonth, date: cellDate } = dayInfo;
                const dayShows = getShowsForDate(cellDate);
                const isTodayDate = isToday(day) && isCurrentMonth;
                // const showCount = dayShows.length;
                const isSelectedDayInMonth = dayViewDate
                  ? isSameDay(cellDate, dayViewDate)
                  : false;

                return (
                  <div
                    key={`${cellDate.toISOString()}-${index}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelectedDayInMonth}
                    // onClick={(event) => {
                    //   if ((event.target as HTMLElement).closest("a")) return;
                    //   openDayView(cellDate);
                    // }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDayView(cellDate);
                      }
                    }}
                    className={`h-full border-b border-input py-0.5 sm:py-2 transition-colors overflow-hidden outline-none hover:bg-accent/5 active:bg-accent/10 focus-visible:ring-2 focus-visible:ring-primary/60 ${
                      index % 7 !== 6 ? "border-r" : ""
                    } ${
                      isSelectedDayInMonth
                        ? "bg-amber-300 ring-2 ring-primary/40"
                        : isTodayDate
                        ? "bg-card/40 hover:bg-card/60"
                        : "bg-transparent hover:bg-card/20"
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-center mb-0.5 sm:mb-2 flex-shrink-0 px-0.5 sm:px-0">
                        <div
                          className={`text-xs sm:text-base ${
                            isCurrentMonth
                              ? "font-bold"
                              : "font-normal text-muted-foreground/40"
                          } ${
                            isTodayDate
                              ? "bg-primary text-primary-foreground rounded-full w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-base"
                              : ""
                          }`}
                        >
                          {day}
                        </div>
                        {/* {showCount > 0 && (
                          <Badge
                            variant={showCount > 2 ? "default" : "secondary"}
                            className="h-4 sm:h-5 px-1 sm:px-2 text-[9px] sm:text-xs font-medium"
                          >
                            {showCount}
                          </Badge>
                        )} */}
                      </div>
                      <div
                        className={`overflow-y-auto space-y-0.5 overflow-x-hidden`}
                      >
                        {dayShows.map((show) => {
                          // Get all artists assigned to this show
                          const artists =
                            show.show_assignments
                              ?.map((assignment) => assignment.people)
                              .filter(
                                (person) => person?.member_type === "artist"
                              )
                              .map((person) => person?.name)
                              .filter(Boolean) || [];

                          const artistNames =
                            artists.length > 0
                              ? artists.join(", ")
                              : "No Artist";

                          return (
                            <Link
                              key={show.id}
                              href={`/${orgSlug}/shows/${show.id}/day`}
                              className="block "
                              title={`${show.title} - ${artistNames} - ${show.venue?.name}`}
                            >
                              {/* Mobile-optimized view */}
                              <div className="sm:hidden text-[9px] leading-tight p-1 rounded bg-primary/10 hover:bg-primary/20 active:bg-primary/30 border border-primary/20 transition-colors cursor-pointer">
                                <MarqueeText>
                                  {`${artistNames} • ${
                                    show.venue?.city || "No city"
                                  }`}
                                </MarqueeText>
                              </div>
                              {/* Desktop view */}
                              <div
                                title={`${artistNames} - ${show.title}`}
                                className="hidden sm:block text-xs leading-tight py-1.5 px-0.5 rounded-md bg-primary/10 hover:bg-primary/20 active:bg-primary/30 border border-primary/20 transition-colors cursor-pointer"
                              >
                                <MarqueeText>
                                  {`${artistNames} • ${
                                    show.venue?.city || "No city"
                                  }`}
                                </MarqueeText>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShowsCalendar;
