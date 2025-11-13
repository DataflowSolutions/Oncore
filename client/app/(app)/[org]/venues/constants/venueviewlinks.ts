import { LucideIcon, Building, Users, UserCog } from "lucide-react";

export interface TabLink {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export const tabLinks: TabLink[] = [
  {
    id: "venues",
    label: "Venues",
    icon: Building,
  },
  {
    id: "promoters",
    label: "Promoters",
    icon: Users,
  },
  {
    id: "team",
    label: "Team",
    icon: UserCog,
  },
];
