"use client";
import React from "react";
import { getDefaultMobileNav } from "../constants/navlinks";
import { usePathname } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "./HamburgerMenu";

interface MobileNavigationProps {
  orgSlug: string;
  userRole: string;
}

const MobileNavigation = ({ orgSlug, userRole }: MobileNavigationProps) => {
  const pathname = usePathname();
  const mobileLinks = getDefaultMobileNav(orgSlug);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-sm border-t border-border shadow-lg">
      <div className="flex items-center justify-around px-1 py-1 safe-area-inset-bottom">
        {mobileLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon!;

          return (
            <Link
              key={link.id}
              href={link.href}
              prefetch={true}
              className={`
                flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[80px]
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
                <Icon size={22} />
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
