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
        className="fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-lg lg:hidden"
        aria-label="Toggle navigation"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
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
          fixed left-0 top-0 h-full w-64 bg-card/95 backdrop-blur-sm border-r border-border shadow-lg z-40 overflow-y-auto transition-transform duration-300
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {children}
      </div>
    </>
  );
}