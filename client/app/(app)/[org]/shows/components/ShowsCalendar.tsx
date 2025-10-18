"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useSwipeable } from "react-swipeable";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  MapPin,
  Music,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
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

interface ShowsCalendarProps {
  shows: ShowWithVenue[];
  orgSlug: string;
}

const ShowsCalendar = ({ shows, orgSlug }: ShowsCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedArtist, setSelectedArtist] = useState<string>("all");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
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

  // Week view calculations
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  // Navigation functions with transitions
  const goToPreviousMonth = () => {
    if (isTransitioning) return;
    setSlideDirection("right");
    setIsTransitioning(true);
    setTimeout(() => {
      if (viewMode === "week") {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        setCurrentDate(newDate);
      } else {
        setCurrentDate(new Date(year, month - 1, 1));
      }
      closeDayView();
      setIsTransitioning(false);
      setSlideDirection(null);
    }, 300);
  };

  const goToNextMonth = () => {
    if (isTransitioning) return;
    setSlideDirection("left");
    setIsTransitioning(true);
    setTimeout(() => {
      if (viewMode === "week") {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        setCurrentDate(newDate);
      } else {
        setCurrentDate(new Date(year, month + 1, 1));
      }
      closeDayView();
      setIsTransitioning(false);
      setSlideDirection(null);
    }, 300);
  };

  const goToPreviousYear = () => {
    setCurrentDate(new Date(year - 1, month, 1));
    closeDayView();
  };

  const goToNextYear = () => {
    setCurrentDate(new Date(year + 1, month, 1));
    closeDayView();
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    closeDayView();
  };

  const jumpToMonth = (monthIndex: number) => {
    setCurrentDate(new Date(year, monthIndex, 1));
    closeDayView();
  };

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
          assignment.people?.member_type === "Artist" &&
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
            .filter((p) => p?.member_type === "Artist")
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
  const calendarDays = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add the days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get shows for a specific day
  const getShowsForDay = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
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

  const monthYearString = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const weekRangeString =
    viewMode === "week"
      ? `${weekDates[0].toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${weekDates[6].toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`
      : monthYearString;

  const headerTitle = dayViewDate
    ? dayViewDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : viewMode === "week"
    ? weekRangeString
    : monthYearString;

  // Get previous and next month names
  const prevMonthName = new Date(year, month - 1, 1).toLocaleDateString(
    "en-US",
    { month: "short" }
  );
  const nextMonthName = new Date(year, month + 1, 1).toLocaleDateString(
    "en-US",
    { month: "short" }
  );

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Swipe handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => goToNextMonth(),
    onSwipedRight: () => goToPreviousMonth(),
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 50,
  });

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col gap-4">
        {/* Title and Main Navigation */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
            {headerTitle}
          </h2>
          <div className="flex gap-2 flex-shrink-0">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  closeDayView();
                  setViewMode("month");
                }}
                className="h-8 px-3 cursor-pointer"
              >
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  closeDayView();
                  setViewMode("week");
                }}
                className="h-8 px-3 cursor-pointer"
              >
                Week
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={goToToday}
              className="gap-2 cursor-pointer hidden sm:flex h-8"
              size="sm"
            >
              <CalendarIcon className="h-4 w-4" />
              Today
            </Button>
            <Button
              variant="outline"
              onClick={goToToday}
              className="cursor-pointer sm:hidden h-9 w-9"
              size="icon"
              title="Today"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              <Button
                variant="outline"
                className="cursor-pointer hidden lg:flex h-8"
                size="icon"
                onClick={goToPreviousYear}
                title={viewMode === "week" ? "Previous Month" : "Previous Year"}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer h-9 w-9 sm:h-8 sm:w-8"
                size="icon"
                onClick={goToPreviousMonth}
                title={viewMode === "week" ? "Previous Week" : "Previous Month"}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer h-9 w-9 sm:h-8 sm:w-8"
                size="icon"
                onClick={goToNextMonth}
                title={viewMode === "week" ? "Next Week" : "Next Month"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer hidden lg:flex h-8"
                size="icon"
                onClick={goToNextYear}
                title={viewMode === "week" ? "Next Month" : "Next Year"}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Month Navigation - Only on mobile (lg and under) */}
        <div className="flex lg:hidden items-center justify-center gap-4 py-2">
          <button
            onClick={goToPreviousMonth}
            className="text-base sm:text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium px-3 py-1.5 rounded-md hover:bg-accent active:bg-accent/80"
          >
            {viewMode === "week" ? "← Prev" : prevMonthName}
          </button>
          <div className="text-base sm:text-lg font-bold px-4">
            {viewMode === "week"
              ? weekRangeString.split(" - ")[0]
              : currentDate.toLocaleDateString("en-US", { month: "long" })}
          </div>
          <button
            onClick={goToNextMonth}
            className="text-base sm:text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium px-3 py-1.5 rounded-md hover:bg-accent active:bg-accent/80"
          >
            {viewMode === "week" ? "Next →" : nextMonthName}
          </button>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex sm:hidden justify-center">
          <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                closeDayView();
                setViewMode("month");
              }}
              className="h-10 px-6 cursor-pointer font-semibold"
            >
              Month
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                closeDayView();
                setViewMode("week");
              }}
              className="h-10 px-6 cursor-pointer font-semibold"
            >
              Week
            </Button>
          </div>
        </div>

        {/* Desktop Month Selector - Hidden on mobile */}
        <div className="hidden lg:flex flex-wrap gap-3 items-center">
          {/* Month Quick Selector */}
          <div className="flex gap-1 flex-wrap">
            {[
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ].map((monthName, idx) => (
              <Button
                key={monthName}
                variant={month === idx ? "default" : "outline"}
                size="sm"
                onClick={() => jumpToMonth(idx)}
                className="h-8 px-2 cursor-pointer"
              >
                {monthName}
              </Button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Filters - Desktop */}
          <div className="flex gap-2 items-center flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />

            {/* City Filter */}
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-[140px] h-8">
                <MapPin className="h-3 w-3 mr-1" />
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Artist Filter */}
            <Select value={selectedArtist} onValueChange={setSelectedArtist}>
              <SelectTrigger className="w-[140px] h-8">
                <Music className="h-3 w-3 mr-1" />
                <SelectValue placeholder="All Artists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Artists</SelectItem>
                {artists.map((artist) => (
                  <SelectItem key={artist} value={artist}>
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
                className="h-8 gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
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

        {/* Active Filters Display */}
        {(selectedCity !== "all" || selectedArtist !== "all") && (
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm sm:text-base text-muted-foreground font-medium">
              Active filters:
            </span>
            {selectedCity !== "all" && (
              <Badge variant="secondary" className="gap-1.5 h-7 px-2.5 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                {selectedCity}
                <X
                  className="h-3.5 w-3.5 cursor-pointer hover:text-destructive"
                  onClick={() => setSelectedCity("all")}
                />
              </Badge>
            )}
            {selectedArtist !== "all" && (
              <Badge variant="secondary" className="gap-1.5 h-7 px-2.5 text-sm">
                <Music className="h-3.5 w-3.5" />
                {selectedArtist}
                <X
                  className="h-3.5 w-3.5 cursor-pointer hover:text-destructive"
                  onClick={() => setSelectedArtist("all")}
                />
              </Badge>
            )}
          </div>
        )}
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
                Back to {viewMode === "week" ? "week" : "month"} view
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
                        href={`/${orgSlug}/shows/${show.id}`}
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
          <div
            {...handlers}
            className="border border-input rounded-lg overflow-hidden select-none sm:border lg:border"
          >
            {/* Week day headers */}
            <div className="grid grid-cols-7 bg-muted">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="p-1.5 sm:p-3 text-center text-[11px] sm:text-base font-bold border-r border-input last:border-r-0"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.substring(0, 2)}</span>
                </div>
              ))}
            </div>

            {/* Calendar days - Month View */}
            {viewMode === "month" && (
              <div
                className={`grid grid-cols-7 auto-rows-[120px] sm:auto-rows-[140px] lg:auto-rows-[160px] transition-all duration-300 ease-in-out ${
                  isTransitioning
                    ? slideDirection === "left"
                      ? "-translate-x-4 opacity-80"
                      : "translate-x-4 opacity-80"
                    : "translate-x-0 opacity-100"
                }`}
              >
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="h-full border-r border-b border-input bg-muted/30"
                      />
                    );
                  }

                  const dayShows = getShowsForDay(day);
                  const isTodayDate = isToday(day);
                  const showCount = dayShows.length;
                  const cellDate = new Date(year, month, day);
                  const isSelectedDayInMonth = dayViewDate
                    ? isSameDay(cellDate, dayViewDate)
                    : false;

                  return (
                    <div
                      key={day}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelectedDayInMonth}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("a")) return;
                        openDayView(cellDate);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDayView(cellDate);
                        }
                      }}
                      className={`h-full border-r border-b border-input last:border-r-0 p-0.5 sm:p-2 transition-colors overflow-hidden cursor-pointer outline-none hover:bg-accent/5 active:bg-accent/10 focus-visible:ring-2 focus-visible:ring-primary/60 ${
                        isSelectedDayInMonth
                          ? "bg-primary/10 ring-2 ring-primary/40"
                          : isTodayDate
                          ? "bg-primary/10 ring-2 ring-primary/20"
                          : "bg-card"
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-0.5 sm:mb-2 flex-shrink-0 px-0.5 sm:px-0">
                          <div
                            className={`text-xs sm:text-base font-bold ${
                              isTodayDate
                                ? "bg-primary text-primary-foreground rounded-full w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] sm:text-base"
                                : ""
                            }`}
                          >
                            {day}
                          </div>
                          {showCount > 0 && (
                            <Badge
                              variant={showCount > 2 ? "default" : "secondary"}
                              className="h-4 sm:h-5 px-1 sm:px-2 text-[9px] sm:text-xs font-medium"
                            >
                              {showCount}
                            </Badge>
                          )}
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
                                  (person) => person?.member_type === "Artist"
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
                                href={`/${orgSlug}/shows/${show.id}`}
                                className="block "
                                title={`${show.title} - ${artistNames} - ${show.venue?.name}`}
                              >
                                {/* Mobile-optimized view */}
                                <div className="sm:hidden text-[9px] leading-tight p-0.5 rounded bg-primary/10 hover:bg-primary/20 active:bg-primary/30 border border-primary/20 transition-colors cursor-pointer">
                                  <div className="font-bold text-foreground line-clamp-2 break-words">
                                    {artistNames}
                                  </div>
                                  <div className="text-muted-foreground text-[8px] line-clamp-1 break-words">
                                    {show.venue?.city || "No city"}
                                  </div>
                                </div>
                                {/* Desktop view */}
                                <div className="hidden sm:block text-[10px] leading-tight p-0.5 rounded bg-primary/10 hover:bg-primary/20 active:bg-primary/30 border border-primary/20 transition-colors cursor-pointer">
                                  <div className="flex flex-col">
                                    <div className="font-bold text-foreground line-clamp-1 break-words">
                                      {artistNames}
                                    </div>
                                    <div className="text-muted-foreground text-[9px] line-clamp-1 break-words">
                                      {show.venue?.city || "No city"}
                                    </div>
                                  </div>
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
            )}

            {/* Calendar days - Week View */}
            {viewMode === "week" && (
              <div
                className={`grid grid-cols-7 auto-rows-[280px] sm:auto-rows-[320px] lg:auto-rows-[340px] transition-all duration-300 ease-in-out ${
                  isTransitioning
                    ? slideDirection === "left"
                      ? "-translate-x-4 opacity-80"
                      : "translate-x-4 opacity-80"
                    : "translate-x-0 opacity-100"
                }`}
              >
                {weekDates.map((date, index) => {
                  const day = date.getDate();
                  const dayShows = filteredShows.filter((show) => {
                    const showDate = new Date(show.date);
                    return (
                      showDate.getDate() === date.getDate() &&
                      showDate.getMonth() === date.getMonth() &&
                      showDate.getFullYear() === date.getFullYear()
                    );
                  });

                  const today = new Date();
                  const isTodayDate =
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

                  const showCount = dayShows.length;
                  const isSelectedDayInWeek = dayViewDate
                    ? isSameDay(date, dayViewDate)
                    : false;

                  return (
                    <div
                      key={index}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelectedDayInWeek}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("a")) return;
                        openDayView(new Date(date));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDayView(new Date(date));
                        }
                      }}
                      className={`h-full border-r border-b border-input last:border-r-0 p-1 transition-colors overflow-hidden cursor-pointer outline-none hover:bg-accent/5 active:bg-accent/10 focus-visible:ring-2 focus-visible:ring-primary/60 ${
                        isSelectedDayInWeek
                          ? "bg-primary/10 ring-2 ring-primary/40"
                          : isTodayDate
                          ? "bg-primary/10 ring-2 ring-primary/20"
                          : "bg-card"
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-1 sm:mb-3 flex-shrink-0">
                          <div className="flex flex-col items-center sm:items-start">
                            <div
                              className={`text-base sm:text-xl font-bold ${
                                isTodayDate
                                  ? "bg-primary text-primary-foreground rounded-full w-7 h-7 sm:w-11 sm:h-11 flex items-center justify-center text-sm sm:text-xl"
                                  : ""
                              }`}
                            >
                              {day}
                            </div>
                            <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-medium">
                              {date.toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </div>
                          </div>
                          {showCount > 0 && (
                            <Badge
                              variant={showCount > 2 ? "default" : "secondary"}
                              className="h-5 sm:h-7 px-1.5 sm:px-2.5 text-[10px] sm:text-sm font-semibold"
                            >
                              {showCount}
                            </Badge>
                          )}
                        </div>
                        <div className="overflow-y-auto space-y-2 overflow-x-hidden">
                          {dayShows.map((show) => {
                            // Get all artists assigned to this show
                            const artists =
                              show.show_assignments
                                ?.map((assignment) => assignment.people)
                                .filter(
                                  (person) => person?.member_type === "Artist"
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
                                href={`/${orgSlug}/shows/${show.id}`}
                                className="block"
                                title={`${show.title} - ${artistNames} - ${show.venue?.name}`}
                              >
                                {/* Mobile-optimized week view */}
                                <div className="sm:hidden text-[9px] leading-tight p-0.5 rounded-sm bg-primary/10 hover:bg-primary/20 active:bg-primary/30 border border-primary/20 transition-colors cursor-pointer">
                                  <div className="font-bold text-foreground line-clamp-2 break-words">
                                    {artistNames}
                                  </div>
                                  <div className="text-muted-foreground text-[8px] line-clamp-1 break-words">
                                    {show.venue?.name || "No venue"}
                                  </div>
                                  <div className="text-muted-foreground text-[8px] line-clamp-1 break-words">
                                    {show.venue?.city || "No city"}
                                  </div>
                                </div>
                                {/* Desktop week view */}
                                <div className="hidden sm:block text-[10px] leading-tight p-1 rounded bg-primary/10 hover:bg-primary/20 active:bg-primary/30 border border-primary/20 transition-colors cursor-pointer">
                                  <div className="font-bold text-foreground mb-0.5 line-clamp-2 break-words">
                                    {artistNames}
                                  </div>
                                  <div className="text-muted-foreground text-[9px] flex items-start gap-1 line-clamp-1 break-words">
                                    <MapPin className="h-2.5 w-2.5 flex-shrink-0 mt-0.5" />
                                    <span className="line-clamp-1">
                                      {show.venue?.name || "No venue"}
                                    </span>
                                  </div>
                                  <div className="text-muted-foreground text-[9px] ml-3.5 line-clamp-1 break-words">
                                    {show.venue?.city || "No city"}
                                  </div>
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
            )}
          </div>

          {/* Shows count and stats */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm sm:text-base text-muted-foreground px-1">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <span className="font-medium">
                {viewMode === "week"
                  ? filteredShows.filter((show) => {
                      const showDate = new Date(show.date);
                      return weekDates.some(
                        (date) =>
                          showDate.getDate() === date.getDate() &&
                          showDate.getMonth() === date.getMonth() &&
                          showDate.getFullYear() === date.getFullYear()
                      );
                    }).length
                  : filteredShows.filter((show) => {
                      const showDate = new Date(show.date);
                      return (
                        showDate.getMonth() === month &&
                        showDate.getFullYear() === year
                      );
                    }).length}{" "}
                show(s) in {viewMode === "week" ? "this week" : monthYearString}
              </span>
              {hasActiveFilters && (
                <span className="text-primary font-medium">
                  (filtered from{" "}
                  {viewMode === "week"
                    ? shows.filter((show) => {
                        const showDate = new Date(show.date);
                        return weekDates.some(
                          (date) =>
                            showDate.getDate() === date.getDate() &&
                            showDate.getMonth() === date.getMonth() &&
                            showDate.getFullYear() === date.getFullYear()
                        );
                      }).length
                    : shows.filter((show) => {
                        const showDate = new Date(show.date);
                        return (
                          showDate.getMonth() === month &&
                          showDate.getFullYear() === year
                        );
                      }).length}{" "}
                  total)
                </span>
              )}
            </div>
            <div className="flex gap-4 sm:gap-5">
              <span className="font-medium">{cities.length} cities</span>
              <span className="font-medium">{artists.length} artists</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShowsCalendar;
