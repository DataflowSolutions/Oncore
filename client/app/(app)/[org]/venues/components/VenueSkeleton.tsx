import { Skeleton } from "@/components/ui/skeleton";

export function VenueSkeleton() {
  return (
    <div className="mb-16 mt-4">
      {/* ViewHeader skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex-1">
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Grid of cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-input bg-card shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>

              {/* Right side */}
              <div className="flex flex-col items-center justify-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
