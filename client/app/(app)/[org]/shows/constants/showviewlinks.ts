import { LucideIcon, List, Calendar } from "lucide-react";

export interface TabLink {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export const tabLinks: TabLink[] = [
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
];
