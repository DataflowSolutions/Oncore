import { Home, Users, MapPin, Settings, Music, LucideIcon } from "lucide-react";

export interface NavigationItem {
  id: string;
  label: string;
  href: (orgSlug: string) => string;
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
    icon: Music,
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
    label: "Venues",
    href: (orgSlug: string) => `/${orgSlug}/venues`,
    icon: MapPin,
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
