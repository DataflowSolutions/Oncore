import {
  LucideIcon,
  CalendarDays,
  Calendar,
  Users,
  FileText,
  ChartColumn,
} from "lucide-react";

export interface TabLink {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
}

export const tabLinks: TabLink[] = [
  // Add your tab links here
  {
    id: "day",
    label: "Day",
    href: "/tour/day",
    icon: CalendarDays,
  },
  {
    id: "shows",
    label: "Shows",
    href: "/tour/shows",
    icon: Calendar,
  },
  {
    id: "team",
    label: "Team",
    href: "/tour/team",
    icon: Users,
  },
  {
    id: "advancing",
    label: "Advancing",
    href: "/tour/advancing",
    icon: FileText,
  },
  {
    id: "back-office",
    label: "Back Office",
    href: "/tour/back-office",
    icon: ChartColumn,
  },
];
