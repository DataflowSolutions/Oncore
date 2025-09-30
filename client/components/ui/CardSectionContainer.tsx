import React from "react";

interface CardSectionContainerProps {
  children: React.ReactNode[];
}

/**
 * Responsive card section container for top cards in /people/ pages.
 * - Desktop: row layout
 * - Mobile: 2x2 grid
 * - 3 cards: last card spans two columns
 */
export function CardSectionContainer({ children }: CardSectionContainerProps) {
  const count = React.Children.count(children);
  return (
    <div
      className={
        // Desktop: row, Mobile: grid
        // 3 cards: last card spans 2 cols on mobile
        count === 3
          ? "grid grid-cols-2 gap-4 md:flex md:flex-row" // 2x2 grid on mobile, row on desktop
          : "grid grid-cols-2 gap-4 md:flex md:flex-row"
      }
    >
      {children.map((child, idx) => {
        if (count === 3 && idx === 2) {
          // Last card spans 2 columns on mobile
          return (
            <div key={idx} className="col-span-2 md:col-span-1 md:flex-1">
              {child}
            </div>
          );
        }
        return (
          <div key={idx} className="md:flex-1">
            {child}
          </div>
        );
      })}
    </div>
  );
}
