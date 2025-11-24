"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface ArtistFilterContextType {
  selectedArtistIds: string[];
  setSelectedArtistIds: (ids: string[]) => void;
  toggleArtist: (id: string) => void;
  selectAll: (artistIds: string[]) => void;
  clearAll: () => void;
  isFiltering: boolean;
}

const ArtistFilterContext = createContext<ArtistFilterContextType | undefined>(
  undefined
);

export function ArtistFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);

  const toggleArtist = useCallback((id: string) => {
    setSelectedArtistIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((artistId) => artistId !== id);
      }
      return [...prev, id];
    });
  }, []);

  const selectAll = useCallback((artistIds: string[]) => {
    setSelectedArtistIds(artistIds);
  }, []);

  const clearAll = useCallback(() => {
    setSelectedArtistIds([]);
  }, []);

  const isFiltering = selectedArtistIds.length > 0;

  return (
    <ArtistFilterContext.Provider
      value={{
        selectedArtistIds,
        setSelectedArtistIds,
        toggleArtist,
        selectAll,
        clearAll,
        isFiltering,
      }}
    >
      {children}
    </ArtistFilterContext.Provider>
  );
}

export function useArtistFilter() {
  const context = useContext(ArtistFilterContext);
  if (context === undefined) {
    throw new Error(
      "useArtistFilter must be used within an ArtistFilterProvider"
    );
  }
  return context;
}
