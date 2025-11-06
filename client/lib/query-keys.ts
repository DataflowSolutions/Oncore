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
