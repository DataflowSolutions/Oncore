"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

interface MobileSidebarToggleProps {
  children: React.ReactNode;
}

export default function MobileSidebarToggle({ children }: MobileSidebarToggleProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg lg:hidden transition-all duration-200 hover:bg-accent/50"
        aria-label="Toggle navigation"
      >
        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full w-72 bg-card/95 backdrop-blur-sm border-r border-border shadow-2xl z-40 transition-transform duration-300 ease-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:w-64 lg:shadow-lg lg:translate-x-0
        `}
      >
        <div className="h-full overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
}