"use client";

import { useState, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown, Plus, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePeople } from "@/lib/hooks/use-people";
import { createPerson } from "@/lib/actions/team";
import { logger } from "@/lib/logger";

interface Artist {
  id: string;
  name: string;
  member_type: string | null;
}

interface ArtistSelectorProps {
  orgSlug: string;
  orgId: string;
  value?: string; // Artist ID
  onValueChange: (artistId: string, artistName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ArtistSelector({
  orgSlug,
  orgId,
  value,
  onValueChange,
  placeholder = "Select an artist...",
  disabled = false,
}: ArtistSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: allPeople, isLoading, refetch } = usePeople(orgSlug);

  // Filter for artists only
  const artists = useMemo(() => {
    return (allPeople || []).filter(
      (person) => person.member_type === "Artist"
    ) as Artist[];
  }, [allPeople]);

  // Get the selected artist name for display
  const selectedArtist = useMemo(() => {
    return artists.find((artist) => artist.id === value);
  }, [artists, value]);

  // Filter artists based on search query
  const filteredArtists = useMemo(() => {
    if (!searchQuery) return artists;
    const query = searchQuery.toLowerCase().trim();
    return artists.filter((artist) =>
      artist.name.toLowerCase().includes(query)
    );
  }, [artists, searchQuery]);

  // Check if the search query exactly matches an existing artist
  const exactMatchExists = useMemo(() => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().trim();
    return artists.some((artist) => artist.name.toLowerCase() === query);
  }, [artists, searchQuery]);

  // Handle creating a new artist
  const handleCreateArtist = useCallback(async () => {
    if (!searchQuery.trim() || exactMatchExists) return;

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append("orgId", orgId);
      formData.append("name", searchQuery.trim());
      formData.append("memberType", "artist");

      const result = await createPerson(formData);

      // Refetch artists list
      await refetch();

      // Select the newly created artist
      if (result && result.id) {
        onValueChange(result.id, result.name);
      }

      setSearchQuery("");
      setOpen(false);
    } catch (error) {
      logger.error("Error creating artist", error);
    } finally {
      setIsCreating(false);
    }
  }, [searchQuery, exactMatchExists, orgId, refetch, onValueChange]);

  const handleSelect = useCallback(
    (artist: Artist) => {
      onValueChange(artist.id, artist.name);
      setSearchQuery("");
      setOpen(false);
    },
    [onValueChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between font-normal"
        >
          {isLoading ? (
            <span className="text-muted-foreground">Loading artists...</span>
          ) : selectedArtist ? (
            <span>{selectedArtist.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                <p className="mt-2 text-muted-foreground">Loading artists...</p>
              </div>
            ) : filteredArtists.length === 0 && !searchQuery ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No artists found. Start typing to create one.
              </div>
            ) : filteredArtists.length === 0 && searchQuery ? (
              <div className="py-2 text-center text-sm text-muted-foreground">
                No artists match &quot;{searchQuery}&quot;
              </div>
            ) : (
              <CommandGroup>
                {filteredArtists.map((artist) => (
                  <CommandItem
                    key={artist.id}
                    value={artist.id}
                    onSelect={() => handleSelect(artist)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === artist.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {artist.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Create new artist option */}
            {searchQuery && !exactMatchExists && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateArtist}
                    disabled={isCreating}
                    className="cursor-pointer"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating &quot;{searchQuery}&quot;...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create &quot;{searchQuery}&quot; as new artist
                      </>
                    )}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
