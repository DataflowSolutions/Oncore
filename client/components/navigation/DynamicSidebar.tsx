"use client";

import { usePathname } from "next/navigation";
import SidebarNavigation from "./SidebarNavigation";
import ShowSidebarNavigation from "./ShowSidebarNavigation";
import MobileSidebarToggle from "./MobileSidebarToggle";
import MobileQuickAccess from "./MobileQuickAccess";
import MobileShowNavigation from "./MobileShowNavigation";

interface DynamicSidebarProps {
  orgSlug: string;
  orgId: string;
  userRole: string;
}

export default function DynamicSidebar({ orgSlug, orgId, userRole }: DynamicSidebarProps) {
  const pathname = usePathname();
  
  // Detect if we're in a show context
  const showMatch = pathname.match(new RegExp(`/${orgSlug}/shows/([^/]+)`));
  const isInShowContext = showMatch && showMatch[1] !== undefined;
  const currentShowId = isInShowContext ? showMatch[1] : null;

  return (
    <MobileSidebarToggle>
      {/* Desktop Navigation */}
      <div className="hidden lg:block">
        {isInShowContext && currentShowId ? (
          <ShowSidebarNavigation
            orgSlug={orgSlug}
            showId={currentShowId}
            orgId={orgId}
            currentPath={pathname}
          />
        ) : (
          <SidebarNavigation
            orgSlug={orgSlug}
            userRole={userRole}
            currentPath={pathname}
          />
        )}
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden h-full overflow-y-auto">
        {isInShowContext && currentShowId ? (
          <MobileShowNavigation
            orgSlug={orgSlug}
            showId={currentShowId}
            orgId={orgId}
          />
        ) : (
          <MobileQuickAccess orgSlug={orgSlug} />
        )}
      </div>
    </MobileSidebarToggle>
  );
}