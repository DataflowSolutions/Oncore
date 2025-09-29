"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  Calendar,
  Users,
  X,
  Menu,
  UserPlus,
  CalendarPlus,
  FileText,
  Music,
  Building,
  Settings,
  Search,
  Clock,
} from "lucide-react";

interface MobileFloatingActionsProps {
  orgSlug: string;
}

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

export default function MobileFloatingActions({ orgSlug }: MobileFloatingActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Get context-aware quick actions based on current page
  const quickActions = useMemo((): QuickAction[] => {
    // People pages
    if (pathname.startsWith(`/${orgSlug}/people`)) {
      return [
        {
          id: "add-person",
          label: "Add Person",
          href: `/${orgSlug}/people/new`,
          icon: UserPlus,
          color: "bg-green-500 hover:bg-green-600",
        },
        {
          id: "add-artist",
          label: "Add Artist",
          href: `/${orgSlug}/people/new?type=artist`,
          icon: Music,
          color: "bg-purple-500 hover:bg-purple-600",
        },
        {
          id: "add-crew",
          label: "Add Crew",
          href: `/${orgSlug}/people/new?type=crew`,
          icon: Building,
          color: "bg-blue-500 hover:bg-blue-600",
        },
      ];
    }

    // Shows pages
    if (pathname.startsWith(`/${orgSlug}/shows`)) {
      return [
        {
          id: "new-show",
          label: "New Show",
          href: `/${orgSlug}/shows/new`,
          icon: CalendarPlus,
          color: "bg-purple-500 hover:bg-purple-600",
        },
        {
          id: "search-venues",
          label: "Find Venue",
          href: `/${orgSlug}/venues`,
          icon: Search,
          color: "bg-blue-500 hover:bg-blue-600",
        },
        {
          id: "schedule",
          label: "Schedule",
          href: `/${orgSlug}/shows/schedule`,
          icon: Calendar,
          color: "bg-orange-500 hover:bg-orange-600",
        },
      ];
    }

    // Venues pages
    if (pathname.startsWith(`/${orgSlug}/venues`)) {
      return [
        {
          id: "new-venue",
          label: "Add Venue",
          href: `/${orgSlug}/venues/new`,
          icon: Plus,
          color: "bg-blue-500 hover:bg-blue-600",
        },
        {
          id: "search-venues",
          label: "Search",
          href: `/${orgSlug}/venues/search`,
          icon: Search,
          color: "bg-green-500 hover:bg-green-600",
        },
        {
          id: "venue-contacts",
          label: "Contacts",
          href: `/${orgSlug}/people/venues`,
          icon: Users,
          color: "bg-purple-500 hover:bg-purple-600",
        },
      ];
    }

    // Advancing pages
    if (pathname.startsWith(`/${orgSlug}/advancing`)) {
      return [
        {
          id: "new-session",
          label: "New Session",
          href: `/${orgSlug}/advancing/new`,
          icon: Plus,
          color: "bg-orange-500 hover:bg-orange-600",
        },
        {
          id: "templates",
          label: "Templates",
          href: `/${orgSlug}/advancing/templates`,
          icon: FileText,
          color: "bg-blue-500 hover:bg-blue-600",
        },
        {
          id: "schedule",
          label: "Schedule",
          href: `/${orgSlug}/shows/schedule`,
          icon: Clock,
          color: "bg-green-500 hover:bg-green-600",
        },
      ];
    }

    // Day page - removed since day scheduling is now show-specific

    // Settings pages
    if (pathname.startsWith(`/${orgSlug}/settings`) || pathname.startsWith(`/${orgSlug}/profile`)) {
      return [
        {
          id: "back-to-shows",
          label: "Back to Shows",
          href: `/${orgSlug}/shows`,
          icon: Calendar,
          color: "bg-blue-500 hover:bg-blue-600",
        },
        {
          id: "team-settings",
          label: "Team Settings",
          href: `/${orgSlug}/settings/team`,
          icon: Users,
          color: "bg-green-500 hover:bg-green-600",
        },
        {
          id: "organization",
          label: "Organization",
          href: `/${orgSlug}/settings/organization`,
          icon: Settings,
          color: "bg-gray-500 hover:bg-gray-600",
        },
      ];
    }

    // Default/fallback actions for other pages
    return [
      {
        id: "shows",
        label: "Shows",
        href: `/${orgSlug}/shows`,
        icon: Calendar,
        color: "bg-purple-500 hover:bg-purple-600",
      },
      {
        id: "people",
        label: "People",
        href: `/${orgSlug}/people`,
        icon: Users,
        color: "bg-green-500 hover:bg-green-600",
      },
    ];
  }, [orgSlug, pathname]);

  // Don't show if there are no relevant actions
  if (!quickActions.length) {
    return null;
  }

  return (
    <div className="lg:hidden">
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Actions */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 space-y-2">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                href={action.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-white font-medium text-sm
                  transform transition-all duration-300 active:scale-95 backdrop-blur-sm
                  ${action.color}
                `}
                style={{
                  transform: `translateX(${isOpen ? '0' : '120%'}) scale(${isOpen ? '1' : '0.8'})`,
                  opacity: isOpen ? '1' : '0',
                  transitionDelay: `${index * 75}ms`,
                }}
              >
                <Icon size={18} />
                {action.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl
          flex items-center justify-center transition-all duration-300 active:scale-90
          backdrop-blur-sm border border-primary/20
          ${isOpen 
            ? "bg-red-500 hover:bg-red-600 rotate-45" 
            : "bg-primary hover:bg-primary/90 hover:scale-105"
          }
        `}
      >
        {isOpen ? (
          <X size={22} className="text-white" />
        ) : (
          <Menu size={22} className="text-primary-foreground" />
        )}
      </button>
    </div>
  );
}