"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface MobileSidebarToggleProps {
  children: React.ReactNode;
}

export default function MobileSidebarToggle({ children }: MobileSidebarToggleProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden shadow-lg bg-background"
        aria-label="Toggle navigation"
      >
        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </Button>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full w-80 bg-background border-r border-border shadow-2xl z-40 transition-transform duration-300 ease-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:w-64 lg:shadow-lg lg:translate-x-0 lg:bg-card
        `}
      >
        <div className="h-full overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
}