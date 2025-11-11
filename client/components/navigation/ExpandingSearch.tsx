"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGroupedNavigationItems } from "@/lib/constants/navigation";
import { Button } from "@/components/ui/button";

interface ExpandingSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpandingSearch({ open, onOpenChange }: ExpandingSearchProps) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.org as string;
  const [searchQuery, setSearchQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Focus input when opened
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Handle clicks outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
        setSearchQuery("");
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onOpenChange]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const navigationItems = React.useMemo(() => {
    if (!orgSlug) return [];

    const groups = getGroupedNavigationItems(orgSlug);
    return groups.flatMap((group) =>
      group.items.map((item) => ({
        group: group.group,
        icon: item.icon,
        label: item.label,
        href: item.href,
      }))
    );
  }, [orgSlug]);

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return navigationItems;

    const query = searchQuery.toLowerCase();
    return navigationItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.group.toLowerCase().includes(query)
    );
  }, [navigationItems, searchQuery]);

  const handleItemClick = (href: string) => {
    router.push(href);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 transform -translate-x-1/2 w-full sm:w-3/4 md:w-96 lg:w-[500px] max-w-2xl"
    >
      {/* Search Button/Input */}
      <div className="relative">
        <Button
          variant="outline"
          className={cn(
            "relative h-11 w-full justify-start text-sm text-muted-foreground sm:pr-12 transition-all",
            open ? "cursor-text" : "cursor-text"
          )}
          onClick={() => !open && onOpenChange(true)}
        >
          <Search className="mr-2 h-4 w-4 shrink-0" />
          {open ? (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anything"
              className="flex-1 bg-transparent outline-none border-none text-sm placeholder:text-muted-foreground"
            />
          ) : (
            <>
              <span className="hidden lg:inline-flex">Search anything</span>
              <span className="inline-flex lg:hidden">Search...</span>
            </>
          )}
          <kbd className="pointer-events-none absolute right-1.5 top-2.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Expanded Results */}
      {open && (
        <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-[400px] overflow-y-auto z-50 animate-in fade-in-0 slide-in-from-top-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="py-2">
              {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const showGroupHeader =
                  index === 0 || filteredItems[index - 1].group !== item.group;

                return (
                  <React.Fragment key={`${item.group}-${item.label}`}>
                    {showGroupHeader && (
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {item.group}
                      </div>
                    )}
                    <button
                      onClick={() => handleItemClick(item.href)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{item.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
