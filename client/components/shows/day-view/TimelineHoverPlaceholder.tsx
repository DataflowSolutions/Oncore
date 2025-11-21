interface TimelineHoverPlaceholderProps {
  hoverPosition: number;
  pixelsPerMinute: number;
}

export function TimelineHoverPlaceholder({
  hoverPosition,
  pixelsPerMinute,
}: TimelineHoverPlaceholderProps) {
  return (
    <div
      className="absolute left-10 right-0 pointer-events-none"
      style={{
        top: `${hoverPosition * pixelsPerMinute + 32}px`,
        height: "30px",
      }}
    >
      <div className="h-full px-2.5 py-1.5 rounded  bg-schedule-event-bg/90 flex items-center">
        <div className="text-[10px] text-schedule-event-foreground">
          {`${Math.floor(hoverPosition / 60)
            .toString()
            .padStart(2, "0")}:${(hoverPosition % 60)
            .toString()
            .padStart(2, "0")}`}{" "}
          • Click to add event
        </div>
      </div>
    </div>
  );
}
