"use client";
import React, { useState, useEffect } from "react";
import { getTabLinks } from "../constants/navlinks";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading";

interface TabNavigationProps {
  orgSlug: string;
  userRole: string;
}

const TabNavigation = ({ orgSlug, userRole }: TabNavigationProps) => {
  const pathname = usePathname();
  const tabLinks = getTabLinks(orgSlug, userRole);
  const [loadingTab, setLoadingTab] = useState<string | null>(null);

  // Clear loading state when pathname changes
  useEffect(() => {
    setLoadingTab(null);
  }, [pathname]);

  const handleTabClick = (tabId: string, tabHref: string) => {
    // Don't set loading state if already on this page
    if (pathname === tabHref) {
      return;
    }
    setLoadingTab(tabId);
  };

  return (
    <div
      className="inline-flex items-center p-1 rounded-lg"
      style={{ backgroundColor: "var(--tab-bg)" }}
    >
      {tabLinks.map((link) => {
        const isActive = pathname === link.href;
        const isLoading = loadingTab === link.id;
        const Icon = link.icon;

        return (
          <Link
            key={link.id}
            href={link.href}
            onClick={() => handleTabClick(link.id, link.href)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
              ${isLoading ? "opacity-75" : ""}
              ${
                isActive
                  ? "text-[var(--foreground)]"
                  : "text-gray-400 hover:text-gray-300"
              }
            `}
            style={{
              backgroundColor: isActive ? "var(--background)" : "transparent",
            }}
          >
            {isLoading ? (
              <LoadingSpinner size={16} />
            ) : (
              Icon && <Icon size={16} />
            )}
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default TabNavigation;
