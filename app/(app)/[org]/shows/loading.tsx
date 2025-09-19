import React from 'react'

export default function ShowsLoading() {
  return (
    <div className="mb-16 mt-4">
      <div className="flex justify-end gap-4 mb-4">
        <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
        <div className="h-10 w-28 bg-muted animate-pulse rounded-md" />
      </div>
      
      <div className="h-12 bg-muted animate-pulse rounded-md mb-6" />
      
      <div className="flex flex-col gap-8">
        {[1, 2, 3].map((month) => (
          <div key={month}>
            <div className="flex gap-2 mb-2">
              <div className="h-7 w-32 bg-muted animate-pulse rounded-md" />
              <div className="h-7 w-16 bg-muted animate-pulse rounded-full" />
            </div>
            
            <div className="flex flex-col gap-2.5">
              {[1, 2].map((show) => (
                <div
                  key={show}
                  className="rounded-lg border border-input bg-card p-3 animate-pulse"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-40 bg-muted rounded" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}