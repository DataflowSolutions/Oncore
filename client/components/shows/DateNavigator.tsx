"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
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

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    updateDate(today);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = currentDate.getTime() === today.getTime();

  const displayDateStr = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Create a Set for quick lookup of dates with events
  const eventDatesSet = new Set(datesWithEvents);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3 gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span className="font-medium">{displayDateStr}</span>
              {isToday && (
                <span className="text-xs text-emerald-400 font-medium">
                  • Today
                </span>
              )}
            </Button>
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
                  // Format date in local timezone to match datesWithEvents format
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const day = String(date.getDate()).padStart(2, "0");
                  const dateStr = `${year}-${month}-${day}`;
                  return eventDatesSet.has(dateStr);
                },
              }}
              modifiersClassNames={{
                hasEvents:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-emerald-500 after:rounded-full after:ring-1 after:ring-emerald-400/50",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center ">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousDay}
          className="h-9 w-9 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {!isToday && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="h-9 px-3 text-xs"
          >
            Today
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextDay}
          className="h-9 w-9 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
