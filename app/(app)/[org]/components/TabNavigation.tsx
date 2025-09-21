"use client";
import React from "react";
import { getTabLinks } from "../constants/navlinks";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface TabNavigationProps {
  orgSlug: string;
  userRole: string;
}

const TabNavigation = ({ orgSlug, userRole }: TabNavigationProps) => {
  const pathname = usePathname();
  const tabLinks = getTabLinks(orgSlug, userRole);

  return (
    <div
      className="inline-flex items-center p-1 rounded-lg"
      style={{ backgroundColor: "var(--tab-bg)" }}
    >
      {tabLinks.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.id}
            href={link.href}
            prefetch={false}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
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
            {Icon && <Icon size={16} />}
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default TabNavigation;
