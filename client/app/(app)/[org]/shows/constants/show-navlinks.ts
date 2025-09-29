import {
  LucideIcon,
  Calendar,
  Users,
  FileText,
  ArrowLeft,
} from "lucide-react";

export interface TabLink {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
}

// Show-specific navigation (when inside a show)
export const getShowTabLinks = (orgSlug: string, showId: string): TabLink[] => [
  {
    id: "back",
    label: "← Back to Shows",
    href: `/${orgSlug}/shows`,
    icon: ArrowLeft,
  },
  {
    id: "show-details",
    label: "Show Details",
    href: `/${orgSlug}/shows/${showId}`,
    icon: Calendar,
  },
  {
    id: "team",
    label: "Team",
    href: `/${orgSlug}/shows/${showId}/team`,
    icon: Users,
  },
  {
    id: "advancing",
    label: "Advancing",
    href: `/${orgSlug}/shows/${showId}/advancing`,
    icon: FileText,
  },
];