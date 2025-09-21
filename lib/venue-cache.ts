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