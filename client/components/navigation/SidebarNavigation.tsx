"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NAVIGATION_ITEMS,
  SHOW_NAVIGATION_ITEMS,
  SHOW_QUICK_ACCESS_ITEMS,
} from "@/lib/constants/navigation";

interface SidebarNavigationProps {
  orgSlug: string;
  userRole: string;
  currentPath: string;
  showId?: string;
}

const SidebarNavigation = ({
  orgSlug,
  currentPath,
  showId,
}: SidebarNavigationProps) => {
  const isShowContext = !!showId;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Navigation: true,
    Settings: false,
  });

  // Determine which navigation items to use
  const mainNavItems = isShowContext
    ? SHOW_NAVIGATION_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href(orgSlug, showId),
        icon: item.icon,
        group: item.group,
      }))
    : NAVIGATION_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href(orgSlug),
        icon: item.icon,
        group: item.group,
      }));

  const quickAccessItems = isShowContext
    ? SHOW_QUICK_ACCESS_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href(orgSlug),
        icon: item.icon,
      }))
    : null;

  const isActiveRoute = (href: string) => {
    // Exact match
    return currentPath === href;
  };

  // Group navigation items
  const groupedItems = mainNavItems.reduce((acc, item) => {
    const group = item.group || "Navigation";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof mainNavItems>);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Logo/Brand or Show Header */}
      <div className="p-6 border-b border-border">
        {isShowContext ? (
          <>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href={`/${orgSlug}/shows`} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Shows
              </Link>
            </Button>
          </>
        ) : (
          <Link href={`/${orgSlug}`}>
            <h2 className="text-2xl font-bold text-foreground">Oncore</h2>
          </Link>
        )}
      </div>

      {/* Navigation Items - LARGE AND CLEAR WITH DROPDOWNS */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {isShowContext && (
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Show Navigation
          </div>
        )}
        
        {Object.entries(groupedItems).map(([groupName, items]) => (
          <div key={groupName} className="space-y-1">
            {items.length > 1 && !isShowContext && (
              <button
                onClick={() => toggleGroup(groupName)}
                className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>{groupName}</span>
                {expandedGroups[groupName] ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            
            {(expandedGroups[groupName] || items.length === 1 || isShowContext) && (
              <div className="space-y-1">
                {items.map((item) => {
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
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Quick Access Section (only for show context) */}
      {isShowContext && quickAccessItems && (
        <div className="p-4 border-t border-border space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Quick Access
          </div>
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SidebarNavigation;
