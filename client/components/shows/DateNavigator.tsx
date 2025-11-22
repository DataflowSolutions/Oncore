"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateNavigatorProps {
  currentDate: Date;
  datesWithEvents: string[]; // Array of ISO date strings that have events
}

export function DateNavigator({
  currentDate,
  datesWithEvents,
}: DateNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateDate = (newDate: Date) => {
    const params = new URLSearchParams(searchParams);
    // Format date as YYYY-MM-DD in local timezone to avoid UTC shift
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const day = String(newDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    params.set("date", dateStr);
    router.push(`${pathname}?${params.toString()}`);
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    updateDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    updateDate(newDate);
  };

  // Calculate which day this is in the schedule
  const sortedDates = [...datesWithEvents].sort();
  const currentDateStr = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
  const dayNumber = sortedDates.indexOf(currentDateStr) + 1;

  const displayDateStr = currentDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });

  // Create a Set for quick lookup of dates with events
  const eventDatesSet = new Set(datesWithEvents);

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {/* Day number - opens day selector */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-xs font-medium text-description-foreground hover:text-foreground transition-colors cursor-pointer">
                Day {dayNumber > 0 ? dayNumber : "?"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-2">
                <div className="text-xs font-medium text-description-foreground mb-2">
                  Jump to day
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {sortedDates.map((dateStr, index) => {
                    const isActive = dateStr === currentDateStr;
                    const date = new Date(dateStr + "T00:00:00");
                    const dateLabel = date.toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                    });
                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          updateDate(date);
                        }}
                        className={`px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                          isActive
                            ? "bg-foreground text-background font-medium"
                            : "bg-card-cell text-neutral-400 hover:bg-neutral-700 hover:text-foreground"
                        }`}
                      >
                        <div className="font-medium">Day {index + 1}</div>
                        <div className="text-xs opacity-70">{dateLabel}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <span className="text-neutral-600">|</span>

          {/* Date - opens calendar */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-xs font-medium text-description-foreground hover:text-foreground transition-colors cursor-pointer">
                {displayDateStr}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => {
                  if (date) {
                    updateDate(date);
                  }
                }}
                initialFocus
                modifiers={{
                  hasEvents: (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    const dateStr = `${year}-${month}-${day}`;
                    return eventDatesSet.has(dateStr);
                  },
                }}
                modifiersClassNames={{
                  hasEvents:
                    "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-emerald-500 after:rounded-full",
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousDay}
            className="h-8 w-8 p-0 hover:bg-card-cell"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextDay}
            className="h-8 w-8 p-0 hover:bg-card-cell"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
