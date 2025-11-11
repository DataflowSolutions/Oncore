"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Users,
  MapPin,
  Settings,
  Menu,
  X,
  ClipboardList,
  Eye,
  UserCircle,
  FileText,
  Check,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { ShowWithVenue } from "@/lib/actions/shows";

interface SidebarProps {
  orgSlug: string;
  userRole: string;
}

const STORAGE_KEY = "oncore_last_show";

export function Sidebar({ orgSlug, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [lastShowId, setLastShowId] = useState<string | null>(null);
  const [showSwitcherOpen, setShowSwitcherOpen] = useState(false);

  // Extract showId from current URL
  const currentShowId = useMemo(() => {
    const showMatch = pathname?.match(new RegExp(`/${orgSlug}/shows/([^/]+)`));
    return showMatch ? showMatch[1] : null;
  }, [pathname, orgSlug]);

  // Load last show from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.orgSlug === orgSlug && parsed.showId) {
          setLastShowId(parsed.showId);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [orgSlug]);

  // Update localStorage when navigating to a show page
  useEffect(() => {
    if (currentShowId) {
      setLastShowId(currentShowId);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          orgSlug,
          showId: currentShowId,
        })
      );
    }
  }, [currentShowId, orgSlug]);

  // Use lastShowId for sub-nav (persists across navigation)
  const showId = lastShowId;

  // Fetch show data - will use prefetched/cached data when available
  const { data: show } = useQuery({
    queryKey: queryKeys.show(showId!),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/shows/${showId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!showId, // Only run if we have a showId
    staleTime: 5 * 60 * 1000, // 5 minutes - show metadata rarely changes
  });

  // Fetch all shows for the switcher dropdown
  const { data: allShows = [] } = useQuery<ShowWithVenue[]>({
    queryKey: queryKeys.shows(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/shows`);
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const navigation = [
    { name: "Shows", href: `/${orgSlug}/shows`, icon: Calendar },
    { name: "People", href: `/${orgSlug}/people`, icon: Users },
    { name: "Venues", href: `/${orgSlug}/venues`, icon: MapPin },
    { name: "Settings", href: `/${orgSlug}/profile`, icon: Settings },
  ];

  // Day view navigation - shown if we have a last visited show (even when not on show page)
  const dayViewNav = showId
    ? [
        {
          name: "Day View",
          href: `/${orgSlug}/shows/${showId}/day`,
          icon: ClipboardList,
        },
      ]
    : [];

  // Show sub-navigation - shown when on a show page (currentShowId exists)
  const showSubNav = currentShowId
    ? [
        {
          name: "Overview",
          href: `/${orgSlug}/shows/${currentShowId}`,
          icon: Eye,
          exact: true,
        },
        {
          name: "Day Schedule",
          href: `/${orgSlug}/shows/${currentShowId}/day`,
          icon: ClipboardList,
        },
        {
          name: "Team",
          href: `/${orgSlug}/shows/${currentShowId}/team`,
          icon: UserCircle,
        },
        {
          name: "Advancing",
          href: `/${orgSlug}/shows/${currentShowId}/advancing`,
          icon: FileText,
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
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64
          border-r border-border bg-card
          transition-transform duration-200 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="flex h-16 items-center px-6">
            <Link
              href={`/${orgSlug}`}
              prefetch={true}
              className="text-xl font-bold text-foreground hover:text-primary transition-colors lowercase"
              style={{ fontFamily: "var(--font-logo, sans-serif)" }}
              onClick={() => setIsMobileOpen(false)}
            >
              oncore
            </Link>
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
                  onClick={() => setIsMobileOpen(false)}
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
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsMobileOpen(false)}
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

            {/* Show Sub-Navigation - appears when on a show page */}
            {showSubNav.length > 0 && (
              <div className="pt-4 mt-4 border-t border-border">
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Current Show
                  </h3>

                  {/* Show Switcher Dropdown */}
                  <Popover
                    open={showSwitcherOpen}
                    onOpenChange={setShowSwitcherOpen}
                  >
                    <PopoverTrigger asChild>
                      <button className="text-xs text-muted-foreground/60 mt-1 truncate hover:text-muted-foreground transition-colors text-left cursor-pointer">
                        {show?.title || "Select show..."}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0" align="start">
                      <div className="max-h-[300px] overflow-y-auto">
                        {/* Top 5 recent shows */}
                        {allShows.slice(0, 3).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              router.push(`/${orgSlug}/shows/${s.id}`);
                              setShowSwitcherOpen(false);
                              setIsMobileOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-start gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                              s.id === currentShowId && "bg-accent"
                            )}
                          >
                            {s.id === currentShowId && (
                              <Check className="h-4 w-4 shrink-0 mt-0.5" />
                            )}
                            <div
                              className={cn(
                                "flex flex-col",
                                s.id !== currentShowId && "ml-6"
                              )}
                            >
                              <span className="font-medium truncate">
                                {s.title}
                              </span>
                              {s.date && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(s.date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}

                        {/* View all shows button */}
                        {allShows.length > 0 && (
                          <>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => {
                                router.push(`/${orgSlug}/shows`);
                                setShowSwitcherOpen(false);
                                setIsMobileOpen(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              View all shows
                            </button>
                          </>
                        )}

                        {allShows.length === 0 && (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                            No shows found
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {showSubNav.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setIsMobileOpen(false)}
                      className={`
                        flex items-center gap-3 rounded-lg px-3 py-2
                        text-sm font-medium transition-colors
                        ${
                          active
                            ? "bg-accent text-foreground border-l-2 border-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <div className="text-xs text-muted-foreground">
              Role:{" "}
              <span className="font-medium text-foreground">{userRole}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
