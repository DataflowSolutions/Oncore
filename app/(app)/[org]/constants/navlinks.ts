import {
  LucideIcon,
  CalendarDays,
  Calendar,
  Users,
  FileText,
  ChartColumn,
  Settings,
} from "lucide-react";

export interface TabLink {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
}

export const getTabLinks = (orgSlug: string, userRole: string = 'viewer'): TabLink[] => [
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
    id: "team",
    label: "Team",
    href: `/${orgSlug}/team`,
    icon: Users,
  },
  {
    id: "advancing",
    label: "Advancing",
    href: `/${orgSlug}/advancing`,
    icon: FileText,
  },
  {
    id: "back-office",
    label: "Back Office",
    href: `/${orgSlug}/back-office`,
    icon: ChartColumn,
  },
  {
    id: "profile",
    label: "Profile (bort)",
    href: `/${orgSlug}/profile`,
    icon: Settings,
  },
  // Add billing debug for owners
  ...(userRole === 'owner' ? [{
    id: "billing-debug",
    label: "Billing (bort)",
    href: `/${orgSlug}/billing-debug`,
    icon: undefined,
  }] : []),
];

// Backwards compatibility
export const tabLinks: TabLink[] = getTabLinks('tour');
