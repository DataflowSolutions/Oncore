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
          id: "people-all",
          label: "All Team",
          href: `/${orgSlug}/people`,
          icon: Users,
        },
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
          id: "advancing-overview",
          label: "Overview",
          href: `/${orgSlug}/advancing`,
          icon: FileText,
        },
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

  const isActiveRoute = (href: string) => {
    if (href === `/${orgSlug}`) {
      return currentPath === href;
    }
    return currentPath.startsWith(href);
  };

  const hasActiveChild = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => isActiveRoute(child.href));
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
    const isActive = isActiveRoute(item.href);
    const isParentWithActiveChild = hasActiveChild(item);
    const Icon = item.icon;

    return (
      <div key={item.id}>
        {/* Parent Item */}
        <Link
          href={item.href}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
            ${isChild ? "ml-4 text-sm" : "text-base"}
            ${
              isActive && !isParentWithActiveChild
                ? "bg-foreground text-background shadow-sm"
                : isParentWithActiveChild
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }
          `}
        >
          <Icon size={18} />
          <span className="font-medium">{item.label}</span>
        </Link>

        {/* Children Items */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Logo/Brand */}
      <div className="mb-8 mt-12 lg:mt-0">
        <h2 className="text-xl font-bold text-foreground">Oncore</h2>
        <p className="text-sm text-muted-foreground mt-1">Tour Management</p>
      </div>

      {/* Navigation Items */}
      <nav className="space-y-2">
        {navItems.map((item) => renderNavItem(item))}
      </nav>
    </div>
  );
};

export default SidebarNavigation;