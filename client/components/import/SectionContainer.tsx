"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  // For multi-item sections (hotels, flights, etc.)
  showNavigation?: boolean;
  currentIndex?: number;
  totalItems?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

/**
 * Reusable section header component for import confirmation
 * Includes optional navigation arrows for multi-item sections (Hotels, Flights, etc.)
 */
export function SectionContainer({
  title,
  children,
  className,
  showNavigation = false,
  currentIndex = 0,
  totalItems = 0,
  onPrevious,
  onNext,
}: SectionHeaderProps) {
  const hasMultipleItems = totalItems > 1;

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-header tracking-tight">
          {title}
        </h2>
        {showNavigation && hasMultipleItems && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              disabled={currentIndex === 0}
              className="p-1 hover:bg-card-cell rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous item"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {currentIndex + 1} / {totalItems}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={currentIndex >= totalItems - 1}
              className="p-1 hover:bg-card-cell rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next item"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
