"use client";
import React, { useState, useEffect } from "react";
import { getDefaultMobileNav } from "../constants/navlinks";
import { usePathname } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "./HamburgerMenu";
import { LoadingSpinner } from "@/components/ui/loading";

interface MobileNavigationProps {
  orgSlug: string;
  userRole: string;
}

const MobileNavigation = ({ orgSlug, userRole }: MobileNavigationProps) => {
  const pathname = usePathname();
  const mobileLinks = getDefaultMobileNav(orgSlug);
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
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-sm border-t border-border shadow-lg">
      <div className="flex items-center justify-around px-1 py-1 safe-area-inset-bottom">
        {mobileLinks.map((link) => {
          const isActive = pathname === link.href;
          const isLoading = loadingTab === link.id;
          const Icon = link.icon!;

          return (
            <Link
              key={link.id}
              href={link.href}
              onClick={() => handleTabClick(link.id, link.href)}
              className={`
                flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[80px]
                ${isLoading ? "opacity-75" : ""}
                ${
                  isActive
                    ? "text-foreground bg-foreground/15 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60 active:scale-95"
                }
              `}
            >
              <div
                className={`
                p-1 rounded-lg transition-colors duration-200
                ${isActive ? "bg-foreground/20" : ""}
              `}
              >
                {isLoading ? <LoadingSpinner size={22} /> : <Icon size={22} />}
              </div>
              <span className="text-xs font-medium text-center leading-tight truncate w-full">
                {link.label}
              </span>
            </Link>
          );
        })}

        {/* Hamburger Menu */}
        <HamburgerMenu orgSlug={orgSlug} userRole={userRole} />
      </div>
    </div>
  );
};

export default MobileNavigation;
