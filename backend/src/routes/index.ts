// Main API Router
// Central place to register all routes

/**
 * API Routes Structure:
 *
 * Shows:
 *   GET    /api/shows                - List shows
 *   GET    /api/shows/upcoming       - Get upcoming shows
 *   GET    /api/shows/:id            - Get show by ID
 *   POST   /api/shows                - Create show
 *   PATCH  /api/shows/:id            - Update show
 *   DELETE /api/shows/:id            - Delete show
 *
 * Venues:
 *   GET    /api/venues               - List venues
 *   GET    /api/venues/search        - Search venues
 *   GET    /api/venues/:id           - Get venue by ID
 *   POST   /api/venues               - Create venue
 *   PATCH  /api/venues/:id           - Update venue
 *   DELETE /api/venues/:id           - Delete venue
 *
 * Team:
 *   GET    /api/team                 - List team members
 *   GET    /api/team/:id             - Get team member by ID
 *   POST   /api/team                 - Add team member
 *   PATCH  /api/team/:id             - Update team member
 *   DELETE /api/team/:id             - Remove team member
 *
 * Advancing:
 *   GET    /api/advancing            - List advancing sessions
 *   GET    /api/advancing/:id        - Get advancing session
 *   POST   /api/advancing            - Create advancing session
 *   PATCH  /api/advancing/:id        - Update advancing session
 *   DELETE /api/advancing/:id        - Delete advancing session
 *
 * Organizations:
 *   GET    /api/organizations        - List user's organizations
 *   GET    /api/organizations/:id    - Get organization details
 *   POST   /api/organizations        - Create organization
 *   PATCH  /api/organizations/:id    - Update organization
 *   DELETE /api/organizations/:id    - Delete organization
 */

export const API_ROUTES = {
  SHOWS: "/api/shows",
  VENUES: "/api/venues",
  TEAM: "/api/team",
  ADVANCING: "/api/advancing",
  ORGANIZATIONS: "/api/organizations",
} as const;
