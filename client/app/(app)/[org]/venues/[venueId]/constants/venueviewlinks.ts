import { LucideIcon, Building, Users } from "lucide-react";

export interface TabLink {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export const tabLinks: TabLink[] = [
  {
    id: "details",
    label: "Details",
    icon: Building,
  },
  {
    id: "promoters",
    label: "Promoters",
    icon: Users,
  },
];
