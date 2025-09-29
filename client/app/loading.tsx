export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 bg-muted animate-pulse rounded-md" />
              <div className="h-6 w-24 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="container mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-8">
          <div className="h-10 w-64 bg-muted animate-pulse rounded-md mb-2" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded-md" />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="rounded-lg border border-input bg-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded-md mb-1" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded-md" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted animate-pulse rounded-md" />
                <div className="h-3 w-3/4 bg-muted animate-pulse rounded-md" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Table/List skeleton */}
        <div className="rounded-lg border border-input bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="h-6 w-32 bg-muted animate-pulse rounded-md" />
          </div>
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                  <div>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded-md mb-1" />
                    <div className="h-3 w-24 bg-muted animate-pulse rounded-md" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 bg-muted animate-pulse rounded-md" />
                  <div className="h-6 w-6 bg-muted animate-pulse rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
