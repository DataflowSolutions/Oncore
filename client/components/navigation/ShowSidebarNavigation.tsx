"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarDays,
  Users,
  FileText,
} from "lucide-react";
import ClientShowSwitcher from "./ClientShowSwitcher";

interface ShowSidebarNavigationProps {
  orgSlug: string;
  showId: string;
  orgId: string;
  currentPath: string;
}

interface ShowNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ShowSidebarNavigation = ({ 
  orgSlug, 
  showId, 
  orgId, 
  currentPath 
}: ShowSidebarNavigationProps) => {
  
  const showNavItems: ShowNavItem[] = [
    {
      id: "show-details",
      label: "Show Details",
      href: `/${orgSlug}/shows/${showId}`,
      icon: Calendar,
    },
    {
      id: "day-schedule",
      label: "Day Schedule",
      href: `/${orgSlug}/shows/${showId}/day`,
      icon: CalendarDays,
    },
    {
      id: "team",
      label: "Team",
      href: `/${orgSlug}/shows/${showId}/team`,
      icon: Users,
    },
    {
      id: "advancing",
      label: "Advancing",
      href: `/${orgSlug}/shows/${showId}/advancing`,
      icon: FileText,
    },
  ];

  const isActiveRoute = (href: string) => {
    return currentPath === href || currentPath.startsWith(href);
  };

  const renderNavItem = (item: ShowNavItem) => {
    const isActive = isActiveRoute(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.id}
        href={item.href}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-base
          ${
            isActive
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          }
        `}
      >
        <Icon size={18} />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Logo/Brand */}
      <div className="mb-6 mt-12 lg:mt-0">
        <h2 className="text-xl font-bold text-foreground">Oncore</h2>
        <p className="text-sm text-muted-foreground mt-1">Tour Management</p>
      </div>

      {/* Show Switcher */}
      <ClientShowSwitcher 
        orgSlug={orgSlug} 
        currentShowId={showId} 
        orgId={orgId} 
      />

      {/* Show-specific Navigation */}
      <div className="mb-6 flex-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
          Show Pages
        </h4>
        <nav className="space-y-1">
          {showNavItems.map((item) => renderNavItem(item))}
        </nav>
      </div>

      {/* Global Navigation Shortcuts */}
      <div className="border-t border-border pt-4 mt-auto">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
          Quick Access
        </h4>
        <nav className="space-y-1">
          <Link
            href={`/${orgSlug}/day`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60"
          >
            <Calendar size={16} />
            <span className="font-medium">Day View</span>
          </Link>
          <Link
            href={`/${orgSlug}/people`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60"
          >
            <Users size={16} />
            <span className="font-medium">People</span>
          </Link>
          <Link
            href={`/${orgSlug}/shows`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60"
          >
            <Calendar size={16} />
            <span className="font-medium">All Shows</span>
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default ShowSidebarNavigation;