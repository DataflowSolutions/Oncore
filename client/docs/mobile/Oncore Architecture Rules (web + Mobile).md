# Oncore – Web + Mobile Architecture Rules

This document defines how Oncore **must** be structured so that web (Next.js) and mobile (Flutter) share the same backend correctly, with offline support and minimal duplication.

---

## 🔴 IMPORTANT PRINCIPLES

1. **Single Source of Truth for Data & Business Rules**

   * Supabase (Postgres + RLS + RPC) is the ultimate source of data.
   * Business rules live either in:

     * Supabase RPC functions, or
     * Node/Next.js API routes when logic depends on Node features (AI, workers, file processing, etc.).
   * **No business logic is allowed in Flutter UI, React components, or random hooks.**

2. **Do Not Rewrite Logic Twice**

   * If a complex flow already exists in a Next.js API route (e.g. today view aggregation, import/AI pipeline), **mobile must reuse that via `/api`**, not reimplement it in Dart.
   * If an RPC already does what is needed (simple data access), **both web and mobile should call the same RPC**, not create alternative paths.

3. **Offline Mode Is a Client Concern**

   * Offline behavior is implemented in the mobile app (local DB + repository pattern), not by changing the backend.
   * Backend returns consistent JSON; Flutter decides how to cache/sync/serve it offline.

4. **Auth Is Always Supabase Auth**

   * Web: cookie-based auth handled by Next.js + Supabase server client.
   * Mobile: token-based auth via `supabase_flutter` (JWT access token).
   * API routes must support **both**: cookies (web) and `Authorization: Bearer <token>` (mobile).

5. **Web and Mobile Share the Same Mental Model**

   * Both think in terms of organizations, shows, schedule, team, imports, etc.
   * Where possible, they consume the **same endpoints / RPCs**, so behavior doesn’t drift.

---

## 🧱 LAYERED ARCHITECTURE OVERVIEW

### Data & Logic Layers

1. **Supabase Data Layer (Postgres + RLS)**

   * Tables, views, RLS policies.
   * `auth.uid()` drives per-user access.

2. **Supabase RPC Layer (Core Business Logic)**

   * Handles:

     * Authentication checks (`auth.uid()` not null).
     * Org membership & permissions.
     * Simple and medium-complexity queries and joins.
   * Must be safe to call from **both web and mobile** as long as the requester has a valid JWT.

3. **Next.js API Layer (`app/api/**` – Orchestration & Heavy Logic)**

   * Thin wrappers around Supabase or heavy orchestration when needed.
   * Responsibilities:

     * Resolve org slug → org id when needed.
     * Aggregate multiple RPC/table calls into a single response (e.g. `/api/[org]/today`).
     * Coordinate with background workers, AI orchestrators, text extraction, etc.
     * Offer a stable HTTP contract for **both** web and mobile.
   * Can use Node features: filesystem, workers, external APIs, AI models.

4. **Next.js Server Actions / Hooks (Web Only)**

   * Used by the web app for:

     * Mutations (create/update/delete) via RPCs.
     * Cache invalidation (`revalidatePath`, etc.).
   * **Must not introduce new business rules that only exist on web.** They should reuse RPCs and API endpoints.

5. **Client Apps (Web & Mobile)**

   * Web (Next.js):

     * Uses TanStack Query, server actions, etc.
     * Talks to RPCs and `/api` endpoints as defined by this doc.
   * Mobile (Flutter):

     * Uses `supabase_flutter` for auth and (optional) direct RPC.
     * Uses an HTTP client for `/api` endpoints.
     * Implements a repository + local cache for offline mode.

---

## 🔐 AUTH DESIGN (WEB + MOBILE)

### Web (Next.js)

* Uses Supabase server client wired to cookies.
* API routes and server actions read auth from cookies.

### Mobile (Flutter)

* Uses `supabase_flutter` to sign in and store session.
* All requests to `/api` include:

  * `Authorization: Bearer <access_token>`
* Any direct RPC calls from Flutter also use that same session (handled by the SDK).

### Shared Server Helper

* There must be a central helper, e.g. `getSupabaseFromRequest(req)`, that:

  1. If `Authorization: Bearer <token>` header is present → create a Supabase client that uses that token.
  2. Else → fall back to cookie-based Supabase server client (for web).
* All API routes use this helper. No route manually reimplements auth.

---

## 🌐 HOW ENDPOINTS SHOULD BE USED

### Categories of Backend Logic

1. **Simple Data Access / Listing**

   * Examples:

     * List organizations for user.
     * List shows for org.
     * Get schedule items for a show.
   * Ideal home: **Supabase RPC functions**.
   * Usage:

     * Web: server actions / hooks call RPCs.
     * Mobile: either call the same RPCs directly via `supabase_flutter`, or hit a thin `/api` wrapper if one already exists.

2. **Aggregated Views / Dashboards**

   * Examples:

     * `/api/[org]/today` (shows + schedule + assignments for today).
     * `/api/[org]/calendar/...` (calendar views, combined data).
   * Ideal home: **Next.js API routes**, possibly backed by several RPCs.
   * Usage:

     * Web: `fetch('/api/[org]/today')` or via hooks.
     * Mobile: HTTP client hitting the **same** `/api` endpoint with bearer token.

3. **Heavy Orchestration / AI / Background Jobs**

   * Examples:

     * `/api/import/start` (file upload, text extraction, AI, worker coordination).
     * `/api/import-worker/*` health checks.
   * Can’t be RPC-only (needs Node features).
   * Usage:

     * Web: calls `/api/import/start` with JSON body.
     * Mobile: calls the same endpoint with JSON body, plus bearer token.

---

## 📱 MOBILE ARCHITECTURE (FLUTTER)

### Remote Data Sources

Mobile should treat the backend as two remote sources:

1. **SupabaseRemoteDataSource**

   * Uses `supabase_flutter`.
   * For:

     * Auth (sign in / sign out).
     * Direct RPC calls where appropriate (e.g. list orgs, list shows).
     * Optional realtime subscriptions.

2. **OncoreApiRemoteDataSource**

   * Uses HTTP client (`dio`/`http`).
   * For:

     * `/api/[org]/today`.
     * `/api/import/start` and other AI/import-related routes.
     * Any complex aggregated or Node-dependent logic.

### Repository Layer

* `ShowsRepository`, `TodayRepository`, `ImportRepository`, etc.
* Responsibilities:

  * Decide when to call Supabase vs `/api`.
  * Merge responses into domain models.
  * Persist relevant data to local storage for offline mode.

### Offline Mode

* Implemented via a **local database** (e.g. sqflite/drift/Hive).
* Repositories:

  * On read: if offline → serve last known good data from local DB.
  * On successful remote fetch: save/update local DB.
* Backend does not change for offline; only the client behavior does.

---

## 🧭 RULES OF THUMB

1. **If logic is complex and already implemented in `/api`, mobile must reuse that endpoint.**

   * Example: Today view, import/AI flows.

2. **If logic is simple and lives in RPC, both web and mobile may call the same RPC directly.**

3. **Never copy business rules into Flutter or React components.**

   * Any rule that affects permissions, visibility, or calculations should live in RPC or API, not the UI.

4. **API routes must always be auth-aware using the shared helper.**

   * Never manually parse JWTs or bypass Supabase auth.

5. **Offline mode must not introduce conflicting logic.**

   * Offline cache simply stores the same data shape returned by the backend.
   * When reconnecting, backend remains the authority.

---

## 🚦 WHAT IS ALLOWED VS FORBIDDEN

### Allowed

* Web and mobile both calling the same `/api/[org]/today` endpoint.
* Web using server actions that wrap RPC calls.
* Mobile calling Supabase RPCs directly for simple listings.
* Next.js API routes handling AI, workers, text extraction, multi-query aggregation.
* Local caching in Flutter for offline, based on backend JSON.

### Forbidden

* Implementing business rules only in Flutter or only in React components.
* Directly querying tables from clients without going through RPC or a controlled API route.
* Creating new API routes that ignore the shared `getSupabaseFromRequest` auth helper.
* Forking logic: having different permission rules or calculations on web vs mobile.

---

## ✅ END GOAL – “PERFECT WORLD” SUMMARY

In the ideal state:

* Supabase RPC defines the core rules and safe data access.
* Next.js API routes provide clean, stable HTTP endpoints for complex flows and heavy processing.
* Web and mobile share those endpoints instead of reimplementing logic.
* Auth is unified: Supabase for everything, cookies on web, bearer tokens on mobile.
* Offline is handled in Flutter via caching, without changing backend contracts.
* Any engineer or AI model can read this doc and know **where** to put new logic and **how** web and mobile should consume it.
