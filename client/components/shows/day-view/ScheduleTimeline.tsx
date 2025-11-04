"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

export function ScheduleTimeline({
  scheduleItems,
  currentDateStr,
  onItemClick,
  onCreateItem,
  onDeleteItem,
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

  // Calculate timeline bounds based on schedule items
  const times = scheduleItems.flatMap((item) => {
    const start = parseTime(item.time);
    const end = item.endTime ? parseTime(item.endTime) : start + 30;
    return [start, end];
  });
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 1440;

  // Round to nearest 30 min intervals
  const startTime = Math.floor(minTime / 30) * 30;
  const endTime = Math.ceil(maxTime / 30) * 30;

  // Generate 30-min intervals
  const intervals = [];
  for (let time = startTime; time <= endTime; time += 30) {
    const hours = Math.floor(time / 60);
    const mins = time % 60;
    intervals.push({
      time,
      label: `${hours.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}`,
    });
  }

  const pixelsPerMinute = 1.25; // Smaller gap between intervals

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
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

            return (
              <div
                key={item.id}
                className="absolute left-12 right-0"
                style={{
                  top: `${topPosition}px`,
                  height: `${height}px`,
                }}
              >
                <div
                  onClick={() => onItemClick(item)}
                  className={`group/item relative h-full px-3 py-2 rounded-md border bg-accent hover:bg-card cursor-pointer hover:shadow-md transition-all flex items-center`}
                >
                  {/* <div
                onClick={() => onItemClick(item)}
                className={`group/item relative h-full px-3 py-2 rounded-md border ${getItemColor(
                  item.type
                )} cursor-pointer hover:shadow-md transition-all`}
              > */}
                  <div className="flex items-start gap-2 w-full">
                    {/* <div className="flex-shrink-0 mt-0.5">
                    {getItemIcon(item.type)}
                  </div> */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-tight">
                        {item.title}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
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
                      {/* {item.location && (
                      <div className="text-xs text-neutral-400 mt-0.5 truncate">
                        {item.location}
                      </div>
                    )} */}
                      {item.personName && (
                        <div className="text-xs text-neutral-400 mt-0.5">
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
