"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Search, 
  Calendar, 
  Users, 
  MapPin, 
  UserCheck, 
  FileText, 
  File,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useGlobalSearch, groupSearchResults, getResultTypeLabel } from "@/lib/hooks/use-global-search";
import type { GlobalSearchResult } from "@/lib/database.types";

interface ExpandingSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId?: string;
}

export function ExpandingSearch({ open, onOpenChange, orgId }: ExpandingSearchProps) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.org as string;
  const [searchQuery, setSearchQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Use global search hook
  const { data: searchResults = [], isLoading } = useGlobalSearch(
    orgId || '',
    searchQuery,
    !!orgId && open
  );

  // Group results by type
  const groupedResults = React.useMemo(() => {
    return groupSearchResults(searchResults);
  }, [searchResults]);

  // Get icon for result type
  const getResultIcon = (type: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      show: Calendar,
      venue: MapPin,
      person: Users,
      promoter: UserCheck,
      contact: Users,
      event: CalendarClock,
      document: FileText,
      file: File,
    };
    return icons[type] || FileText;
  };

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

  const handleResultClick = (result: GlobalSearchResult) => {
    const fullUrl = `/${orgSlug}${result.url}`;
    router.push(fullUrl);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Button/Input */}
      <div className="relative">
        <Button
          variant="outline"
          className={cn(
            "bg-search-bg! border border-search-border! rounded-full relative h-11 w-full justify-start text-sm text-muted-foreground sm:pr-12 transition-all",
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
          <kbd className="pointer-events-none absolute right-3 top-2.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-75 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Expanded Results */}
      {open && (
        <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-[400px] overflow-y-auto z-50 animate-in fade-in-0 slide-in-from-top-2">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : searchResults.length === 0 && searchQuery.trim() ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : searchQuery.trim() === '' ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Start typing to search shows, venues, people, and more...
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([type, results]) => {
                if (results.length === 0) return null;
                
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      {getResultTypeLabel(type, results.length)}
                    </div>
                    {results.map((result) => {
                      const Icon = getResultIcon(result.type);
                      
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-medium truncate">{result.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
