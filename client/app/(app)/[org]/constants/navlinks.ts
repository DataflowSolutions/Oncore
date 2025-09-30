import {
  LucideIcon,
  Calendar,
  Users,
  FileText,
  ChartColumn,
  Settings,
  MapPin,
} from "lucide-react";

export interface TabLink {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
}

export const getTabLinks = (
  orgSlug: string,
  userRole: string = "viewer"
): TabLink[] => [
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
  // {
  //   id: "advancing",
  //   label: "Advancing",
  //   href: `/${orgSlug}/advancing`,
  //   icon: FileText,
  // },
  // {
  //   id: "back-office",
  //   label: "Back Office",
  //   href: `/${orgSlug}/back-office`,
  //   icon: ChartColumn,
  // },
  {
    id: "profile",
    label: "Profile (bort)",
    href: `/${orgSlug}/profile`,
    icon: Settings,
  },
  // Add billing debug for owners
  ...(userRole === "owner"
    ? [
        {
          id: "billing-debug",
          label: "Billing (bort)",
          href: `/${orgSlug}/billing-debug`,
          icon: undefined,
        },
      ]
    : []),
];

// Default mobile navigation items (most frequently used)
export const getDefaultMobileNav = (orgSlug: string): TabLink[] => [
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
  // {
  //   id: "advancing",
  //   label: "Advancing",
  //   href: `/${orgSlug}/advancing`,
  //   icon: FileText,
  // },
];

// Items for hamburger menu (less frequently used)
export const getHamburgerMenuItems = (
  orgSlug: string,
  userRole: string = "viewer"
): TabLink[] => [
  {
    id: "venues",
    label: "Venues",
    href: `/${orgSlug}/venues`,
    icon: MapPin,
  },
  // {
  //   id: "back-office",
  //   label: "Back Office",
  //   href: `/${orgSlug}/back-office`,
  //   icon: ChartColumn,
  // },
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
          icon: Settings, // Use Settings icon for billing debug
        },
      ]
    : []),
];
