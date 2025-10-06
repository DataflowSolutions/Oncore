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

  // Get the first day of the month and how many days in the month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday

  // Navigation functions with transitions
  const goToPreviousMonth = () => {
    if (isTransitioning) return;
    setSlideDirection("right");
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentDate(new Date(year, month - 1, 1));
      setIsTransitioning(false);
      setSlideDirection(null);
    }, 300);
  };

  const goToNextMonth = () => {
    if (isTransitioning) return;
    setSlideDirection("left");
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentDate(new Date(year, month + 1, 1));
      setIsTransitioning(false);
      setSlideDirection(null);
    }, 300);
  };

  const goToPreviousYear = () => {
    setCurrentDate(new Date(year - 1, month, 1));
  };

  const goToNextYear = () => {
    setCurrentDate(new Date(year + 1, month, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const jumpToMonth = (monthIndex: number) => {
    setCurrentDate(new Date(year, monthIndex, 1));
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

  // Get previous and next month names
  const prevMonthName = new Date(year, month - 1, 1).toLocaleDateString(
    "en-US",
    { month: "short" }
  );
  const nextMonthName = new Date(year, month + 1, 1).toLocaleDateString(
    "en-US",
    { month: "short" }
  );

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
          <h2 className="text-xl sm:text-2xl font-bold">{monthYearString}</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={goToToday}
              className="gap-2 cursor-pointer hidden sm:flex"
            >
              <CalendarIcon className="h-4 w-4" />
              Today
            </Button>
            <Button
              variant="outline"
              onClick={goToToday}
              className="cursor-pointer sm:hidden"
              size="icon"
              title="Today"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              <Button
                variant="outline"
                className="cursor-pointer hidden lg:flex"
                size="icon"
                onClick={goToPreviousYear}
                title="Previous Year"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer"
                size="icon"
                onClick={goToPreviousMonth}
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer"
                size="icon"
                onClick={goToNextMonth}
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer hidden lg:flex"
                size="icon"
                onClick={goToNextYear}
                title="Next Year"
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
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {prevMonthName}
          </button>
          <div className="text-base font-semibold px-4">
            {currentDate.toLocaleDateString("en-US", { month: "long" })}
          </div>
          <button
            onClick={goToNextMonth}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {nextMonthName}
          </button>
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
            <SelectTrigger className="w-[130px] h-9">
              <MapPin className="h-3 w-3 mr-1" />
              <SelectValue placeholder="City" />
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
            <SelectTrigger className="w-[130px] h-9">
              <Music className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Artist" />
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
              className="h-9 gap-1"
            >
              <X className="h-3 w-3" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {(selectedCity !== "all" || selectedArtist !== "all") && (
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {selectedCity !== "all" && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {selectedCity}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setSelectedCity("all")}
                />
              </Badge>
            )}
            {selectedArtist !== "all" && (
              <Badge variant="secondary" className="gap-1">
                <Music className="h-3 w-3" />
                {selectedArtist}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setSelectedArtist("all")}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div
        {...handlers}
        className="border border-input rounded-lg overflow-hidden select-none"
      >
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-semibold border-r border-input last:border-r-0"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day[0]}</span>
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div
          className={`grid grid-cols-7 lg:auto-rows-[140px] auto-rows-[100px] sm:auto-rows-[120px] transition-all duration-300 ease-in-out ${
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

            return (
              <div
                key={day}
                className={`h-full border-r border-b border-input last:border-r-0 p-1 sm:p-2 transition-colors overflow-hidden hover:bg-accent/5 ${
                  isTodayDate
                    ? "bg-primary/10 ring-2 ring-primary/20"
                    : "bg-card "
                }`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-1 flex-shrink-0">
                    <div
                      className={`text-xs sm:text-sm font-semibold ${
                        isTodayDate
                          ? "bg-primary text-primary-foreground rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center"
                          : ""
                      }`}
                    >
                      {day}
                    </div>
                    {showCount > 0 && (
                      <Badge
                        variant={showCount > 2 ? "default" : "secondary"}
                        className="h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px]"
                      >
                        {showCount}
                      </Badge>
                    )}
                  </div>
                  <div
                    className={`overflow-y-auto space-y-1 overflow-x-hidden`}
                  >
                    {dayShows.map((show) => {
                      // Get all artists assigned to this show
                      const artists =
                        show.show_assignments
                          ?.map((assignment) => assignment.people)
                          .filter((person) => person?.member_type === "Artist")
                          .map((person) => person?.name)
                          .filter(Boolean) || [];

                      const artistNames =
                        artists.length > 0 ? artists.join(", ") : "No Artist";

                      return (
                        <Link
                          key={show.id}
                          href={`/${orgSlug}/shows/${show.id}`}
                          className="block "
                          title={`${show.title} - ${artistNames} - ${show.venue?.name}`}
                        >
                          <div className="text-[10px] sm:text-xs p-1 sm:p-1.5 rounded bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors cursor-pointer ">
                            <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-1 sm:justify-between">
                              <div className="font-semibold truncate text-foreground">
                                {artistNames}
                              </div>
                              <div className="text-muted-foreground truncate text-[9px] sm:text-xs">
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
      </div>

      {/* Shows count and stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
          <span>
            {
              filteredShows.filter((show) => {
                const showDate = new Date(show.date);
                return (
                  showDate.getMonth() === month &&
                  showDate.getFullYear() === year
                );
              }).length
            }{" "}
            show(s) in {monthYearString}
          </span>
          {(selectedCity !== "all" || selectedArtist !== "all") && (
            <span className="text-primary">
              (filtered from{" "}
              {
                shows.filter((show) => {
                  const showDate = new Date(show.date);
                  return (
                    showDate.getMonth() === month &&
                    showDate.getFullYear() === year
                  );
                }).length
              }{" "}
              total)
            </span>
          )}
        </div>
        <div className="flex gap-3 sm:gap-4">
          <span>{cities.length} cities</span>
          <span>{artists.length} artists</span>
        </div>
      </div>
    </div>
  );
};

export default ShowsCalendar;
