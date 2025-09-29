"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Calendar,
  Users,
  FileText,
  ChartColumn,
  Settings,
  MapPin,
  Music,
  Building,
  Plus,
} from "lucide-react";

interface SidebarNavigationProps {
  orgSlug: string;
  userRole: string;
  currentPath: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children?: NavItem[];
}

const SidebarNavigation = ({ orgSlug, userRole, currentPath }: SidebarNavigationProps) => {
  const navItems: NavItem[] = [
    {
      id: "day",
      label: "Day",
      href: `/${orgSlug}/day`,
      icon: CalendarDays,
    },
    {
      id: "shows",
      label: "Shows",
      href: `/${orgSlug}/shows`,
      icon: Calendar,
    },
    {
      id: "people",
      label: "People",
      href: `/${orgSlug}/people`,
      icon: Users,
      children: [
        {
          id: "people-artists",
          label: "Artists",
          href: `/${orgSlug}/people/artist`,
          icon: Music,
        },
        {
          id: "people-crew",
          label: "Crew",
          href: `/${orgSlug}/people/crew`,
          icon: Building,
        },
        {
          id: "people-partners",
          label: "Partners",
          href: `/${orgSlug}/people/partners`,
          icon: Building,
        },
        {
          id: "people-venues",
          label: "Venue Contacts",
          href: `/${orgSlug}/people/venues`,
          icon: MapPin,
        },
      ],
    },
    {
      id: "venues",
      label: "Venues",
      href: `/${orgSlug}/venues`,
      icon: MapPin,
    },
    {
      id: "advancing",
      label: "Advancing",
      href: `/${orgSlug}/advancing`,
      icon: FileText,
      children: [
        {
          id: "advancing-new",
          label: "New Session",
          href: `/${orgSlug}/advancing/new`,
          icon: Plus,
        },
      ],
    },
    {
      id: "back-office",
      label: "Back Office",
      href: `/${orgSlug}/back-office`,
      icon: ChartColumn,
    },
    {
      id: "settings",
      label: "Settings",
      href: `/${orgSlug}/settings`,
      icon: Settings,
    },
    {
      id: "profile",
      label: "Profile",
      href: `/${orgSlug}/profile`,
      icon: Settings,
    },
    // Add billing debug for owners
    ...(userRole === "owner"
      ? [
          {
            id: "billing-debug",
            label: "Billing Debug",
            href: `/${orgSlug}/billing-debug`,
            icon: Settings,
          },
        ]
      : []),
  ];

  const isActiveRoute = (href: string, allNavItems: NavItem[] = navItems) => {
    if (currentPath === href) {
      return true;
    }
    
    // For parent routes, only highlight if no child is more specific
    if (currentPath.startsWith(href + '/')) {
      // Check if any child route is more specific
      const item = allNavItems.find(navItem => navItem.href === href);
      if (item?.children) {
        const hasActiveChild = item.children.some(child => currentPath === child.href);
        return !hasActiveChild; // Only active if no child is exactly active
      }
      return true;
    }
    
    return false;
  };

  const hasActiveChild = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => currentPath === child.href);
    }
    return false;
  };

  const shouldExpandSection = (item: NavItem) => {
    // Auto-expand sections that have an active child or are commonly used
    const alwaysExpanded = ["people", "advancing"];
    return alwaysExpanded.includes(item.id) || hasActiveChild(item);
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = shouldExpandSection(item);
    const isActive = isActiveRoute(item.href, navItems);
    const isParentWithActiveChild = hasActiveChild(item);
    const Icon = item.icon;

    return (
      <div key={item.id}>
        {/* Parent Item */}
        <Link
          href={item.href}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
            ${isChild ? "text-sm" : "text-base"}
            ${
              isActive && !isParentWithActiveChild
                ? "bg-foreground text-background shadow-sm"
                : isParentWithActiveChild
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }
          `}
        >
          <Icon size={isChild ? 16 : 18} />
          <span className="font-medium">{item.label}</span>
        </Link>

        {/* Children Items */}
        {hasChildren && isExpanded && (
          <div className="mt-1 ml-4 space-y-1 border-l border-border/50 pl-4">
            {item.children!.map((child) => renderNavItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Logo/Brand */}
      <div className="mb-6 mt-12 lg:mt-0 p-2">
        <h2 className="text-xl font-bold text-foreground">Oncore</h2>
        <p className="text-sm text-muted-foreground mt-1">Tour Management</p>
      </div>

      {/* Navigation Items */}
      <nav className="space-y-1 flex-1 px-2">
        {navItems.map((item) => renderNavItem(item))}
      </nav>
    </div>
  );
};

export default SidebarNavigation;