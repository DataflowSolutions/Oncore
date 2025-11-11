"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateNavigator } from "../DateNavigator";
import { PersonScheduleSelector } from "../PersonScheduleSelector";
import {
  //   Plane,
  //   PlaneLanding,
  //   MapPin,
  //   Music,
  Plus,
  X,
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
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
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

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
      {/* Header with Date Navigator and Person Selector */}
      {currentDate && (
        <div className="mb-6 pb-6 border-b border-neutral-800">
          <div className="flex flex-col gap-4">
            {/* Date Navigator */}
            <div className="flex-shrink-0">
              <DateNavigator
                currentDate={currentDate}
                datesWithEvents={datesWithEvents}
              />
            </div>

            {/* Person Selector - only show if there are people */}
            {availablePeople.length > 0 && (
              <div className="flex-1 min-w-0">
                <PersonScheduleSelector
                  availablePeople={availablePeople}
                  selectedPeopleIds={selectedPeopleIds}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold ">Show Schedule</h2>
      <p className="text-neutral-400 text-sm">Event timeline for the day</p>

      <div className="flex items-center justify-between mb-8 mt-4">
        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2"
          variant={isAdding ? "outline" : "default"}
        >
          {isAdding ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Item
            </>
          )}
        </Button>
      </div>

      {/* Add Item Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-neutral-800/50 rounded-lg border border-dashed border-neutral-700">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const startsAt = new Date(
                `${currentDateStr}T${formData.starts_at}:00`
              ).toISOString();
              const endsAt = formData.ends_at
                ? new Date(
                    `${currentDateStr}T${formData.ends_at}:00`
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
                starts_at: "",
                ends_at: "",
                location: "",
                notes: "",
              });
              setIsAdding(false);
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Load In, Sound Check"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Start Time *
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
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
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
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="e.g., Main Stage"
              />
            </div>

            <Button type="submit" size="sm" className="w-full">
              Add to Schedule
            </Button>
          </form>
        </div>
      )}

      {/* Empty State */}
      {scheduleItems.length === 0 && !isAdding && (
        <div className="flex items-center justify-center py-12 text-neutral-500">
          <p className="text-sm">Nothing scheduled today</p>
        </div>
      )}

      {/* Timeline View */}
      {scheduleItems.length > 0 && (
        <div
          className="relative"
          style={{ minHeight: `${(endTime - startTime) * pixelsPerMinute}px` }}
        >
          {/* Time intervals */}
          {intervals.map((interval, idx) => {
            const topPosition = (interval.time - startTime) * pixelsPerMinute;
            return (
              <div
                key={idx}
                className="absolute left-0 right-0 flex items-center"
                style={{ top: `${topPosition}px`, height: "1px" }}
              >
                <span className="text-xs text-neutral-500 w-12 flex-shrink-0 font-mono -translate-y-2">
                  {interval.label}
                </span>
                <div className="flex-1 border-t border-neutral-800" />
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
            const topPosition = (startMinutes - startTime) * pixelsPerMinute;
            const height = duration * pixelsPerMinute;

            // Determine content to show based on available height
            // showFullDetails: enough space for title + time + person (3 rows)
            // showTimeDetails: enough space for title + time (2 rows)
            // showMinimal: only title
            const showFullDetails = height > 35;
            const showTimeDetails = height > 20;

            return (
              <div
                key={item.id}
                className="absolute left-12 right-0"
                style={{
                  top: `${topPosition}px`,
                  height: `${Math.max(height, 20)}px`, // Minimum height for readability
                }}
              >
                <div
                  onClick={() => onItemClick(item)}
                  className={`group/item relative h-full px-3 py-1 rounded-md border bg-accent hover:bg-card cursor-pointer hover:shadow-md transition-all flex items-center overflow-hidden`}
                >
                  <div className="flex items-start gap-2 w-full min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold leading-tight truncate">
                        {item.title}
                      </div>
                      {showTimeDetails && (
                        <div className="text-xs text-neutral-400 mt-0.5 truncate">
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
                              {" • "}
                              {Math.round(duration)} min
                            </>
                          )}
                        </div>
                      )}
                      {showFullDetails && item.personName && (
                        <div className="text-xs text-neutral-400 mt-0.5 truncate">
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
                      className="opacity-0 group-hover/item:opacity-100 transition-opacity absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500/90 hover:bg-red-600 text-white rounded-full"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
