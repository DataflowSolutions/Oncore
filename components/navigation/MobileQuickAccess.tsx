"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Calendar,
  Users,
  FileText,
  MapPin,
  Plus,
  Music,
  Building,
} from "lucide-react";

interface MobileQuickAccessProps {
  orgSlug: string;
  userRole: string;
}

export default function MobileQuickAccess({ orgSlug }: Omit<MobileQuickAccessProps, 'userRole'>) {
  const pathname = usePathname();

  const quickActions = [
    {
      id: "today",
      label: "Today's Schedule",
      href: `/${orgSlug}/day`,
      icon: CalendarDays,
      color: "bg-blue-500",
      description: "View today's events"
    },
    {
      id: "shows",
      label: "Shows",
      href: `/${orgSlug}/shows`,
      icon: Calendar,
      color: "bg-purple-500",
      description: "Manage shows"
    },
    {
      id: "people",
      label: "People",
      href: `/${orgSlug}/people`,
      icon: Users,
      color: "bg-green-500",
      description: "View team members"
    },
    {
      id: "advancing",
      label: "Advancing",
      href: `/${orgSlug}/advancing`,
      icon: FileText,
      color: "bg-orange-500",
      description: "Advance shows"
    },
  ];

  const peopleSubActions = [
    {
      id: "artists",
      label: "Artists",
      href: `/${orgSlug}/people/artist`,
      icon: Music,
    },
    {
      id: "crew",
      label: "Crew",
      href: `/${orgSlug}/people/crew`,
      icon: Building,
    },
  ];

  const isInPeopleSection = pathname.startsWith(`/${orgSlug}/people`);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 p-2">
        <h2 className="text-xl font-bold text-foreground">Oncore</h2>
        <p className="text-sm text-muted-foreground mt-1">Tour Management</p>
      </div>

      {/* Quick Action Cards */}
      <div className="flex-1 px-2 pb-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Quick Access
        </h3>
        
        <div className="space-y-1 mb-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isActive = pathname.startsWith(action.href);
            
            return (
              <Link
                key={action.id}
                href={action.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 active:scale-[0.98]
                  ${isActive 
                    ? "bg-foreground text-background shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }
                `}
              >
                <Icon size={18} />
                <span className="font-medium">{action.label}</span>
              </Link>
            );
          })}
        </div>

        {/* People Sub-navigation (when in people section) */}
        {isInPeopleSection && (
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              People
            </h4>
            <div className="ml-4 space-y-1 border-l border-border/50 pl-4">
              {peopleSubActions.map((action) => {
                const Icon = action.icon;
                const isActive = pathname === action.href;
                
                return (
                  <Link
                    key={action.id}
                    href={action.href}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 active:scale-[0.98] text-sm
                      ${isActive 
                        ? "bg-foreground text-background shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      }
                    `}
                  >
                    <Icon size={16} />
                    <span className="font-medium">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Context-aware additional actions */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex gap-2">
            <Link
              href={`/${orgSlug}/venues`}
              className="flex-1 p-3 text-center bg-card hover:bg-accent/60 rounded-lg border border-border transition-colors active:scale-95"
            >
              <MapPin size={16} className="mx-auto mb-1" />
              <div className="text-xs font-medium">Venues</div>
            </Link>
            
            <Link
              href={`/${orgSlug}/advancing/new`}
              className="flex-1 p-3 text-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors active:scale-95"
            >
              <Plus size={16} className="mx-auto mb-1" />
              <div className="text-xs font-medium">New Session</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}