"use client";
import React, { useState } from "react";
import { getHamburgerMenuItems } from "../constants/navlinks";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface HamburgerMenuProps {
  orgSlug: string;
  userRole: string;
}

const HamburgerMenu = ({ orgSlug, userRole }: HamburgerMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const mobileNavIds = ["day", "shows", "people", "advancing"];
  const allMenuItems = getHamburgerMenuItems(orgSlug, userRole);

  // Filter out items that are already in bottom navigation
  const menuItems = allMenuItems.filter(
    (item) => !mobileNavIds.includes(item.id)
  );

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[80px] text-muted-foreground hover:text-foreground hover:bg-accent/60 active:scale-95"
      >
        <div className="p-1 rounded-lg">
          <Menu size={22} />
        </div>
        <span className="text-xs font-medium text-center leading-tight truncate w-full">
          More
        </span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={handleClose}
        />
      )}

      {/* Menu Panel */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50 lg:hidden
          bg-card border-t border-border shadow-lg
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-y-0" : "translate-y-full"}
        `}
      >
        <div className="p-4">
          {/* Drag Handle */}
          <div className="flex justify-center mb-2">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Menu</h3>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-accent/60 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon!;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={handleClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? "text-foreground bg-foreground/10 border border-foreground/20"
                        : "text-foreground hover:bg-accent/60"
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default HamburgerMenu;
