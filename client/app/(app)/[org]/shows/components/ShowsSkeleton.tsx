import { Skeleton } from "@/components/ui/skeleton";

export function ShowsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search bar and action buttons */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-10 w-full lg:w-96" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>

      {/* Shows table and calendar layout */}
      <div className="flex gap-10">
        {/* Shows table skeleton */}
        <div className="flex flex-col gap-8 flex-1">
          {/* Month groups */}
          {[1, 2, 3].map((month) => (
            <div key={month}>
              <div className="flex gap-2 mb-2">
                <Skeleton className="h-7 w-32" />
              </div>

              <div className="flex flex-col gap-2.5">
                {[1, 2].map((show) => (
                  <div
                    key={show}
                    className="rounded-[20px] border border-input bg-card shadow-sm p-3 w-[500px]"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      {/* Left side */}
                      <div className="flex flex-col gap-1 flex-1">
                        <Skeleton className="h-4 w-40" />
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar skeleton - hidden on mobile */}
        <div className="flex-1 hidden md:block">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
