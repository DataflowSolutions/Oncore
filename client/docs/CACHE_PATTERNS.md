# Cache Patterns & Invalidation Guide

This document describes the caching strategy used in the Oncore application, including cache utilities, invalidation patterns, and best practices.

## 🎯 Overview

The application uses two caching strategies:

1. **React Cache** - Server-side request deduplication (via `react.cache()`)
2. **Next.js Cache** - Page/route cache invalidation (via `revalidatePath()`)

All cache utilities use **static imports** to avoid per-request dynamic imports overhead.

## 📦 Cache Utilities

### Server-Side Cache (`lib/cache.ts`)

All cache functions use React's `cache()` to deduplicate requests within a single render:

```typescript
import { getCachedOrg, getCachedShow, getCachedOrgVenues } from '@/lib/cache'
```

**✅ DO:** Always use static imports at the top of your file
**❌ DON'T:** Use dynamic imports `const { getCachedOrg } = await import('@/lib/cache')`

### Available Cache Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `getCachedOrg(slug)` | Organization lookup by slug | `{ data, error }` |
| `getCachedOrgSubscription(orgId)` | Subscription status | `{ data, error }` |
| `getCachedOrgMembership(orgId, userId)` | User's org membership | `{ data, error }` |
| `getCachedUserOrgs(userId)` | User's organizations list | `{ data, error }` |
| `getCachedShow(showId)` | Show details with venue/artist | `{ data, error }` |
| `getCachedOrgVenues(orgId)` | Venues for org (simple) | `{ data, error }` |
| `getCachedOrgVenuesWithCounts(orgId)` | Venues with show counts | `{ data, error }` |
| `getCachedOrgPeople(orgId)` | People for selectors | `{ data, error }` |
| `getCachedOrgPeopleFull(orgId)` | Full people details | `{ data, error }` |
| `getCachedAdvancingSession(sessionId)` | Advancing session + show | `{ data, error }` |
| `getCachedShowSchedule(showId)` | Schedule items for show | `{ data, error }` |
| `getCachedOrgShows(orgId)` | All shows with details | `{ data, error }` |
| `getCachedPromoters(orgId)` | Promoters with venues | `{ data, error }` |
| `getCachedOrgInvitations(orgId)` | Pending invitations | `{ data, error }` |
| `getCachedAvailableSeats(orgId)` | Seat availability check | `object \| null` |

### Client-Side Cache (`lib/venue-cache.ts`)

Simple in-memory cache for client-side components:

```typescript
import { getVenueCache, setVenueCache, clearVenueCache } from '@/lib/venue-cache'
```

Functions:
- `getVenueCache(orgId)` - Get cached venues
- `setVenueCache(orgId, venues)` - Set venues cache
- `clearVenueCache(orgId?)` - Clear specific or all caches
- `invalidateVenueCache()` - Clear all caches

## 🔄 Cache Invalidation Patterns

### Using `revalidatePath()`

After mutations, invalidate affected pages using **real slug paths**:

```typescript
import { revalidatePath } from 'next/cache'

// After creating/updating a show
revalidatePath(`/${orgSlug}/shows`)
revalidatePath(`/${orgSlug}`) // Home page

// After updating a venue
revalidatePath(`/${orgSlug}/venues`)
revalidatePath(`/${orgSlug}/venues/${venueId}`)
revalidatePath(`/${orgSlug}/shows`) // Shows may reference venues

// After updating people/team
revalidatePath(`/${orgSlug}/people`)
revalidatePath(`/${orgSlug}/people/crew`)
revalidatePath(`/${orgSlug}/people/artist`)
```

### Invalidation by Entity Type

#### Shows
```typescript
// Create/Update/Delete show
revalidatePath(`/${orgSlug}/shows`)
revalidatePath(`/${orgSlug}`)

// Update specific show
revalidatePath(`/${orgSlug}/shows/${showId}`)
revalidatePath(`/${orgSlug}/shows`)
```

#### Venues
```typescript
// Create venue
revalidatePath(`/${orgSlug}/venues`)
revalidatePath(`/${orgSlug}/shows`) // Shows use venues
revalidatePath(`/${orgSlug}/people/venues`)

// Update venue
revalidatePath(`/${orgSlug}/venues`)
revalidatePath(`/${orgSlug}/venues/${venueId}`)
revalidatePath(`/${orgSlug}/shows`)
revalidatePath(`/${orgSlug}/people/venues`)

// Delete venue
revalidatePath(`/${orgSlug}/venues`)
revalidatePath(`/${orgSlug}/people/venues`)
```

#### People/Team
```typescript
// Create/Update/Delete person
revalidatePath(`/${orgSlug}/people`, 'page')
revalidatePath(`/${orgSlug}/people/crew`, 'page')
revalidatePath(`/${orgSlug}/people/artist`, 'page')
```

#### Promoters/Contacts
```typescript
// Create/Update/Delete promoter
revalidatePath(`/${orgSlug}/venues`, 'page')
revalidatePath(`/${orgSlug}/people/partners`, 'page')

// Link/Unlink promoter to venue
revalidatePath(`/${orgSlug}/venues/${venueId}`, 'page')
revalidatePath(`/${orgSlug}/venues`, 'page')
revalidatePath(`/${orgSlug}/people/partners`, 'page')
```

#### Advancing
```typescript
// Update advancing session
revalidatePath(`/${orgSlug}/shows/${showId}/advancing`)
revalidatePath(`/${orgSlug}/shows/${showId}/advancing/${sessionId}`)

// Sync to schedule
revalidatePath(`/${orgSlug}/shows/${showId}/day`, 'page')
revalidatePath(`/${orgSlug}/shows/${showId}/advancing`, 'page')
```

#### Schedule
```typescript
// Update schedule items
revalidatePath(`/${orgSlug}/shows/${showId}/day`)
revalidatePath(`/${orgSlug}/shows/${showId}`)
```

## 🎨 Best Practices

### ✅ DO

1. **Use static imports** for all cache utilities:
   ```typescript
   import { getCachedOrg } from '@/lib/cache'
   ```

2. **Invalidate all affected pages** after mutations:
   ```typescript
   // Good - invalidates list and detail pages
   revalidatePath(`/${orgSlug}/shows`)
   revalidatePath(`/${orgSlug}/shows/${showId}`)
   ```

3. **Use real slug paths** in revalidatePath:
   ```typescript
   // Good
   revalidatePath(`/${org.slug}/venues`)
   
   // Bad - won't work
   revalidatePath(`/[org]/venues`)
   ```

4. **Specify page type** when needed:
   ```typescript
   revalidatePath(`/${orgSlug}/people`, 'page')
   ```

5. **Cache at the right level** - Use React cache for request deduplication, not for long-term storage

### ❌ DON'T

1. **Don't use dynamic imports** for cache utilities:
   ```typescript
   // Bad
   const cache = await import('@/lib/cache')
   ```

2. **Don't forget to invalidate**:
   ```typescript
   // Bad - data mutation without cache invalidation
   await supabase.from('shows').insert(newShow)
   // Missing: revalidatePath()
   ```

3. **Don't use route patterns**:
   ```typescript
   // Bad - this won't work
   revalidatePath('/[org]/venues')
   ```

4. **Don't over-invalidate**:
   ```typescript
   // Bad - too broad, hurts performance
   revalidatePath('/', 'layout')
   ```

5. **Don't cache user-specific data** in shared caches:
   ```typescript
   // Bad - React cache is per-request, don't store user sessions
   export const userSession = cache(async () => { ... })
   ```

## 🔍 Debugging Cache Issues

### Check if cache is being invalidated

1. Add console logs in your server action:
   ```typescript
   console.log('Invalidating:', `/${orgSlug}/shows`)
   revalidatePath(`/${orgSlug}/shows`)
   ```

2. Check that the slug is correctly resolved:
   ```typescript
   const org = await getCachedOrg(orgSlug)
   if (!org.data) {
     console.error('Org not found, can\'t invalidate cache')
     return
   }
   console.log('Using org slug:', org.data.slug)
   ```

### Common Issues

**Stale data after mutation:**
- Check that `revalidatePath()` is called with the exact path
- Ensure you're using real slug values, not route patterns
- Verify all related pages are invalidated

**Cache misses:**
- Check that cache functions are imported statically
- Verify Supabase RLS policies allow access
- Check for authentication issues

**Performance issues:**
- Don't over-use `revalidatePath('/', 'layout')`
- Cache functions should be lightweight (no heavy computation)
- Use specific path invalidation over broad invalidation

## 📚 Related Documentation

- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [React Cache](https://react.dev/reference/react/cache)
- [Next.js Revalidation](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)

## 🚀 Performance Tips

1. **Batch related invalidations** in a single action
2. **Use React cache** for data that's fetched multiple times in one render
3. **Invalidate specific paths** rather than entire sections
4. **Monitor cache hit rates** in production
5. **Consider Edge caching** for static org data (future optimization)

---

**Remember:** Cache invalidation is one of the two hard things in computer science. When in doubt, invalidate more rather than less, but be specific about which paths need refreshing.
