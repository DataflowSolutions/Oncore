"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateNavigator } from "../DateNavigator";
import { PersonScheduleSelector } from "../PersonScheduleSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  //   Plane,
  //   PlaneLanding,
  //   MapPin,
  //   Music,
  Plus,
  Trash2,
} from "lucide-react";

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location?: string;
  type: "arrival" | "departure" | "show" | "venue" | "schedule";
  personId?: string;
  personName?: string;
  endTime?: string;
  notes?: string;
}

interface ScheduleTimelineProps {
  scheduleItems: ScheduleItem[];
  currentDateStr: string;
  orgSlug: string;
  showId: string;
  onItemClick: (item: ScheduleItem) => void;
  onCreateItem: (data: {
    title: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    notes: string | null;
  }) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  // Date navigation props
  currentDate?: Date;
  datesWithEvents?: string[];
  // Person selector props
  availablePeople?: Array<{
    id: string;
    name: string;
    duty: string | null;
  }>;
  selectedPeopleIds?: string[];
}

export function ScheduleTimeline({
  scheduleItems,
  currentDateStr,
  onItemClick,
  onCreateItem,
  onDeleteItem,
  currentDate,
  datesWithEvents = [],
  availablePeople = [],
  selectedPeopleIds = [],
}: ScheduleTimelineProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    date: currentDateStr,
    starts_at: "",
    ends_at: "",
    location: "",
    notes: "",
  });

  //   const getItemColor = (type: string) => {
  //     switch (type) {
  //       case "arrival":
  //         return "bg-emerald-500/30 border-emerald-500/60 text-emerald-50";
  //       case "departure":
  //         return "bg-blue-500/30 border-blue-500/60 text-blue-50";
  //       case "show":
  //         return "bg-red-500/30 border-red-500/60 text-red-50";
  //       case "venue":
  //         return "bg-purple-500/30 border-purple-500/60 text-purple-50";
  //       case "schedule":
  //         return "bg-orange-500/30 border-orange-500/60 text-orange-50";
  //       default:
  //         return "bg-neutral-500/30 border-neutral-500/60 text-neutral-50";
  //     }
  //   };

  //   const getItemIcon = (type: string) => {
  //     switch (type) {
  //       case "arrival":
  //         return <PlaneLanding className="w-3.5 h-3.5" />;
  //       case "departure":
  //         return <Plane className="w-3.5 h-3.5" />;
  //       case "venue":
  //         return <MapPin className="w-3.5 h-3.5" />;
  //       case "show":
  //         return <Music className="w-3.5 h-3.5" />;
  //       case "schedule":
  //         return <MapPin className="w-3.5 h-3.5" />;
  //       default:
  //         return null;
  //     }
  //   };

  // Parse time from ISO string to minutes since midnight
  const parseTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.getHours() * 60 + date.getMinutes();
  };

  // Show full 24 hours (0:00 to 23:00)
  const startTime = 0;
  const endTime = 1440; // 24 * 60 minutes

  // Generate hourly intervals (every 60 minutes)
  const intervals = [];
  for (let time = startTime; time < endTime; time += 60) {
    const hours = Math.floor(time / 60);
    intervals.push({
      time,
      label: `${hours.toString().padStart(2, "0")}:00`,
    });
  }

  // Compact spacing: 40px per hour = ~0.67px per minute
  // This gives us 960px total height (24h * 40px) instead of 1800px
  const pixelsPerHour = 40;
  const pixelsPerMinute = pixelsPerHour / 60;

  // Helper function to calculate snapped position from mouse event
  const calculateSnappedMinutes = (
    e: React.MouseEvent<HTMLDivElement>,
    rect: DOMRect
  ) => {
    const clickY = e.clientY - rect.top - 32;
    const minutes = Math.max(0, Math.round(clickY / pixelsPerMinute));
    return Math.round(minutes / 15) * 15;
  };

  // Function to open dialog with pre-filled time
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-event-item]") || target.closest("button")) {
      return;
    }

    // Use the current hover position if available, otherwise calculate it
    const snappedMinutes =
      hoverPosition !== null
        ? hoverPosition
        : calculateSnappedMinutes(e, e.currentTarget.getBoundingClientRect());

    const hours = Math.floor(snappedMinutes / 60);
    const mins = snappedMinutes % 60;

    const timeStr = `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;

    setFormData({
      title: "",
      date: currentDateStr,
      starts_at: timeStr,
      ends_at: "",
      location: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-event-item]") || target.closest("button")) {
      setHoverPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const snappedMinutes = calculateSnappedMinutes(e, rect);
    setHoverPosition(snappedMinutes);
  };

  const handleTimelineMouseLeave = () => {
    setHoverPosition(null);
  };

  return (
    <div className="space-y-4">
      {/* Header with Date Navigator and Person Selector - Outside card */}
      {currentDate && (
        <div className="space-y-3">
          {/* Date Navigator */}
          <DateNavigator
            currentDate={currentDate}
            datesWithEvents={datesWithEvents}
          />

          {/* Person Selector - only show if there are people */}
          {availablePeople.length > 0 && (
            <PersonScheduleSelector
              availablePeople={availablePeople}
              selectedPeopleIds={selectedPeopleIds}
            />
          )}
        </div>
      )}

      {/* Timeline Section - Inside card */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-400">
            {scheduleItems.length === 0
              ? "No events today"
              : `${scheduleItems.length} event${
                  scheduleItems.length === 1 ? "" : "s"
                } scheduled`}
          </h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Schedule Event</DialogTitle>
              </DialogHeader>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const startsAt = new Date(
                    `${formData.date}T${formData.starts_at}:00`
                  ).toISOString();
                  const endsAt = formData.ends_at
                    ? new Date(
                        `${formData.date}T${formData.ends_at}:00`
                      ).toISOString()
                    : null;

                  await onCreateItem({
                    title: formData.title,
                    starts_at: startsAt,
                    ends_at: endsAt,
                    location: formData.location || null,
                    notes: formData.notes || null,
                  });

                  setFormData({
                    title: "",
                    date: currentDateStr,
                    starts_at: "",
                    ends_at: "",
                    location: "",
                    notes: "",
                  });
                  setIsDialogOpen(false);
                }}
                className="space-y-3 mt-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">
                    Title
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="e.g., Sound Check, Load In"
                    className="h-9 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="h-9 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-400">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={formData.starts_at}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          starts_at: e.target.value,
                        }))
                      }
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-400">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={formData.ends_at}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ends_at: e.target.value,
                        }))
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">
                    Location
                  </label>
                  <Input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="e.g., Main Stage, Green Room"
                    className="h-9 text-sm"
                  />
                </div>

                <Button type="submit" size="sm" className="w-full">
                  Add Event
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Timeline View */}
        <div
          className="relative bg-neutral-950/30 rounded-lg border border-neutral-800/50 py-8 px-4 cursor-crosshair"
          onClick={handleTimelineClick}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          style={{
            minHeight: `${(endTime - startTime) * pixelsPerMinute + 32}px`,
          }}
        >
          {/* Hover placeholder */}
          {hoverPosition !== null && (
            <div
              className="absolute left-10 right-0 pointer-events-none"
              style={{
                top: `${hoverPosition * pixelsPerMinute + 32}px`,
                height: "30px",
              }}
            >
              <div className="h-full px-2.5 py-1.5 rounded border border-dashed border-neutral-600/50 bg-neutral-700/20 flex items-center">
                <div className="text-[10px] text-neutral-500 font-mono">
                  {`${Math.floor(hoverPosition / 60)
                    .toString()
                    .padStart(2, "0")}:${(hoverPosition % 60)
                    .toString()
                    .padStart(2, "0")}`}{" "}
                  • Click to add event
                </div>
              </div>
            </div>
          )}
          {/* Time intervals */}
          {intervals.map((interval, idx) => {
            const topPosition =
              (interval.time - startTime) * pixelsPerMinute + 32;
            return (
              <div
                key={idx}
                className="absolute left-0 right-0 flex items-center px-2"
                style={{ top: `${topPosition}px`, height: "1px" }}
              >
                <span className="text-[10px] text-neutral-600 w-10 flex-shrink-0 font-mono">
                  {interval.label}
                </span>
                <div className="flex-1 border-t border-neutral-800/50" />
              </div>
            );
          })}

          {/* Activity boxes */}
          {scheduleItems.map((item) => {
            const startMinutes = parseTime(item.time);
            const endMinutes = item.endTime
              ? parseTime(item.endTime)
              : startMinutes + 30;
            const duration = endMinutes - startMinutes;
            const topPosition =
              (startMinutes - startTime) * pixelsPerMinute + 32;
            const height = duration * pixelsPerMinute;

            const showFullDetails = height > 35;
            const showTimeDetails = height > 20;

            return (
              <div
                key={item.id}
                className="absolute left-10 right-0"
                style={{
                  top: `${topPosition}px`,
                  height: `${Math.max(height, 18)}px`,
                }}
              >
                <div
                  data-event-item
                  onClick={() => onItemClick(item)}
                  className="group/item relative h-full px-2.5 py-1.5 rounded border border-neutral-700/50 bg-neutral-800/40 hover:bg-neutral-800/60 hover:border-neutral-600/50 cursor-pointer transition-all flex items-center overflow-hidden"
                >
                  <div className="flex items-start gap-2 w-full min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold leading-tight truncate text-neutral-200">
                        {item.title}
                      </div>
                      {showTimeDetails && (
                        <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
                          {new Date(item.time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: false,
                          })}
                          {item.endTime && (
                            <>
                              {" - "}
                              {new Date(item.endTime).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: false,
                                }
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {showFullDetails && item.personName && (
                        <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
                          {item.personName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  {item.type === "schedule" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("Delete this schedule item?")) {
                          await onDeleteItem(item.id);
                        }
                      }}
                      className="opacity-0 group-hover/item:opacity-100 transition-opacity absolute -top-1.5 -right-1.5 h-5 w-5 p-0 bg-red-500/90 hover:bg-red-600 text-white rounded-full"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
