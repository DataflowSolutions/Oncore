"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SidebarNavigation from "./SidebarNavigation";
import ShowSidebar from "./ShowSidebar";
import MobileSidebarToggle from "./MobileSidebarToggle";

interface DynamicSidebarProps {
  orgSlug: string;
  orgId: string;
  userRole: string;
}

export default function DynamicSidebar({ orgSlug, userRole }: DynamicSidebarProps) {
  const pathname = usePathname();
  const [showTitle, setShowTitle] = useState<string>("");
  
  // Detect if we're in a show detail context (not just /shows list)
  const showMatch = pathname.match(new RegExp(`/${orgSlug}/shows/([^/]+)`));
  const isInShowContext = showMatch && showMatch[1] !== undefined && showMatch[1] !== '';
  const currentShowId = isInShowContext ? showMatch[1] : null;

  // Fetch show title when in show context
  useEffect(() => {
    if (currentShowId) {
      fetch(`/api/shows/${currentShowId}/title`)
        .then(res => res.json())
        .then(data => setShowTitle(data.title || 'Show'))
        .catch(() => setShowTitle('Show'));
    }
  }, [currentShowId]);

  return (
    <MobileSidebarToggle>
      {/* Desktop Navigation */}
      <div className="hidden lg:block h-full">
        {isInShowContext && currentShowId ? (
          <ShowSidebar
            orgSlug={orgSlug}
            showId={currentShowId}
            showTitle={showTitle || 'Loading...'}
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

      {/* Mobile Navigation - Same as Desktop */}
      <div className="lg:hidden h-full overflow-y-auto">
        {isInShowContext && currentShowId ? (
          <ShowSidebar
            orgSlug={orgSlug}
            showId={currentShowId}
            showTitle={showTitle || 'Loading...'}
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
    </MobileSidebarToggle>
  );
}