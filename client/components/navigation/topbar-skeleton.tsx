import { Skeleton } from "@/components/ui/skeleton";

export function TopBarSkeleton() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background max-w-[1440px] mx-auto">
      <div className="flex h-16 items-center">
        {/* Left spacing for mobile hamburger menu */}
        <div className="w-10 lg:w-0 shrink-0" />

        {/* Import Data button */}
        <Skeleton className="h-9 w-28 rounded-full" />

        {/* Center search area */}
        <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
          <div className="w-full max-w-md lg:max-w-lg">
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Artist Filter Dropdown */}
          <Skeleton className="h-9 w-9 rounded-full" />
          {/* User Dropdown Menu */}
          <Skeleton className="h-9 w-9 rounded-full" />
          {/* Settings button */}
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </header>
  );
}
