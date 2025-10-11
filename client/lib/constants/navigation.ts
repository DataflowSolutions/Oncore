import {
  Home,
  Users,
  MapPin,
  Settings,
  LucideIcon,
  Calendar,
  FileText,
  Globe,
  Ticket,
} from "lucide-react";

export interface NavigationItem {
  id: string;
  label: string;
  href: (orgSlug: string, showId?: string) => string;
  icon: LucideIcon;
  group?: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "home",
    label: "Home",
    href: (orgSlug: string) => `/${orgSlug}`,
    icon: Home,
    group: "Navigation",
  },
  {
    id: "shows",
    label: "Shows",
    href: (orgSlug: string) => `/${orgSlug}/shows`,
    icon: Ticket,
    group: "Navigation",
  },
  {
    id: "people",
    label: "People",
    href: (orgSlug: string) => `/${orgSlug}/people`,
    icon: Users,
    group: "Navigation",
  },
  {
    id: "venues",
    label: "Network",
    href: (orgSlug: string) => `/${orgSlug}/venues`,
    icon: Globe,
    group: "Navigation",
  },
  {
    id: "settings",
    label: "Settings",
    href: (orgSlug: string) => `/${orgSlug}/profile`,
    icon: Settings,
    group: "Settings",
  },
];

export const SHOW_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: (orgSlug: string, showId?: string) => `/${orgSlug}/shows/${showId}`,
    icon: FileText,
    group: "Show Navigation",
  },
  {
    id: "day",
    label: "Day Schedule",
    href: (orgSlug: string, showId?: string) =>
      `/${orgSlug}/shows/${showId}/day`,
    icon: Calendar,
    group: "Show Navigation",
  },
  {
    id: "team",
    label: "Team",
    href: (orgSlug: string, showId?: string) =>
      `/${orgSlug}/shows/${showId}/team`,
    icon: Users,
    group: "Show Navigation",
  },
  {
    id: "advancing",
    label: "Advancing",
    href: (orgSlug: string, showId?: string) =>
      `/${orgSlug}/shows/${showId}/advancing`,
    icon: FileText,
    group: "Show Navigation",
  },
];

export const SHOW_QUICK_ACCESS_ITEMS: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: (orgSlug: string) => `/${orgSlug}`,
    icon: Calendar,
    group: "Quick Access",
  },
  {
    id: "venues",
    label: "Venues",
    href: (orgSlug: string) => `/${orgSlug}/venues`,
    icon: MapPin,
    group: "Quick Access",
  },
];

/**
 * Get navigation items grouped by their group property
 */
export function getGroupedNavigationItems(orgSlug: string) {
  const groups = new Map<
    string,
    Array<{ id: string; label: string; href: string; icon: LucideIcon }>
  >();

  NAVIGATION_ITEMS.forEach((item) => {
    const group = item.group || "Navigation";
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push({
      id: item.id,
      label: item.label,
      href: item.href(orgSlug),
      icon: item.icon,
    });
  });

  return Array.from(groups.entries()).map(([group, items]) => ({
    group,
    items,
  }));
}
