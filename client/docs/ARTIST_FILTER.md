# Artist Filter Implementation

## Overview

The artist filter is a global filter that allows users to filter data across the entire organization by specific artists. When artists are selected, only data related to those artists should be displayed throughout the application.

## Components Created

### 1. ArtistFilterContext (`lib/contexts/ArtistFilterContext.tsx`)

Provides global state management for artist filtering.

**Exports:**

- `ArtistFilterProvider` - Wrap your app with this provider
- `useArtistFilter()` - Hook to access and modify filter state

**State:**

- `selectedArtistIds: string[]` - Array of selected artist IDs
- `isFiltering: boolean` - True if any artists are selected

**Methods:**

- `toggleArtist(id: string)` - Toggle a single artist on/off
- `selectAll(artistIds: string[])` - Select all artists
- `clearAll()` - Clear all selections
- `setSelectedArtistIds(ids: string[])` - Set specific artist IDs

### 2. ArtistFilterDropdown (`components/navigation/ArtistFilterDropdown.tsx`)

The UI component that displays in the top navigation bar.

**Features:**

- Displays all artists from the people table where `member_type = "Artist"`
- Checkbox for each artist
- Select All / Clear All functionality
- Shows selected artists in the trigger button
- Truncates long names with ellipsis
- Highlights when actively filtering

### 3. useFilteredByArtist Hook (`lib/hooks/use-filtered-by-artist.ts`)

Helper hook to simplify using the filter in queries and components.

**Returns:**

- `shouldFilter: boolean` - True when filtering should be applied
- `selectedArtistIds: string[]` - Array of selected artist IDs
- `isFiltering: boolean` - True if any artists are selected

## How to Use in Your Components

### Example 1: Filtering a Supabase Query

```typescript
import { useFilteredByArtist } from "@/lib/hooks/use-filtered-by-artist";

export function useShows(orgId: string) {
  const { shouldFilter, selectedArtistIds } = useFilteredByArtist();

  return useQuery({
    queryKey: ["shows", orgId, shouldFilter, selectedArtistIds],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase.from("shows").select("*").eq("org_id", orgId);

      // Apply artist filter if active
      if (shouldFilter) {
        query = query.in("artist_id", selectedArtistIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

### Example 2: Filtering an API Route

```typescript
// In your API route handler
import { useFilteredByArtist } from "@/lib/hooks/use-filtered-by-artist";

export function MyComponent() {
  const { shouldFilter, selectedArtistIds } = useFilteredByArtist();

  const { data } = useQuery({
    queryKey: ["data", orgSlug, shouldFilter, selectedArtistIds],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (shouldFilter) {
        selectedArtistIds.forEach((id) => params.append("artist_id", id));
      }

      const response = await fetch(`/api/${orgSlug}/data?${params}`);
      return response.json();
    },
  });
}
```

### Example 3: Server-Side Filtering in API Routes

```typescript
// app/api/[org]/shows/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { org: string } }
) {
  const searchParams = request.nextUrl.searchParams;
  const artistIds = searchParams.getAll("artist_id");

  const supabase = createClient();
  let query = supabase.from("shows").select("*").eq("org_slug", params.org);

  // Apply artist filter if provided
  if (artistIds.length > 0) {
    query = query.in("artist_id", artistIds);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
```

### Example 4: Filtering Client-Side Data

```typescript
import { useFilteredByArtist } from "@/lib/hooks/use-filtered-by-artist";

export function ShowsList({ shows }: { shows: Show[] }) {
  const { shouldFilter, selectedArtistIds } = useFilteredByArtist();

  const filteredShows = React.useMemo(() => {
    if (!shouldFilter) return shows;

    return shows.filter((show) => selectedArtistIds.includes(show.artist_id));
  }, [shows, shouldFilter, selectedArtistIds]);

  return (
    <div>
      {filteredShows.map((show) => (
        <ShowCard key={show.id} show={show} />
      ))}
    </div>
  );
}
```

## Filter Behavior

- **Default State:** No artists selected = show ALL data
- **Filtering Active:** One or more artists selected = show ONLY data for those artists
- **All Selected:** When all artists are explicitly selected = treated as "show all"
- **Visual Indicator:** The dropdown button highlights when actively filtering specific artists

## Database Schema Requirements

The filter assumes your tables have an `artist_id` column (or similar) that references the `people.id` where `member_type = 'Artist'`.

If your table structure is different, adjust the filtering logic accordingly. Common patterns:

- Direct relationship: `shows.artist_id -> people.id`
- Through join table: `shows -> show_artists -> people`
- Multiple artists: Use array contains or join table queries

## Performance Considerations

1. **Include filter state in query keys** to ensure proper cache invalidation
2. **Apply filters server-side** when possible for better performance
3. **Use indexed columns** for artist_id lookups in your database
4. **Consider pagination** when filtering large datasets

## Testing

To test the filter:

1. Create multiple people with `member_type = "Artist"`
2. Create data associated with different artists
3. Use the dropdown to select specific artists
4. Verify that only data for selected artists appears across all pages
5. Clear selections and verify all data appears again

## Troubleshooting

**Filter not working:**

- Ensure `ArtistFilterProvider` is in your providers
- Check that `useFilteredByArtist` is called in your component
- Verify query keys include filter state
- Check console for errors

**Artists not showing in dropdown:**

- Verify people exist with `member_type = "Artist"`
- Check the API endpoint `/api/[org]/people` is working
- Ensure the user has permission to view people

**UI not updating:**

- Check that components are re-rendering when filter changes
- Verify query dependencies are correct
- Use React DevTools to inspect context values
