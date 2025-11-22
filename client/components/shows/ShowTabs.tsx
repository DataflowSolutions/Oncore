"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Download, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShowTabsProps {
  orgSlug: string;
  showId: string;
}

const tabs = [
  {
    name: "Team",
    icon: Users,
    href: (orgSlug: string, showId: string) =>
      `/${orgSlug}/shows/${showId}/team`,
  },
  {
    name: "Download",
    icon: Download,
    onClick: () => console.log("Download"),
  },
  {
    name: "Share",
    icon: Share2,
    onClick: () => console.log("Share"),
  },
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
    <div className="overflow-x-auto overflow-y-hidden">
      <nav className="flex gap-4" aria-label="Show navigation">
        {tabs.map((tab) => {
          const href = tab.href ? tab.href(orgSlug, showId) : null;
          const active = href ? isActive(href) : false;
          const Icon = tab.icon;

          if (href) {
            return (
              <Link
                key={tab.name}
                href={href}
                prefetch={true}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap rounded-full",
                  active
                    ? "bg-tab-bg-active text-tab-text border-tab-border-active"
                    : "bg-tab-bg text-tab-text hover:bg-tab-bg-active border-tab-border"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.name}</span>
              </Link>
            );
          } else {
            return (
              <button
                key={tab.name}
                onClick={tab.onClick}
                className={cn(
                  "flex cursor-not-allowed items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap rounded-full bg-tab-bg text-tab-text hover:bg-tab-bg-active border-tab-border"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            );
          }
        })}
        {/* <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 size-11 text-sm font-medium transition-colors whitespace-nowrap rounded-full bg-tab-bg text-tab-text hover:bg-tab-bg-active border-tab-border"
          )}
        >
          <Expand className={cn("h-4 w-4", expanded && "rotate-180")} />
        </button> */}
      </nav>
    </div>
  );
}
