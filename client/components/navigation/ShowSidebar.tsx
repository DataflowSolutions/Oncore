"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  MapPin,
  FileText,
  ArrowLeft,
  Music,
} from "lucide-react";

interface ShowSidebarProps {
  orgSlug: string;
  showId: string;
  showTitle: string;
  currentPath: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ShowSidebar = ({
  orgSlug,
  showId,
  showTitle,
  currentPath,
}: ShowSidebarProps) => {
  const navItems: NavItem[] = [
    {
      id: "overview",
      label: "Overview",
      href: `/${orgSlug}/shows/${showId}`,
      icon: FileText,
    },
    {
      id: "day",
      label: "Day Schedule",
      href: `/${orgSlug}/shows/${showId}/day`,
      icon: Calendar,
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
    return currentPath === href;
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Back to Shows */}
      <div className="p-6 border-b border-border">
        <Link 
          href={`/${orgSlug}/shows`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">All Shows</span>
        </Link>
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground truncate">{showTitle}</h2>
        </div>
      </div>

      {/* Show-Specific Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
          Show Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveRoute(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-200 text-base font-semibold
                ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-foreground hover:bg-accent hover:shadow-md"
                }
              `}
            >
              <Icon size={24} className="shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
          Quick Access
        </div>
        <Link
          href={`/${orgSlug}`}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Calendar size={18} />
          Dashboard
        </Link>
        <Link
          href={`/${orgSlug}/venues`}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <MapPin size={18} />
          Venues
        </Link>
      </div>
    </div>
  );
};

export default ShowSidebar;
