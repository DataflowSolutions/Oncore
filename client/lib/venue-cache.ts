/**
 * Client-side venue cache
 * Simple in-memory cache for client components
 * 
 * IMPORTANT: Always use static imports
 * ✅ DO:   import { getVenueCache } from '@/lib/venue-cache'
 * ❌ DON'T: const cache = await import('@/lib/venue-cache')
 * 
 * For cache patterns and best practices, see:
 * @see docs/CACHE_PATTERNS.md
 */

interface Venue {
  id: string
  name: string
  city: string | null
  address: string | null
}

// Shared venue cache for client-side performance optimization
const venueCache = new Map<string, Venue[]>()

export function getVenueCache(orgId: string): Venue[] {
  return venueCache.get(orgId) || []
}

export function setVenueCache(orgId: string, venues: Venue[]) {
  venueCache.set(orgId, venues)
}

export function clearVenueCache(orgId?: string) {
  if (orgId) {
    venueCache.delete(orgId)
  } else {
    venueCache.clear()
  }
}

export function invalidateVenueCache() {
  venueCache.clear()
}