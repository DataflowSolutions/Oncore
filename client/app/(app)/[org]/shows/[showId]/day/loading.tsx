export default function DayScheduleLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4">
        <div className="h-9 w-32 bg-muted/80 animate-pulse rounded-md" />
        
        <div className="flex flex-col gap-2">
          <div className="h-9 w-96 max-w-full bg-muted/80 animate-pulse rounded-md" />
          <div className="flex items-center gap-4 flex-wrap">
            <div className="h-5 w-64 bg-muted/60 animate-pulse rounded-md" />
            <div className="h-5 w-48 bg-muted/60 animate-pulse rounded-md" />
            <div className="h-5 w-40 bg-muted/60 animate-pulse rounded-md" />
          </div>
        </div>
      </div>

      {/* Calendar skeleton - more visible */}
      <div className="rounded-lg border border-input bg-card p-6 shadow-sm">
        <div className="space-y-1">
          {/* Timeline hours - more realistic */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <div className="h-4 w-16 bg-muted/70 animate-pulse rounded flex-shrink-0" />
              <div className="flex-1 h-16 bg-muted/40 animate-pulse rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
