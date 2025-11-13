# Oncore – Implementation Summary

## Overview
Oncore is implemented as a multi-tenant Next.js (App Router) application backed by Supabase/Postgres. The `client` workspace contains the web app, database migrations, and supporting tooling. Supabase Row Level Security (RLS) helpers, RPC routines, and React Query-powered pages work together to support artist/tour organizations collaborating on shows and team logistics.

## Implemented Capabilities

### Authentication & Organization Onboarding
- Email/password auth with Supabase powers sign-in and sign-up flows under `app/(auth)`.
- Organization creation runs client-side slug validation with a server API that calls the `check_slug_available` RPC via the admin client to bypass RLS before onboarding a user. 
- The `createOrganization` server action validates input and invokes `app_create_organization_with_owner` to create the org, add the current user as owner, and redirect them into the workspace. 

### Shows, Venues, and Scheduling
- Shows view (`app/(app)/[org]/shows`) prefetches data with a server-side QueryClient and hydrates a TanStack Query-powered client UI for list and calendar modes. 
- Creating a show submits through a modal form that either associates an existing venue or provisions a new one, before calling the `app_create_show` RPC which enforces membership and subscription checks at the database layer. 
- Venues, day schedules, and back-office areas have dedicated routes with shared UI components, though several surfaces (e.g., the day view) still render mostly static placeholder content awaiting real data wiring. 

### People & Internal Team Management
- The people dashboard prefetches members, invitations, and available seat data on the server, then hydrates a client component for filtering. 
- Adding a person runs through a modal that captures member type and contact details, then calls a server action that validates inputs and invokes the `create_person` RPC so that inserts obey org membership and RLS policies. 

### Data Caching & Infrastructure
- `lib/cache.ts` exposes helpers that wrap Supabase queries in `react` cache so server components can reuse fetches within a request. 
- RPC-centric access patterns avoid RLS complexity while maintaining auditability; the Supabase migrations folder includes helper functions and policy grants that tighten access to shows, people, files, and subscriptions.
- Tooling such as `Makefile`, Docker Compose, and Supabase CLI configuration support local development and type generation (see `Makefile` targets and `supabase/config.toml`). 

## Partial or Disabled Areas
- **Partners module** renders only a “Coming Soon” state; no partner data model or actions are wired yet. 
- **Email & contract parsing** services exist in `lib/services`, but their server actions are disabled because the supporting `parsed_emails` and `parsed_contracts` tables have not been created. Calls currently log a warning and return an error response. 
- **Calendar sync** can import/export via `CalendarService`, yet no UI triggers or scheduled jobs exercise the logic, so the capability is effectively dormant. 
- **Day/back-office views** display mocked data and lack Supabase queries, indicating remaining work to connect them to real shows, tasks, or documents. 
- **Mobile directory** (`mobile/`) contains Flutter scaffolding but does not yet surface production data.

## Testing & Quality Status
- The repository lacks automated unit or integration tests for server actions, RPC functions, or React components; the `tests` directory contains documentation and scaffolding but no runnable coverage is hooked into CI. Manual QA is still required for most flows.
- CI/CD scripts focus on Supabase migrations and type generation; additional test execution would need to be added before launch.

## Recommended Next Steps
1. Ship migrations for `parsed_emails` / `parsed_contracts` and finish the review UIs so AI ingestion can move from placeholders to production workflows.
2. Replace placeholder partner/day views with real Supabase queries and actions to cover promoter collaboration and advancing logistics.
3. Add automated tests around critical RPC-backed actions (org creation, show creation, person creation) and wire them into CI before expanding beta access.
4. Integrate calendar sync UI and background jobs so external calendar data imports/exports become operator-ready features.
