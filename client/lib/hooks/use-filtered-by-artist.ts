"use client";

import { useArtistFilter } from "@/lib/contexts/ArtistFilterContext";

/**
 * Hook to determine if data should be filtered by selected artists
 * and get the list of selected artist IDs for use in queries.
 *
 * @returns Object containing:
 *  - shouldFilter: boolean - true if filtering is active (specific artists selected)
 *  - selectedArtistIds: string[] - array of selected artist IDs
 *  - isFiltering: boolean - true if any artists are selected
 *
 * @example
 * // In a component or hook that needs to filter by artist
 * const { shouldFilter, selectedArtistIds } = useFilteredByArtist();
 *
 * // In a query
 * const { data } = useQuery({
 *   queryKey: ['shows', orgId, shouldFilter, selectedArtistIds],
 *   queryFn: async () => {
 *     let query = supabase.from('shows').select('*');
 *
 *     if (shouldFilter) {
 *       // Filter to only shows where the artist is one of the selected artists
 *       query = query.in('artist_id', selectedArtistIds);
 *     }
 *
 *     const { data, error } = await query;
 *     if (error) throw error;
 *     return data;
 *   }
 * });
 */
export function useFilteredByArtist() {
  const { selectedArtistIds, isFiltering } = useArtistFilter();

  // Only filter if specific artists are selected (not empty, which means "show all")
  const shouldFilter = isFiltering && selectedArtistIds.length > 0;

  return {
    shouldFilter,
    selectedArtistIds,
    isFiltering,
  };
}
