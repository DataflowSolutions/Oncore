"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronDown, ArrowLeft } from "lucide-react";

interface Show {
  id: string;
  title: string | null;
  date: string;
  venue: {
    name: string;
    city: string | null;
  } | null;
}

interface ClientShowSwitcherProps {
  orgSlug: string;
  currentShowId?: string;
  orgId: string;
}

export default function ClientShowSwitcher({ orgSlug, currentShowId, orgId }: ClientShowSwitcherProps) {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShows() {
      try {
        const response = await fetch(`/api/shows?orgId=${orgId}`);
        if (response.ok) {
          const data = await response.json();
          setShows(data);
        } else {
          console.error("Failed to fetch shows:", response.status, response.statusText);
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
  }, [orgId]);

  if (loading) {
    return (
      <div className="mb-6 border-b border-border pb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-24 mb-4"></div>
          <div className="p-3 bg-card/50 rounded-lg border border-border/50">
            <div className="h-5 bg-muted rounded w-32 mb-2"></div>
            <div className="h-4 bg-muted rounded w-24 mb-1"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!shows || shows.length === 0) {
    return null;
  }

  const currentShow = shows.find(show => show.id === currentShowId);

  return (
    <div className="mb-6 border-b border-border pb-6">
      {/* Back to Shows Link */}
      <Link
        href={`/${orgSlug}/shows`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors hover:bg-accent/40 px-2 py-1 rounded-md"
      >
        <ArrowLeft size={16} />
        Back to Shows
      </Link>

      {/* Current Show Display */}
      {currentShow && (
        <div className="mb-4 p-3 bg-card/50 rounded-lg border border-border/50">
          <h3 className="text-base font-semibold text-foreground mb-2">
            {currentShow.title || "Untitled Show"}
          </h3>
          {currentShow.venue && (
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar size={14} />
              {currentShow.venue.name}
              {currentShow.venue.city && `, ${currentShow.venue.city}`}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {new Date(currentShow.date).toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
        </div>
      )}

      {/* Quick Show Switcher */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none p-2 hover:bg-accent/40 rounded-md">
          <Calendar size={16} />
          Switch Show
          <ChevronDown 
            size={16} 
            className="transition-transform group-open:rotate-180 ml-auto" 
          />
        </summary>
        
        <div className="mt-2 space-y-1 max-h-64 overflow-y-auto bg-card/30 rounded-md border border-border/50 p-2">
          {shows.map((show) => (
            <Link
              key={show.id}
              href={`/${orgSlug}/shows/${show.id}`}
              className={`
                block px-3 py-3 rounded-md text-sm transition-all duration-200 border
                ${show.id === currentShowId 
                  ? "bg-foreground text-background shadow-sm border-foreground/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60 border-transparent hover:border-border"
                }
              `}
            >
              <div className="font-medium text-sm mb-1">{show.title || "Untitled Show"}</div>
              {show.venue && (
                <div className="text-xs opacity-75 mb-1">
                  {show.venue.name}
                  {show.venue.city && `, ${show.venue.city}`}
                </div>
              )}
              <div className="text-xs opacity-75">
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
  );
}