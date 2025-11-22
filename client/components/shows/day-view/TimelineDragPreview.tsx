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

interface TimelineDragPreviewProps {
  draggingItem: ScheduleItem;
  hoverPosition: number;
  pixelsPerMinute: number;
  parseTime: (timeStr: string) => number;
}

export function TimelineDragPreview({
  draggingItem,
  hoverPosition,
  pixelsPerMinute,
  parseTime,
}: TimelineDragPreviewProps) {
  const duration = draggingItem.endTime
    ? parseTime(draggingItem.endTime) - parseTime(draggingItem.time)
    : 60;
  const endMinutes = hoverPosition + duration;

  return (
    <div
      className="absolute left-10 right-0 pointer-events-none"
      style={{
        top: `${hoverPosition * pixelsPerMinute + 32}px`,
        height: `${Math.max(duration * pixelsPerMinute, 18)}px`,
      }}
    >
      <div className="h-full px-2.5 py-1.5 rounded border border-green-500/60 bg-green-500/20 flex flex-col justify-center">
        <div className="text-[11px] font-semibold text-green-200 truncate">
          {draggingItem.title}
        </div>
        <div className="text-[10px] text-green-300/80 mt-0.5 truncate">
          {`${Math.floor(hoverPosition / 60)
            .toString()
            .padStart(2, "0")}:${(hoverPosition % 60)
            .toString()
            .padStart(2, "0")}`}
          {" - "}
          {`${Math.floor(endMinutes / 60)
            .toString()
            .padStart(2, "0")}:${(endMinutes % 60)
            .toString()
            .padStart(2, "0")}`}
        </div>
      </div>
    </div>
  );
}
