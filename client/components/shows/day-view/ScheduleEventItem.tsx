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

interface ScheduleEventItemProps {
  item: ScheduleItem;
  topPosition: number;
  height: number;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent, item: ScheduleItem) => void;
  onClick: (item: ScheduleItem) => void;
  onDelete: (itemId: string) => Promise<void>;
}

export function ScheduleEventItem({
  item,
  topPosition,
  height,
  isDragging,
  onMouseDown,
  onClick,
}: ScheduleEventItemProps) {
  const showFullDetails = height > 35;
  const showTimeDetails = height > 20;

  // Calculate duration in minutes if endTime exists
  const durationMinutes = item.endTime
    ? (new Date(item.endTime).getTime() - new Date(item.time).getTime()) /
      (1000 * 60)
    : 0;

  // Show horizontal layout for events 30 min or less (or if no endTime and height is small)
  const isShortEvent =
    (durationMinutes > 0 && durationMinutes <= 30) ||
    (!item.endTime && height <= 35);

  return (
    <div
      className="absolute left-12 right-2"
      style={{
        top: `${topPosition}px`,
        height: `${Math.max(height, 18)}px`,
      }}
    >
      <div
        data-event-item
        onClick={() => onClick(item)}
        onMouseDown={(e) => onMouseDown(e, item)}
        className="group/item relative h-full px-2.5 py-1.5 rounded border border-schedule-event-border bg-schedule-event-bg hover:bg-schedule-event-bg-hover hover:border-schedule-event-border cursor-move transition-all flex items-center overflow-hidden hover:scale-102"
        style={{
          opacity: isDragging ? 0.3 : 1,
        }}
      >
        {isShortEvent ? (
          // Horizontal layout for short events (30 min or less)
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            <div className="text-[11px] font-semibold leading-none text-schedule-event-foreground flex-1 min-w-0 truncate">
              {item.title}
            </div>
            <div className="text-[10px] text-schedule-event-foreground/80 whitespace-nowrap flex-shrink-0">
              {new Date(item.time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: false,
              })}
              {item.endTime && (
                <>
                  {" - "}
                  {new Date(item.endTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </>
              )}
            </div>
          </div>
        ) : (
          // Vertical layout for longer events (stacked)
          <div className="flex items-start gap-2 w-full min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold leading-tight truncate text-schedule-event-foreground">
                {item.title}
              </div>
              {showTimeDetails && (
                <div className="text-[10px] text-schedule-event-foreground mt-0.5 truncate">
                  {new Date(item.time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: false,
                  })}
                  {item.endTime && (
                    <>
                      {" - "}
                      {new Date(item.endTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: false,
                      })}
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
        )}
      </div>
    </div>
  );
}
