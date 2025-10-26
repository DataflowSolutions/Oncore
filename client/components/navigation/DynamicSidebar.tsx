"use client";

import { usePathname } from "next/navigation";
import SidebarNavigation from "./SidebarNavigation";
import MobileSidebarToggle from "./MobileSidebarToggle";

interface DynamicSidebarProps {
  orgSlug: string;
  orgId: string;
  userRole: string;
}

export default function DynamicSidebar({
  orgSlug,
  userRole,
}: DynamicSidebarProps) {
  const pathname = usePathname();

  // Detect if we're in a show detail context (not just /shows list)
  const showMatch = pathname.match(new RegExp(`/${orgSlug}/shows/([^/]+)`));
  const isInShowContext =
    showMatch && showMatch[1] !== undefined && showMatch[1] !== "";
  const currentShowId = isInShowContext ? showMatch[1] : null;

  return (
    <MobileSidebarToggle>
      {/* Desktop Navigation */}
      <div className="hidden lg:block h-full">
        <SidebarNavigation
          orgSlug={orgSlug}
          userRole={userRole}
          currentPath={pathname}
          showId={currentShowId || undefined}
        />
      </div>

      {/* Mobile Navigation - Same as Desktop */}
      <div className="lg:hidden h-full overflow-y-auto">
        <SidebarNavigation
          orgSlug={orgSlug}
          userRole={userRole}
          currentPath={pathname}
          showId={currentShowId || undefined}
        />
      </div>
    </MobileSidebarToggle>
  );
}
