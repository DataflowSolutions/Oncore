/**
 * Centralized query keys for TanStack Query
 * Pattern: ['resource', 'action', ...params]
 */

export const queryKeys = {
  // User
  userOrganizations: (userId: string) => ['user', userId, 'organizations'] as const,
  
  // Organizations
  org: (orgSlug: string) => ['org', orgSlug] as const,
  orgMembership: (orgSlug: string, userId: string) => ['org', orgSlug, 'membership', userId] as const,
  
  // Shows
  shows: (orgSlug: string) => ['shows', orgSlug] as const,
  show: (showId: string) => ['show', showId] as const,
  showWithVenue: (showId: string) => ['show', showId, 'full'] as const,
  showSchedule: (showId: string) => ['show', showId, 'schedule'] as const,
  showTeam: (showId: string) => ['show', showId, 'team'] as const,
  showAssignedTeam: (showId: string) => ['show', showId, 'assigned-team'] as const,
  showAvailablePeople: (orgId: string) => ['show', 'available-people', orgId] as const,
  
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

  // AI ingestion
  parsedEmails: (orgSlug: string) => ['ingestion', orgSlug, 'parsed-emails'] as const,
  parsedContracts: (orgSlug: string) => ['ingestion', orgSlug, 'parsed-contracts'] as const,

  // Calendar sync
  calendarSources: (orgSlug: string) => ['calendar', orgSlug, 'sources'] as const,
  calendarRuns: (orgSlug: string) => ['calendar', orgSlug, 'runs'] as const,
} as const

/**
 * Invalidation helpers - invalidate related queries when data changes
 */
export const invalidationKeys = {
  // When a show is mutated, invalidate:
  show: (showId: string, orgSlug: string) => [
    queryKeys.show(showId),
    queryKeys.showWithVenue(showId),
    queryKeys.shows(orgSlug),
    queryKeys.showSchedule(showId),
    queryKeys.showTeam(showId),
  ],
  
  // When schedule items are mutated, invalidate:
  schedule: (showId: string) => [
    queryKeys.showSchedule(showId),
    queryKeys.show(showId),
    queryKeys.showWithVenue(showId),
  ],
  
  // When show team is mutated, invalidate:
  showTeam: (showId: string, orgSlug: string, orgId: string) => [
    queryKeys.showTeam(showId),
    queryKeys.showAssignedTeam(showId),
    queryKeys.showAvailablePeople(orgId),
    queryKeys.people(orgSlug),
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

  parsedEmail: (orgSlug: string) => [
    queryKeys.parsedEmails(orgSlug),
  ],

  parsedContract: (orgSlug: string) => [
    queryKeys.parsedContracts(orgSlug),
  ],

  calendarSources: (orgSlug: string) => [
    queryKeys.calendarSources(orgSlug),
    queryKeys.calendarRuns(orgSlug),
  ],

  calendarRuns: (orgSlug: string) => [
    queryKeys.calendarRuns(orgSlug),
    queryKeys.calendarSources(orgSlug),
  ],
}
