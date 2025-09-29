"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Users,
  FileText,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

interface Show {
  id: string;
  title: string | null;
  date: string;
  venue: {
    name: string;
    city: string | null;
  } | null;
}

interface MobileShowNavigationProps {
  orgSlug: string;
  showId: string;
  orgId: string;
}

export default function MobileShowNavigation({ orgSlug, showId, orgId }: MobileShowNavigationProps) {
  const pathname = usePathname();
  const [currentShow, setCurrentShow] = useState<Show | null>(null);
  const [recentShows, setRecentShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShows() {
      try {
        const response = await fetch(`/api/shows?orgId=${orgId}`);
        if (response.ok) {
          const shows: Show[] = await response.json();
          setRecentShows(shows);
          setCurrentShow(shows.find(show => show.id === showId) || null);
        }
      } catch (error) {
        console.error("Error fetching shows:", error);
      } finally {
        setLoading(false);
      }
    }

    if (orgId) {
      fetchShows();
    }
  }, [orgId, showId]);

  const showActions = [
    {
      id: "show-details",
      label: "Show Details",
      href: `/${orgSlug}/shows/${showId}`,
      icon: Calendar,
      color: "bg-blue-500",
      description: "View show info"
    },
    {
      id: "team",
      label: "Show Team",
      href: `/${orgSlug}/shows/${showId}/team`,
      icon: Users,
      color: "bg-green-500",
      description: "Manage team"
    },
    {
      id: "advancing",
      label: "Advancing",
      href: `/${orgSlug}/advancing?show=${showId}`,
      icon: FileText,
      color: "bg-orange-500",
      description: "Advance show"
    },
  ];

  if (loading) {
    return (
      <div className="lg:hidden p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded-lg"></div>
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="h-20 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 space-y-4">
        {/* Header - consistent with other mobile views */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">Oncore</h2>
          <p className="text-sm text-muted-foreground mt-1">Tour Management</p>
        </div>

        {/* Back Button */}
        <Link
          href={`/${orgSlug}/shows`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-accent/40 px-2 py-1 rounded-md active:scale-[0.98]"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Shows</span>
        </Link>

        {/* Current Show Card */}
        {currentShow && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
            <h2 className="text-lg font-bold text-foreground mb-2">
              {currentShow.title || "Untitled Show"}
            </h2>
            {currentShow.venue && (
              <p className="text-sm text-muted-foreground mb-1">
                📍 {currentShow.venue.name}
                {currentShow.venue.city && `, ${currentShow.venue.city}`}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              📅 {new Date(currentShow.date).toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        )}

        {/* Show Actions */}
        <div className="flex-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Show Pages
          </h3>
          
          <div className="space-y-1">
            {showActions.map((action) => {
              const Icon = action.icon;
              const isActive = pathname === action.href;
              
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 active:scale-[0.98]
                    ${isActive 
                      ? "bg-foreground text-background shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    }
                  `}
                >
                  <Icon size={18} />
                  <span className="font-medium">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Show Switcher */}
        {recentShows.length > 1 && (
          <div className="mt-6 pt-4 border-t border-border">
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-foreground p-3 bg-card hover:bg-accent/60 rounded-lg border border-border transition-colors list-none active:scale-95">
                <Calendar size={16} />
                Switch to Another Show
                <ChevronDown 
                  size={16} 
                  className="transition-transform group-open:rotate-180 ml-auto" 
                />
              </summary>
              
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {recentShows.filter(show => show.id !== showId).slice(0, 5).map((show) => (
                  <Link
                    key={show.id}
                    href={`/${orgSlug}/shows/${show.id}`}
                    className="block p-3 bg-card hover:bg-accent/60 rounded-lg border border-border transition-colors active:scale-95"
                  >
                    <div className="font-medium text-sm">{show.title || "Untitled Show"}</div>
                    {show.venue && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {show.venue.name}
                        {show.venue.city && `, ${show.venue.city}`}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(show.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </Link>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}