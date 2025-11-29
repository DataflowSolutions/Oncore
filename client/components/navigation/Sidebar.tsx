"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Calendar,
  Globe,
  X,
  Play,
  Settings,
  Filter,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { toast } from "sonner";

interface SidebarProps {
  orgSlug: string;
}

const STORAGE_KEY = "oncore_last_show";

export function Sidebar({ orgSlug }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const {
    isOpen: isMobileOpen,
    close: closeSidebar,
    setLastShowId,
    lastShowId,
  } = useSidebarStore();

  // Track if we've checked localStorage
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  // Helper: basic UUID validator
  const isUuid = (value: string | null | undefined) =>
    !!value && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);

  // Extract showId from current URL (ignore non-show routes like import-confirmation)
  const currentShowId = useMemo(() => {
    const showMatch = pathname?.match(new RegExp(`/${orgSlug}/shows/([^/]+)`));
    const candidate = showMatch ? showMatch[1] : null;
    return isUuid(candidate) ? candidate : null;
  }, [pathname, orgSlug]);

  // Load last show from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.orgSlug === orgSlug && parsed.showId) {
          setLastShowId(parsed.showId);
        } else {
          // Different org or no showId, clear it
          setLastShowId(null);
        }
      } catch {
        // Ignore parse errors
        setLastShowId(null);
      }
    } else {
      setLastShowId(null);
    }
    setHasCheckedStorage(true);
  }, [orgSlug, setLastShowId]);

  // Update localStorage when navigating to a show page
  useEffect(() => {
    if (currentShowId && isUuid(currentShowId)) {
      setLastShowId(currentShowId);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          orgSlug,
          showId: currentShowId,
        })
      );
    }
  }, [currentShowId, orgSlug, setLastShowId]);

  // Fetch shows list to get latest show when no show is stored
  const { data: showsList } = useQuery({
    queryKey: queryKeys.shows(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/shows`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: hasCheckedStorage && !lastShowId, // Only fetch if we've checked storage and have no show
    staleTime: 60 * 1000, // 1 minute
  });

  // Set latest show from shows list if we don't have one stored
  useEffect(() => {
    if (hasCheckedStorage && !lastShowId && showsList && showsList.length > 0) {
      // Sort by date descending (fallback to show_date if present)
      const sortedShows = [...showsList].sort(
        (a: { date?: string; show_date?: string }, b: { date?: string; show_date?: string }) => {
          const ad = a.date || a.show_date || "1970-01-01";
          const bd = b.date || b.show_date || "1970-01-01";
          return new Date(bd).getTime() - new Date(ad).getTime();
        }
      );
      const latestShow = sortedShows[0];
      if (latestShow?.id && isUuid(latestShow.id)) {
        setLastShowId(latestShow.id);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            orgSlug,
            showId: latestShow.id,
          })
        );
      }
    }
  }, [hasCheckedStorage, lastShowId, showsList, orgSlug, setLastShowId]);

  // Use lastShowId for sub-nav (persists across navigation)
  const showId = lastShowId;

  // Fetch show data - will use prefetched/cached data when available
  const { data: show, isError } = useQuery({
    queryKey: queryKeys.show(showId!),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/shows/${showId}`);
      if (!response.ok) {
        // If show doesn't exist (404), clear it from localStorage
        if (response.status === 404) {
          localStorage.removeItem(STORAGE_KEY);
          setLastShowId(null);
        }
        return null;
      }
      return response.json();
    },
    enabled: !!showId && isUuid(showId), // Only run if we have a valid showId
    staleTime: 5 * 60 * 1000, // 5 minutes - show metadata rarely changes
    retry: false, // Don't retry on 404
  });

  // Clear lastShowId if fetch failed (show was deleted or doesn't exist)
  useEffect(() => {
    if (isError && showId) {
      localStorage.removeItem(STORAGE_KEY);
      setLastShowId(null);
    }
  }, [isError, showId, setLastShowId]);

  const navigation = [
    // { name: "Today", href: `/${orgSlug}/day`, icon: CalendarDays },
    { name: "Shows", href: `/${orgSlug}/shows`, icon: Calendar, exact: true },
    { name: "Network", href: `/${orgSlug}/venues?view=team`, icon: Globe },
    // { name: "Ingestion", href: `/${orgSlug}/ingestion`, icon: Mail },
    // { name: "Partners", href: `/${orgSlug}/partners`, icon: Handshake },
    // { name: "Calendar", href: `/${orgSlug}/calendar`, icon: CalendarClock },
  ];

  // Day view navigation - shown only if we have a valid show that exists
  const dayViewNav = showId && show
    ? [
        {
          name: "Day Schedule",
          href: `/${orgSlug}/shows/${showId}/day`,
          icon: Play,
        },
      ]
    : [];

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    if (href === `/${orgSlug}`) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64
          border-r border-sidebar-border bg-sidebar-bg
          transition-transform duration-200 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="flex h-16 items-center justify-between px-6">
            <Link
              href={`/${orgSlug}`}
              prefetch={true}
              className="text-xl font-bold font-header text-foreground hover:text-primary transition-colors lowercase"
              onClick={closeSidebar}
            >
              oncore
            </Link>
            {/* Close button on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={closeSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {/* Day View - Most recently accessed show's day view */}
            {dayViewNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={closeSidebar}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2
                    text-base font-medium transition-colors
                    ${
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {show?.title && (
                      <span className="text-xs text-muted-foreground/60 truncate">
                        {show.title}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}

            {/* Main Navigation */}
            {navigation.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={closeSidebar}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2
                    text-base font-medium transition-colors
                    ${
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Mobile-only actions (visible when TopBar actions are hidden) */}
          <div className="lg:hidden border-t border-sidebar-border p-4 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2 h-auto font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                closeSidebar();
                toast.warning(
                  "Importing data is only available on desktop at this time!"
                );
              }}
            >
              <Upload className="h-5 w-5" />
              Import Data
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2 h-auto font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                closeSidebar();
                toast.warning("Artist filtering is only available on desktop!");
              }}
            >
              <Filter className="h-5 w-5" />
              Artist Filter
            </Button>
            <Link
              href={`/${orgSlug}/settings`}
              onClick={closeSidebar}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
