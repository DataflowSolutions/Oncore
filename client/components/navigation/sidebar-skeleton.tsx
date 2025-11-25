import { Skeleton } from "@/components/ui/skeleton";

export function SidebarSkeleton() {
  return (
    <aside className="fixed top-0 left-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar-bg translate-x-0">
      <div className="flex h-full flex-col">
        {/* Logo/Header */}
        <div className="flex h-16 items-center px-6">
          <Skeleton className="h-6 w-20" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {/* Day View navigation - conditional */}
          <div className="mb-2">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex flex-col gap-1 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </div>

          {/* Main Navigation Items */}
          {[1, 2].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-lg px-3 py-2"
            >
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
