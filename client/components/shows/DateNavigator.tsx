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
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5 flex-1 justify-start hover:bg-neutral-800/50"
          >
            <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
            <span className="text-sm font-medium truncate">
              {displayDateStr}
            </span>
            {isToday && (
              <span className="text-[10px] text-emerald-400 font-medium ml-1">
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

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousDay}
          className="h-8 w-8 p-0 hover:bg-neutral-800/50"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {!isToday && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="h-8 px-2 text-[10px] hover:bg-neutral-800/50"
          >
            Today
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextDay}
          className="h-8 w-8 p-0 hover:bg-neutral-800/50"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
