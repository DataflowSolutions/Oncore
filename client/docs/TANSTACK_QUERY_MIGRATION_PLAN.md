# TanStack Query Migration Plan - From RSC to Hybrid Client Architecture

## 📋 Overview

**Goal**: Migrate from React Server Components (RSC) with per-navigation server round-trips to a hybrid Client Components + TanStack Query architecture with instant navigation, background refetching, and optimistic updates.

**Current State**:
- ✅ Server Components everywhere (`page.tsx` files)
- ✅ Server Actions for mutations (`lib/actions/`)
- ✅ React `cache()` for request deduplication
- ✅ `revalidate: 30` for ISR caching
- ❌ Every navigation triggers full server render
- ❌ No client-side caching between routes
- ❌ Data not persisted in memory during navigation

**Target State**:
- ✅ Client Components with TanStack Query
- ✅ API Routes for data fetching
- ✅ Client-side cache persists across navigation
- ✅ Instant navigation with stale-while-revalidate
- ✅ Optimistic updates for mutations
- ✅ Background refetching
- ✅ Server-side rendering with prefetching + hydration

---

## 🎯 Phase 1: Setup & Infrastructure (Days 1-2)

### Task 1.1: Install TanStack Query Dependencies
**File**: `client/package.json`

```bash
# Already installed - verify versions
@tanstack/react-query: ^5.90.7
@tanstack/react-query-devtools: ^5.90.2
```

**Status**: ✅ Already complete

---

### Task 1.2: Create QueryClient Provider Setup
**File**: `client/app/providers.tsx`

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

**Details**:
- Use React state to create QueryClient once per session
- Configure sensible defaults:
  - `staleTime: 60s` - Data fresh for 1 minute before background refetch
  - `gcTime: 5min` - Keep unused data in cache for 5 minutes
  - `refetchOnWindowFocus: false` - Don't refetch when user returns to tab (can enable per-query)
  - `retry: 1` - Retry failed queries once

---

### Task 1.3: Wire Up Provider in Root Layout
**File**: `client/app/layout.tsx`

```tsx
import { Providers } from '@/app/providers'
// ... other imports

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Providers>  {/* Add this wrapper */}
            {children}
            <Toaster richColors position="top-right" />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

### Task 1.4: Create API Route Structure
**New Files**:
- `client/app/api/[org]/shows/route.ts`
- `client/app/api/[org]/shows/[showId]/route.ts`
- `client/app/api/[org]/people/route.ts`
- `client/app/api/[org]/venues/route.ts`

**Example**: `client/app/api/[org]/shows/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getCachedOrg, getCachedOrgShows } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string }> }
) {
  try {
    const { org: orgSlug } = await params
    
    // Verify authentication
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get org and verify access
    const { data: org, error: orgError } = await getCachedOrg(orgSlug)
    
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Fetch shows
    const { data: shows, error } = await getCachedOrgShows(org.id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shows: shows || [] })
  } catch (error) {
    console.error('Error fetching shows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Why API Routes?**
- Keep using existing `cache()` helpers - no rewriting needed
- Server-side authentication and RLS enforcement
- Clean separation of data fetching from UI
- Can be called from both server (prefetch) and client (TanStack Query)

---

### Task 1.5: Create Query Keys Constants
**File**: `client/lib/query-keys.ts`

```ts
/**
 * Centralized query keys for TanStack Query
 * Pattern: ['resource', 'action', ...params]
 */

export const queryKeys = {
  // Organizations
  org: (orgSlug: string) => ['org', orgSlug] as const,
  orgMembership: (orgSlug: string, userId: string) => ['org', orgSlug, 'membership', userId] as const,
  
  // Shows
  shows: (orgSlug: string) => ['shows', orgSlug] as const,
  show: (showId: string) => ['show', showId] as const,
  showSchedule: (showId: string) => ['show', showId, 'schedule'] as const,
  showTeam: (showId: string) => ['show', showId, 'team'] as const,
  
  // People
  people: (orgSlug: string) => ['people', orgSlug] as const,
  peopleFull: (orgSlug: string) => ['people', orgSlug, 'full'] as const,
  peopleByType: (orgSlug: string, type: string) => ['people', orgSlug, 'type', type] as const,
  
  // Venues
  venues: (orgSlug: string) => ['venues', orgSlug] as const,
  venue: (venueId: string) => ['venue', venueId] as const,
  venuesWithCounts: (orgSlug: string) => ['venues', orgSlug, 'counts'] as const,
  
  // Invitations
  invitations: (orgSlug: string) => ['invitations', orgSlug] as const,
  
  // Subscription/billing
  seats: (orgSlug: string) => ['seats', orgSlug] as const,
} as const

/**
 * Invalidation helpers - invalidate related queries when data changes
 */
export const invalidationKeys = {
  // When a show is mutated, invalidate:
  show: (showId: string, orgSlug: string) => [
    queryKeys.show(showId),
    queryKeys.shows(orgSlug),
    queryKeys.showSchedule(showId),
    queryKeys.showTeam(showId),
  ],
  
  // When a person is mutated, invalidate:
  person: (orgSlug: string) => [
    queryKeys.people(orgSlug),
    queryKeys.peopleFull(orgSlug),
    queryKeys.seats(orgSlug),
  ],
  
  // When a venue is mutated, invalidate:
  venue: (venueId: string, orgSlug: string) => [
    queryKeys.venue(venueId),
    queryKeys.venues(orgSlug),
    queryKeys.venuesWithCounts(orgSlug),
  ],
}
```

**Key Design Principles**:
- Hierarchical structure: `['resource', 'id', 'sub-resource']`
- Use `as const` for type safety
- Centralized - never hardcode query keys in components
- Invalidation helpers for related data updates

---

## 🔄 Phase 2: Create Custom Hooks (Days 3-4)

### Task 2.1: Create Base Query Hooks
**File**: `client/lib/hooks/use-shows.ts`

```ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, invalidationKeys } from '@/lib/query-keys'
import { createClient } from '@/lib/supabase/client'
import { updateShow } from '@/lib/actions/shows'

interface ShowWithVenue {
  // ... your existing type
}

/**
 * Fetch all shows for an organization
 * Uses: Shows list page
 * Caching: 1 minute stale time, refetch in background
 */
export function useShows(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.shows(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/shows`)
      if (!response.ok) {
        throw new Error('Failed to fetch shows')
      }
      const data = await response.json()
      return data.shows as ShowWithVenue[]
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch single show details
 * Uses: Show detail page
 * Caching: 30 seconds stale time (more dynamic data)
 */
export function useShow(showId: string) {
  return useQuery({
    queryKey: queryKeys.show(showId),
    queryFn: async () => {
      const response = await fetch(`/api/shows/${showId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch show')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Update show with optimistic update
 * Uses: Editable fields throughout show pages
 */
export function useUpdateShow(orgSlug: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ showId, updates }: { showId: string; updates: any }) => {
      return await updateShow(showId, updates)
    },
    
    // Optimistic update - update UI immediately
    onMutate: async ({ showId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.show(showId) })
      
      // Snapshot current value
      const previousShow = queryClient.getQueryData(queryKeys.show(showId))
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.show(showId), (old: any) => ({
        ...old,
        ...updates,
      }))
      
      // Return context with previous value
      return { previousShow, showId }
    },
    
    // On error, rollback to previous value
    onError: (err, variables, context) => {
      if (context?.previousShow) {
        queryClient.setQueryData(
          queryKeys.show(context.showId),
          context.previousShow
        )
      }
    },
    
    // Always refetch after mutation (success or error)
    onSettled: (data, error, { showId }) => {
      // Invalidate related queries
      invalidationKeys.show(showId, orgSlug).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}
```

---

### Task 2.2: Create People/Team Hooks
**File**: `client/lib/hooks/use-people.ts`

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export function usePeople(orgSlug: string, filter?: string) {
  return useQuery({
    queryKey: filter 
      ? queryKeys.peopleByType(orgSlug, filter)
      : queryKeys.peopleFull(orgSlug),
    queryFn: async () => {
      const url = filter 
        ? `/api/${orgSlug}/people?filter=${filter}`
        : `/api/${orgSlug}/people`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch people')
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (less frequently changing)
  })
}

export function useInvitations(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.invitations(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/invitations`)
      if (!response.ok) throw new Error('Failed to fetch invitations')
      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useAvailableSeats(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.seats(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/seats`)
      if (!response.ok) throw new Error('Failed to fetch seat info')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (rarely changes)
  })
}
```

---

### Task 2.3: Create Venues Hooks
**File**: `client/lib/hooks/use-venues.ts`

```ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, invalidationKeys } from '@/lib/query-keys'

export function useVenues(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.venues(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/venues`)
      if (!response.ok) throw new Error('Failed to fetch venues')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (venues change rarely)
  })
}

export function useVenuesWithCounts(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.venuesWithCounts(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/venues?includeCounts=true`)
      if (!response.ok) throw new Error('Failed to fetch venues')
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
```

---

## 🎨 Phase 3: Migrate Pages to Client Components (Days 5-8)

### Task 3.1: Migrate Shows List Page

**Before**: `client/app/(app)/[org]/shows/page.tsx` (Server Component)

```tsx
export const revalidate = 30;
export const dynamic = 'force-dynamic'

export default async function ShowsPage({ params, searchParams }) {
  const { org: orgSlug } = await params;
  const { view = "list" } = await searchParams;
  
  const { getCachedOrg, getCachedOrgShows } = await import('@/lib/cache');
  const { data: org, error } = await getCachedOrg(orgSlug)
  const { data: shows } = await getCachedOrgShows(org.id)

  return (
    <div>
      <ShowsClient shows={shows || []} orgSlug={orgSlug} view={view} />
    </div>
  );
}
```

**After**: `client/app/(app)/[org]/shows/page.tsx` (Hybrid with Prefetching)

```tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ShowsPageClient } from './shows-page-client'
import { getCachedOrg, getCachedOrgShows } from '@/lib/cache'

// Server Component - prefetches data for instant load
export default async function ShowsPage({ 
  params, 
  searchParams 
}: {
  params: Promise<{ org: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { org: orgSlug } = await params
  const { view = 'list' } = await searchParams
  
  // Create a server-side QueryClient for prefetching
  const queryClient = new QueryClient()
  
  // Prefetch shows data on the server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.shows(orgSlug),
    queryFn: async () => {
      const { data: org } = await getCachedOrg(orgSlug)
      if (!org) return []
      const { data: shows } = await getCachedOrgShows(org.id)
      return shows || []
    },
  })
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShowsPageClient orgSlug={orgSlug} view={view} />
    </HydrationBoundary>
  )
}
```

**New File**: `client/app/(app)/[org]/shows/shows-page-client.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useShows } from '@/lib/hooks/use-shows'
import CreateShowButton from './components/CreateShowButton'
import ImportDataButton from './components/ImportDataButton'
import ShowsClient from './components/ShowsClient'
import { Skeleton } from '@/components/ui/skeleton'

export function ShowsPageClient({ 
  orgSlug, 
  view 
}: { 
  orgSlug: string
  view: string 
}) {
  // This will use the prefetched data on initial load (instant!)
  // Then automatically refetch in background after staleTime
  const { data: shows, isLoading, error } = useShows(orgSlug)
  
  if (error) {
    return <div>Error loading shows: {error.message}</div>
  }
  
  // Show loading skeleton only on initial load without prefetch
  if (isLoading && !shows) {
    return <ShowsListSkeleton />
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">Shows</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tour schedule
          </p>
        </div>
        <div className="flex gap-3">
          <ImportDataButton orgSlug={orgSlug} />
          <CreateShowButton orgSlug={orgSlug} />
        </div>
      </div>

      <ShowsClient 
        shows={shows || []} 
        orgSlug={orgSlug} 
        view={view} 
      />
    </div>
  )
}

function ShowsListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
```

**Key Changes**:
1. ✅ Server Component prefetches data → instant first load
2. ✅ Client Component uses hook → reactive updates
3. ✅ HydrationBoundary passes server data to client
4. ✅ No loading spinner on initial load (data already there)
5. ✅ Automatic background refetch after 1 minute
6. ✅ Navigation between shows list and detail is instant (cached!)

---

### Task 3.2: Migrate Show Detail Page

**File**: `client/app/(app)/[org]/shows/[showId]/page.tsx`

```tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ShowDetailClient } from './show-detail-client'
import { getCachedOrg, getCachedShow, getCachedShowSchedule } from '@/lib/cache'
import { getShowTeam } from '@/lib/actions/show-team'

export default async function ShowDetailPage({
  params
}: {
  params: Promise<{ org: string, showId: string }>
}) {
  const { org: orgSlug, showId } = await params
  
  const queryClient = new QueryClient()
  
  // Prefetch all data in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.show(showId),
      queryFn: async () => {
        const { data } = await getCachedShow(showId)
        return data
      },
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.showSchedule(showId),
      queryFn: async () => {
        const { data } = await getCachedShowSchedule(showId)
        return data || []
      },
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.showTeam(showId),
      queryFn: async () => {
        return await getShowTeam(showId)
      },
    }),
  ])
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShowDetailClient orgSlug={orgSlug} showId={showId} />
    </HydrationBoundary>
  )
}
```

**New File**: `client/app/(app)/[org]/shows/[showId]/show-detail-client.tsx`

```tsx
'use client'

import { useShow, useUpdateShow } from '@/lib/hooks/use-shows'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { EditableTitle } from '@/components/shows/EditableShowFields'
// ... other imports

export function ShowDetailClient({ 
  orgSlug, 
  showId 
}: { 
  orgSlug: string
  showId: string 
}) {
  // All queries use prefetched data - instant load!
  const { data: show } = useShow(showId)
  const { data: schedule } = useQuery({
    queryKey: queryKeys.showSchedule(showId),
    queryFn: async () => {
      const response = await fetch(`/api/shows/${showId}/schedule`)
      return response.json()
    },
  })
  const { data: team } = useQuery({
    queryKey: queryKeys.showTeam(showId),
    queryFn: async () => {
      const response = await fetch(`/api/shows/${showId}/team`)
      return response.json()
    },
  })
  
  const updateShowMutation = useUpdateShow(orgSlug)
  
  if (!show) return null
  
  return (
    <div className="space-y-8">
      {/* Editable fields with optimistic updates */}
      <EditableTitle 
        showId={showId}
        currentValue={show.title}
        onUpdate={(title) => {
          updateShowMutation.mutate({ 
            showId, 
            updates: { title } 
          })
        }}
      />
      
      {/* ... rest of UI */}
    </div>
  )
}
```

**Benefits**:
- ✅ Instant page load (prefetched)
- ✅ Instant navigation back to list (cached!)
- ✅ Optimistic updates feel instant
- ✅ Background refetch keeps data fresh

---

### Task 3.3: Migrate People Page

**File**: `client/app/(app)/[org]/people/page.tsx`

```tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { PeoplePageClient } from './people-page-client'
import { getCachedOrgPeopleFull } from '@/lib/cache'

export default async function PeoplePage({ 
  params, 
  searchParams 
}: {
  params: Promise<{ org: string }>
  searchParams: Promise<{ filter?: string }>
}) {
  const { org: orgSlug } = await params
  const { filter } = await searchParams
  
  const queryClient = new QueryClient()
  
  // Prefetch people data
  await queryClient.prefetchQuery({
    queryKey: filter 
      ? queryKeys.peopleByType(orgSlug, filter)
      : queryKeys.peopleFull(orgSlug),
    queryFn: async () => {
      // Use existing cache helper
      const { data: org } = await getCachedOrg(orgSlug)
      if (!org) return []
      const { data } = await getCachedOrgPeopleFull(org.id)
      return filter 
        ? data?.filter(p => p.member_type?.toLowerCase() === filter.toLowerCase())
        : data || []
    },
  })
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PeoplePageClient orgSlug={orgSlug} filter={filter} />
    </HydrationBoundary>
  )
}
```

**Pattern**: Same as shows - server prefetch + client component

---

## ⚡ Phase 4: Optimize Mutations & Interactions (Days 9-10)

### Task 4.1: Add Optimistic Updates to Editable Fields

**File**: `client/components/shows/EditableShowFields.tsx`

```tsx
'use client'

import { useUpdateShow } from '@/lib/hooks/use-shows'
import { useState } from 'react'

export function EditableTitle({ 
  showId, 
  currentValue,
  orgSlug 
}: { 
  showId: string
  currentValue: string
  orgSlug: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const updateShow = useUpdateShow(orgSlug)
  
  const handleSave = async (newValue: string) => {
    // This triggers optimistic update - UI updates immediately!
    await updateShow.mutateAsync({
      showId,
      updates: { title: newValue }
    })
    setIsEditing(false)
  }
  
  return (
    <div>
      {/* EditableText component */}
      {updateShow.isPending && <span>Saving...</span>}
      {updateShow.isError && <span>Error: {updateShow.error.message}</span>}
    </div>
  )
}
```

**Experience**:
1. User edits title
2. UI updates **instantly** (optimistic)
3. Small "Saving..." indicator
4. If save fails, rollback with error message
5. On success, background refetch confirms data

---

### Task 4.2: Add Optimistic Delete

**File**: `client/lib/hooks/use-shows.ts`

```ts
export function useDeleteShow(orgSlug: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (showId: string) => {
      const response = await fetch(`/api/shows/${showId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete show')
      return response.json()
    },
    
    // Optimistic delete
    onMutate: async (showId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shows(orgSlug) })
      
      const previousShows = queryClient.getQueryData(queryKeys.shows(orgSlug))
      
      // Remove show from list immediately
      queryClient.setQueryData(
        queryKeys.shows(orgSlug),
        (old: any[]) => old?.filter(show => show.id !== showId) || []
      )
      
      return { previousShows }
    },
    
    onError: (err, showId, context) => {
      // Rollback on error
      if (context?.previousShows) {
        queryClient.setQueryData(queryKeys.shows(orgSlug), context.previousShows)
      }
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shows(orgSlug) })
    },
  })
}
```

---

### Task 4.3: Add Prefetch on Link Hover

**File**: `client/app/(app)/[org]/shows/components/ShowsTable.tsx`

```tsx
'use client'

import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import Link from 'next/link'

export default function ShowsTable({ shows, orgSlug }) {
  const queryClient = useQueryClient()
  
  const handleShowHover = (showId: string) => {
    // Prefetch show details when user hovers - instant click!
    queryClient.prefetchQuery({
      queryKey: queryKeys.show(showId),
      queryFn: async () => {
        const response = await fetch(`/api/shows/${showId}`)
        return response.json()
      },
    })
  }
  
  return (
    <div>
      {shows.map(show => (
        <Link 
          key={show.id}
          href={`/${orgSlug}/shows/${show.id}`}
          onMouseEnter={() => handleShowHover(show.id)}
          onTouchStart={() => handleShowHover(show.id)}
        >
          {show.title}
        </Link>
      ))}
    </div>
  )
}
```

**Experience**: Hover over a show → detail page prefetches → click feels instant!

---

## 🚀 Phase 5: Advanced Patterns (Days 11-12)

### Task 5.1: Add Background Polling for Real-Time Updates

**Use Case**: Show schedule being edited by multiple users

```tsx
export function useShowSchedule(showId: string, options?: { realtime?: boolean }) {
  return useQuery({
    queryKey: queryKeys.showSchedule(showId),
    queryFn: async () => {
      const response = await fetch(`/api/shows/${showId}/schedule`)
      return response.json()
    },
    staleTime: 30 * 1000,
    
    // Poll every 10 seconds if realtime enabled
    refetchInterval: options?.realtime ? 10 * 1000 : false,
    refetchIntervalInBackground: true, // Continue even when tab inactive
  })
}
```

---

### Task 5.2: Add Infinite Scroll for Large Lists

**Use Case**: Shows list with 100+ shows

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'

export function useShowsInfinite(orgSlug: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.shows(orgSlug),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        `/api/${orgSlug}/shows?page=${pageParam}&limit=20`
      )
      return response.json()
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length : undefined
    },
  })
}
```

---

### Task 5.3: Add Dependent Queries

**Use Case**: Fetch venues after org loads

```tsx
export function useOrgWithVenues(orgSlug: string) {
  const { data: org } = useQuery({
    queryKey: queryKeys.org(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}`)
      return response.json()
    },
  })
  
  // Only fetch venues after org is loaded
  const { data: venues } = useQuery({
    queryKey: queryKeys.venues(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/venues`)
      return response.json()
    },
    enabled: !!org, // Don't run until org exists
  })
  
  return { org, venues }
}
```

---

## 📊 Phase 6: Monitoring & Optimization (Days 13-14)

### Task 6.1: Add React Query Devtools (Already Done!)

```tsx
// Already in providers.tsx
<ReactQueryDevtools initialIsOpen={false} />
```

**Usage**:
- Open devtools (floating button in dev mode)
- See all active queries
- Inspect cache contents
- See query status (fetching, stale, fresh)
- Manually trigger refetch
- Clear cache

---

### Task 6.2: Add Performance Monitoring

**File**: `client/lib/query-client.ts`

```ts
import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        
        // Log slow queries
        meta: {
          onSuccess: (data: any) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('Query success:', data)
            }
          },
        },
      },
      mutations: {
        meta: {
          onSuccess: () => {
            console.log('Mutation success')
          },
        },
      },
    },
    
    // Global error handler
    defaultOptions: {
      queries: {
        onError: (error) => {
          console.error('Query error:', error)
          // Send to error tracking (Sentry, etc.)
        },
      },
      mutations: {
        onError: (error) => {
          console.error('Mutation error:', error)
          // Show toast notification
        },
      },
    },
  })
}
```

---

### Task 6.3: Optimize Bundle Size

**Check**: Only import what you need

```tsx
// ❌ Bad - imports everything
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query'

// ✅ Good - tree-shakeable
import { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
```

**Note**: TanStack Query is already well tree-shaken, this is just best practice.

---

## 📋 Migration Checklist by Route

### Core Pages (Priority 1)
- [ ] `/[org]/shows` - Shows list
- [ ] `/[org]/shows/[showId]` - Show detail
- [ ] `/[org]/people` - Team/people list
- [ ] `/[org]/venues` - Venues list
- [ ] `/` - Home page (organizations)

### Secondary Pages (Priority 2)
- [ ] `/[org]/shows/[showId]/day` - Day schedule
- [ ] `/[org]/shows/[showId]/team` - Show team
- [ ] `/[org]/shows/[showId]/advancing` - Advancing
- [ ] `/[org]/venues/[venueId]` - Venue detail
- [ ] `/[org]/settings` - Settings

### Components (Priority 3)
- [ ] `EditableTitle` - Optimistic update
- [ ] `EditableDate` - Optimistic update
- [ ] `EditableTime` - Optimistic update
- [ ] `EditableVenue` - Optimistic update
- [ ] `ShowsSearchbar` - Client-side filtering
- [ ] `ShowsTable` - Prefetch on hover
- [ ] `ShowsCalendar` - Client-side rendering

---

## 🎯 Stale Time Strategy by Data Type

| Data Type | Stale Time | Reasoning |
|-----------|-----------|-----------|
| Shows list | 60s | Changes moderately often |
| Show detail | 30s | Users editing fields frequently |
| People list | 2min | Changes infrequently |
| Venues list | 5min | Rarely changes |
| Invitations | 60s | Moderate activity |
| Seat availability | 5min | Only changes on billing updates |
| Organization info | 10min | Almost never changes |
| Schedule items | 30s | Updated during event day |

---

## 🔥 Quick Wins (Implement These First!)

### 1. Shows List → Detail Navigation (Biggest Impact)
**Before**: 2-3s server round-trip on every click  
**After**: Instant (cached + prefetched)

### 2. Editable Fields (Best UX Improvement)
**Before**: Click → spinner → page reload  
**After**: Type → instant update → subtle "Saving..." indicator

### 3. Search/Filters (Huge Improvement)
**Before**: Each filter = new server request  
**After**: Instant client-side filtering

---

## 🎨 File Structure After Migration

```
client/
├── app/
│   ├── providers.tsx ✨ (QueryClientProvider)
│   ├── layout.tsx (wrap with Providers)
│   ├── (app)/
│   │   └── [org]/
│   │       ├── shows/
│   │       │   ├── page.tsx (Server - prefetch)
│   │       │   ├── shows-page-client.tsx ✨ (Client)
│   │       │   └── [showId]/
│   │       │       ├── page.tsx (Server - prefetch)
│   │       │       └── show-detail-client.tsx ✨ (Client)
│   │       └── people/
│   │           ├── page.tsx (Server - prefetch)
│   │           └── people-page-client.tsx ✨ (Client)
│   └── api/ ✨ (New API routes)
│       └── [org]/
│           ├── shows/
│           │   ├── route.ts
│           │   └── [showId]/
│           │       ├── route.ts
│           │       ├── schedule/route.ts
│           │       └── team/route.ts
│           ├── people/route.ts
│           └── venues/route.ts
├── lib/
│   ├── hooks/ ✨
│   │   ├── use-shows.ts
│   │   ├── use-people.ts
│   │   └── use-venues.ts
│   ├── query-keys.ts ✨
│   ├── query-client.ts ✨
│   └── actions/ (Keep for now, gradually replace)
└── components/
    └── shows/
        ├── EditableShowFields.tsx (updated with optimistic)
        └── ShowsTable.tsx (added prefetch on hover)
```

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Creating New QueryClient on Every Render
```tsx
// ❌ Bad - creates new client every render
function Providers({ children }) {
  const queryClient = new QueryClient() // ❌
  return <QueryClientProvider client={queryClient}>...
}

// ✅ Good - stable client instance
function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient()) // ✅
  return <QueryClientProvider client={queryClient}>...
}
```

### Pitfall 2: Not Using Query Keys Consistently
```tsx
// ❌ Bad - typos, inconsistent structure
useQuery({ queryKey: ['show', showId] })
useQuery({ queryKey: ['shows', showId] }) // ❌ different key!

// ✅ Good - centralized keys
import { queryKeys } from '@/lib/query-keys'
useQuery({ queryKey: queryKeys.show(showId) }) // ✅
```

### Pitfall 3: Not Canceling Queries in Optimistic Updates
```tsx
// ❌ Bad - causes race conditions
onMutate: async () => {
  queryClient.setQueryData(...) // ❌ ongoing fetch might override this
}

// ✅ Good - cancel first
onMutate: async () => {
  await queryClient.cancelQueries({ queryKey }) // ✅ cancel first
  queryClient.setQueryData(...) // then update
}
```

### Pitfall 4: Forgetting HydrationBoundary
```tsx
// ❌ Bad - prefetch doesn't work
export default async function Page() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery(...)
  return <ClientComponent /> // ❌ data not passed to client
}

// ✅ Good - wrap in HydrationBoundary
export default async function Page() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery(...)
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientComponent /> {/* ✅ data available */}
    </HydrationBoundary>
  )
}
```

---

## 📈 Expected Performance Improvements

| Metric | Before (RSC) | After (TanStack Query) | Improvement |
|--------|-------------|----------------------|-------------|
| Navigation (cached) | 2-3s | ~50ms | **40-60x faster** |
| Search/filter | 2-3s (server) | ~5ms (client) | **400-600x faster** |
| Optimistic update | 2-3s | ~5ms | **400-600x faster** |
| Return to page | 2-3s | 0ms (instant) | **∞** |
| Initial load (SSR) | ~1.5s | ~1.5s | Same (good!) |

---

## ✅ Success Criteria

After migration, you should have:
- ✅ Instant navigation between cached pages
- ✅ No full-page reloads on mutations
- ✅ Optimistic updates feel instant
- ✅ Background refetching keeps data fresh
- ✅ Search/filters happen client-side (instant)
- ✅ React Query Devtools show all cache
- ✅ First page load still fast (SSR + prefetch)
- ✅ No flickering or loading spinners

---

## 🎓 Learning Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Next.js App Router + React Query](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Query Keys Guide](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)

---

## 🚀 Ready to Start?

**Recommended Order**:
1. Phase 1 (Setup) - Days 1-2
2. Phase 2 (Hooks) - Days 3-4
3. Shows list page (Task 3.1) - Day 5
4. Shows detail page (Task 3.2) - Day 6
5. Optimistic updates (Task 4.1-4.2) - Day 7
6. Remaining pages - Days 8-10
7. Polish & optimize - Days 11-14

**Estimated Timeline**: 2-3 weeks for full migration

**Pro Tip**: Start small! Migrate one page completely before moving to the next. This helps you refine patterns and catch issues early.

---

Good luck! 🎉
