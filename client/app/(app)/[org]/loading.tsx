export default function Loading() {
  return (
    <div className="pb-24 lg:pb-0">
      {/* Main content skeleton */}
      <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="h-9 w-48 bg-muted animate-pulse rounded-md mb-2" />
          <div className="h-4 w-80 bg-muted animate-pulse rounded-md" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <div className="h-10 w-28 bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
        </div>

        {/* Content cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((card) => (
            <div
              key={card}
              className="rounded-lg border border-input bg-card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                  <div>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded-md mb-1" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded-md" />
                  </div>
                </div>
                <div className="h-6 w-6 bg-muted animate-pulse rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted animate-pulse rounded-md" />
                <div className="h-3 w-4/5 bg-muted animate-pulse rounded-md" />
                <div className="h-3 w-3/5 bg-muted animate-pulse rounded-md" />
              </div>
              <div className="flex gap-2 mt-4">
                <div className="h-6 w-16 bg-muted animate-pulse rounded-md" />
                <div className="h-6 w-20 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
