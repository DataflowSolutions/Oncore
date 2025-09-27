import React from "react";
import Link from "next/link";
import { Calendar, ChevronDown, ArrowLeft } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase/server";

interface ShowSwitcherProps {
  orgSlug: string;
  currentShowId?: string;
  orgId: string;
}

export default async function ShowSwitcher({ orgSlug, currentShowId, orgId }: ShowSwitcherProps) {
  const supabase = await getSupabaseServer();

  // Get recent shows (sorted by date, with recent first)
  const { data: shows } = await supabase
    .from("shows")
    .select(`
      id,
      title,
      date,
      venue:venues(name, city)
    `)
    .eq("org_id", orgId)
    .order("date", { ascending: false })
    .limit(10);

  if (!shows || shows.length === 0) {
    return null;
  }

  const currentShow = shows.find(show => show.id === currentShowId);

  return (
    <div className="mb-6">
      {/* Back to Shows Link */}
      <Link
        href={`/${orgSlug}/shows`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Shows
      </Link>

      {/* Current Show Display */}
      {currentShow && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {currentShow.title}
          </h3>
          {currentShow.venue && (
            <p className="text-sm text-muted-foreground">
              {currentShow.venue.name}
              {currentShow.venue.city && `, ${currentShow.venue.city}`}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {new Date(currentShow.date).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Quick Show Switcher */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none">
          <Calendar size={16} />
          Switch Show
          <ChevronDown 
            size={16} 
            className="transition-transform group-open:rotate-180" 
          />
        </summary>
        
        <div className="mt-2 ml-6 space-y-1 max-h-64 overflow-y-auto">
          {shows.map((show) => (
            <Link
              key={show.id}
              href={`/${orgSlug}/shows/${show.id}`}
              className={`
                block px-3 py-2 rounded-md text-sm transition-colors
                ${show.id === currentShowId 
                  ? "bg-foreground/10 text-foreground font-medium" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }
              `}
            >
              <div className="font-medium">{show.title}</div>
              {show.venue && (
                <div className="text-xs opacity-75">
                  {show.venue.name}
                  {show.venue.city && `, ${show.venue.city}`}
                </div>
              )}
              <div className="text-xs opacity-75">
                {new Date(show.date).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}