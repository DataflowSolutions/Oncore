"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useArtistFilter } from "@/lib/contexts/ArtistFilterContext";
import { usePeople } from "@/lib/hooks/use-people";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function ArtistFilterDropdown() {
  const params = useParams();
  const orgSlug = params?.org as string;

  const { selectedArtistIds, toggleArtist, selectAll, clearAll, isFiltering } =
    useArtistFilter();

  const { data: allPeople, isLoading } = usePeople(orgSlug);

  // Filter for artists only
  const artists = React.useMemo(() => {
    return (allPeople || []).filter(
      (person) => person.member_type === "Artist"
    );
  }, [allPeople]);

  const artistIds = React.useMemo(() => {
    return artists.map((a) => a.id);
  }, [artists]);

  const allSelected =
    selectedArtistIds.length === artists.length && artists.length > 0;

  const handleSelectAll = () => {
    selectAll(artistIds);
  };

  const handleClearAll = () => {
    clearAll();
  };

  // Generate display text for trigger button
  const getDisplayText = () => {
    if (!isFiltering || selectedArtistIds.length === 0) {
      return "All Artists";
    }

    if (allSelected) {
      return "All Artists";
    }

    const selectedArtists = artists.filter((a) =>
      selectedArtistIds.includes(a.id)
    );

    if (selectedArtists.length === 0) {
      return "All Artists";
    }

    if (selectedArtists.length === 1) {
      return selectedArtists[0].name;
    }

    const names = selectedArtists.map((a) => a.name).join(", ");

    // Truncate if too long
    if (names.length > 30) {
      return names.substring(0, 27) + "...";
    }

    return names;
  };

  // Generate selected artists text for dropdown header
  const getSelectedText = () => {
    const selectedArtists = artists.filter((a) =>
      selectedArtistIds.includes(a.id)
    );

    if (selectedArtists.length === 0) {
      return "None selected";
    }

    return selectedArtists.map((a) => a.name).join(", ");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 text-xs bg-transparent! dark:hover:bg-accent/50! hover:bg-accent/50! rounded-full border-foreground/65!",
            isFiltering &&
              selectedArtistIds.length > 0 &&
              selectedArtistIds.length < artists.length &&
              "text-foreground"
          )}
        >
          <span className="max-w-[120px] truncate">{getDisplayText()}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        {/* Header with "Selected" label */}
        <div className="px-3 py-2">
          <div className="text-xs text-muted-foreground mb-1">Selected</div>
          <div className="text-sm font-medium break-words">
            {getSelectedText()}
          </div>
        </div>

        {/* Select All and Clear buttons */}
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={handleSelectAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Select all
          </button>
          <button
            onClick={handleClearAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>

        <DropdownMenuSeparator />

        {/* Individual Artists with visible checkboxes */}
        <div className="max-h-[300px] overflow-y-auto px-2 py-1">
          {artists.length === 0 && !isLoading ? (
            <div className="px-2 py-2">
              <span className="text-xs text-muted-foreground">
                No artists found
              </span>
            </div>
          ) : (
            artists.map((artist) => (
              <label
                key={artist.id}
                className="flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selectedArtistIds.includes(artist.id)}
                  onCheckedChange={() => toggleArtist(artist.id)}
                />
                <span className="flex-1 text-sm break-words">
                  {artist.name}
                </span>
              </label>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
