"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  Settings,
  MapPin,
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
}

const SidebarNavigation = ({
  orgSlug,
  currentPath,
}: SidebarNavigationProps) => {
  const navItems: NavItem[] = [
    {
      id: "home",
      label: "Home",
      href: `/${orgSlug}`,
      icon: Calendar,
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
    },
    {
      id: "venues",
      label: "Venues",
      href: `/${orgSlug}/venues`,
      icon: MapPin,
    },
    {
      id: "profile",
      label: "Settings",
      href: `/${orgSlug}/profile`,
      icon: Settings,
    },
  ];

  const isActiveRoute = (href: string) => {
    // Exact match or starts with the href for nested routes
    if (href === `/${orgSlug}`) {
      return currentPath === href;
    }
    return currentPath === href || currentPath.startsWith(href + "/");
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <Link href={`/${orgSlug}`}>
          <h2 className="text-2xl font-bold text-foreground">Oncore</h2>
        </Link>
      </div>

      {/* Navigation Items - LARGE AND CLEAR */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
    </div>
  );
};

export default SidebarNavigation;
