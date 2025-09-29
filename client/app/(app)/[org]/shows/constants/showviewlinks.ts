import { LucideIcon, List, Calendar, Grid3x3 } from "lucide-react";

export interface TabLink {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export const tabLinks: TabLink[] = [
  // Add your tab links here
  {
    id: "list",
    label: "List",
    icon: List,
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
  },
  {
    id: "both",
    label: "Both",
    icon: Grid3x3,
  },
];
