"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, ClipboardList, UserCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShowTabsProps {
  orgSlug: string;
  showId: string;
}

const tabs = [
  {
    name: "Overview",
    icon: Eye,
    href: (orgSlug: string, showId: string) => `/${orgSlug}/shows/${showId}`,
    exact: true,
  },
  {
    name: "Day Schedule",
    icon: ClipboardList,
    href: (orgSlug: string, showId: string) =>
      `/${orgSlug}/shows/${showId}/day`,
  },
  {
    name: "Team",
    icon: UserCircle,
    href: (orgSlug: string, showId: string) =>
      `/${orgSlug}/shows/${showId}/team`,
  },
  // {
  //   name: "Advancing",
  //   icon: FileText,
  //   href: (orgSlug: string, showId: string) =>
  //     `/${orgSlug}/shows/${showId}/advancing`,
  // },
];

export function ShowTabs({ orgSlug, showId }: ShowTabsProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="border-b border-border overflow-x-auto overflow-y-hidden">
      <nav className="flex gap-1" aria-label="Show navigation">
        {tabs.map((tab) => {
          const href = tab.href(orgSlug, showId);
          const active = isActive(href, tab.exact);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={href}
              prefetch={true}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                "border-b-2 -mb-px",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
