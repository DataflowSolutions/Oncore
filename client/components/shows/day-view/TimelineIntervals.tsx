interface TimelineInterval {
  time: number;
  label: string;
}

interface TimelineIntervalsProps {
  intervals: TimelineInterval[];
  startTime: number;
  pixelsPerMinute: number;
}

export function TimelineIntervals({
  intervals,
  startTime,
  pixelsPerMinute,
}: TimelineIntervalsProps) {
  return (
    <>
      {intervals.map((interval, idx) => {
        const topPosition = (interval.time - startTime) * pixelsPerMinute + 32;
        return (
          <div
            key={idx}
            className="absolute left-0 right-0 flex items-center px-2 gap-1"
            style={{ top: `${topPosition}px`, height: "1px" }}
          >
            <span className="text-xs text-timestamp w-10 flex-shrink-0 font-mono">
              {interval.label}
            </span>
            <div className="flex-1 border-t border-divider" />
          </div>
        );
      })}
    </>
  );
}
