# Architecture Diagrams

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages/     │  │  Components  │  │    Hooks     │      │
│  │   Layouts    │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                           ▼                                 │
│                  ┌─────────────────┐                        │
│                  │   API Client    │                        │
│                  │  (Type-Safe)    │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │ (JSON)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Next.js)                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              API Routes (/api/...)                     │ │
│  └─────────────────────┬──────────────────────────────────┘ │
│                        │                                     │
│                        ▼                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Controllers Layer                         │ │
│  │  • Input Validation                                    │ │
│  │  • Authentication Check                                │ │
│  │  • Error Handling                                      │ │
│  │  • Response Formatting                                 │ │
│  └─────────────────────┬──────────────────────────────────┘ │
│                        │                                     │
│                        ▼                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Services Layer                            │ │
│  │  • Business Logic                                      │ │
│  │  • Database Operations                                 │ │
│  │  • Data Transformation                                 │ │
│  │  • Reusable Across Platforms                          │ │
│  └─────────────────────┬──────────────────────────────────┘ │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Supabase Database  │
              │  • PostgreSQL        │
              │  • Row Level Security│
              │  • Real-time         │
              └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               Mobile App (Flutter/React Native)              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Screens    │  │   Widgets    │  │   Services   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                           ▼                                 │
│                  ┌─────────────────┐                        │
│                  │   HTTP Client   │                        │
│                  │   (Dio/Axios)   │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            │ Same Backend API!
                            │ (/api/...)
                            │
                            ▼
              (Points to Backend API above)
```

## Request Flow Diagram

```
┌─────────┐
│  User   │
│ Action  │
└────┬────┘
     │
     ▼
┌──────────────────────────┐
│  React Component         │
│  (Client or Server)      │
└────┬─────────────────────┘
     │
     │ Call Hook or API Client
     ▼
┌──────────────────────────┐
│  API Client              │
│  showsApi.list()         │
└────┬─────────────────────┘
     │
     │ HTTP POST /api/shows
     │ Authorization: Bearer {token}
     │ Body: { org_id, title, date }
     ▼
┌──────────────────────────┐
│  API Route               │
│  /api/shows/route.ts     │
└────┬─────────────────────┘
     │
     │ Forward to Controller
     ▼
┌──────────────────────────┐
│  Controller              │
│  ShowsController.create()│
│  • Parse body            │
│  • Validate with Zod     │
│  • Check auth token      │
└────┬─────────────────────┘
     │
     │ Call Service
     ▼
┌──────────────────────────┐
│  Service                 │
│  ShowsService.createShow()│
│  • Business logic        │
│  • Database operations   │
└────┬─────────────────────┘
     │
     │ Query Database
     ▼
┌──────────────────────────┐
│  Supabase                │
│  INSERT INTO shows       │
└────┬─────────────────────┘
     │
     │ Return data
     ▼
┌──────────────────────────┐
│  Service                 │
│  Return ShowWithVenue    │
└────┬─────────────────────┘
     │
     │ Return to Controller
     ▼
┌──────────────────────────┐
│  Controller              │
│  Format response         │
│  { success, data }       │
└────┬─────────────────────┘
     │
     │ HTTP 201 Response
     ▼
┌──────────────────────────┐
│  API Client              │
│  Parse response          │
└────┬─────────────────────┘
     │
     │ Return data
     ▼
┌──────────────────────────┐
│  React Component         │
│  Update UI               │
└────┬─────────────────────┘
     │
     ▼
┌─────────┐
│  User   │
│  Sees   │
│ Updated │
│   UI    │
└─────────┘
```

## Folder Structure (Detailed)

```
oncore/
│
├── backend/                          Backend API (Reusable)
│   ├── src/
│   │   ├── controllers/              HTTP Request Handlers
│   │   │   ├── shows.controller.ts
│   │   │   ├── venues.controller.ts
│   │   │   ├── team.controller.ts
│   │   │   ├── advancing.controller.ts
│   │   │   └── organizations.controller.ts
│   │   │
│   │   ├── services/                 Business Logic
│   │   │   ├── shows.service.ts
│   │   │   ├── venues.service.ts
│   │   │   ├── team.service.ts
│   │   │   ├── advancing.service.ts
│   │   │   └── organizations.service.ts
│   │   │
│   │   ├── routes/                   API Route Definitions
│   │   │   ├── index.ts              (Route registry)
│   │   │   ├── shows.routes.ts
│   │   │   ├── venues.routes.ts
│   │   │   ├── team.routes.ts
│   │   │   ├── advancing.routes.ts
│   │   │   └── organizations.routes.ts
│   │   │
│   │   ├── middleware/               Middleware
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── cors.middleware.ts
│   │   │
│   │   ├── utils/                    Helper Functions
│   │   │   ├── supabase.ts           (DB client)
│   │   │   ├── response.ts           (Response helpers)
│   │   │   ├── validation.ts         (Input validation)
│   │   │   └── errors.ts             (Custom errors)
│   │   │
│   │   ├── types/                    TypeScript Types
│   │   │   ├── database.types.ts     (Supabase types)
│   │   │   ├── api.types.ts          (API types)
│   │   │   ├── show.types.ts
│   │   │   ├── venue.types.ts
│   │   │   └── index.ts
│   │   │
│   │   └── config/                   Configuration
│   │       ├── env.ts
│   │       └── constants.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── client/                           Frontend (Next.js)
│   ├── app/
│   │   ├── (app)/                    App pages
│   │   │   └── [org]/
│   │   │       ├── shows/
│   │   │       ├── venues/
│   │   │       └── ...
│   │   │
│   │   ├── (auth)/                   Auth pages
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   │
│   │   └── api/                      API Routes (thin wrapper)
│   │       ├── shows/
│   │       │   ├── route.ts          → backend/routes
│   │       │   └── [id]/
│   │       │       └── route.ts      → backend/routes
│   │       ├── venues/
│   │       └── ...
│   │
│   ├── components/                   React Components
│   │   ├── shows/
│   │   ├── venues/
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── api-client/               API Client (NEW!)
│   │   │   ├── index.ts              (Base client)
│   │   │   ├── shows.ts              (Shows API)
│   │   │   ├── venues.ts             (Venues API)
│   │   │   └── types.ts              (Shared types)
│   │   │
│   │   ├── hooks/                    React Hooks (NEW!)
│   │   │   ├── use-shows.ts
│   │   │   ├── use-venues.ts
│   │   │   └── use-team.ts
│   │   │
│   │   ├── supabase/                 Auth only
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   │
│   │   └── utils.ts                  Client utils
│   │
│   ├── package.json
│   └── tsconfig.json
│
└── mobile/                           Mobile App (Future)
    └── (Uses same backend API)
```

## Component Communication

```
┌────────────────────────────────────────────────────────────┐
│                     Web Component                          │
│                                                            │
│  import { useShows } from '@/lib/hooks/use-shows'         │
│                                                            │
│  const { shows, createShow } = useShows(orgId)            │
└────────────────┬───────────────────────────────────────────┘
                 │
                 │ Uses
                 ▼
┌────────────────────────────────────────────────────────────┐
│                   API Client Hook                          │
│                                                            │
│  import { showsApi } from '@/lib/api-client/shows'        │
│                                                            │
│  const shows = await showsApi.list({ org_id })            │
└────────────────┬───────────────────────────────────────────┘
                 │
                 │ Calls
                 ▼
┌────────────────────────────────────────────────────────────┐
│                    Backend API                             │
│                                                            │
│  GET /api/shows?org_id=123                                │
│                                                            │
│  Route → Controller → Service → Database                  │
└────────────────────────────────────────────────────────────┘
                 ▲
                 │
                 │ Same API!
                 │
┌────────────────┴───────────────────────────────────────────┐
│                  Mobile Component                          │
│                                                            │
│  Future<List<Show>> getShows(String orgId) async {       │
│    return http.get('$baseUrl/shows?org_id=$orgId');      │
│  }                                                         │
└────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
Backend Service
    │
    │ throw new NotFoundError('Show')
    ▼
Controller
    │
    │ catch (error)
    │ if (error instanceof ApiError)
    │   return NextResponse.json(
    │     { success: false, error: error.message },
    │     { status: error.statusCode }
    │   )
    ▼
API Response
    │
    │ HTTP 404
    │ { "success": false, "error": "Show not found" }
    ▼
API Client
    │
    │ if (!response.ok) throw new ApiError(...)
    ▼
Component
    │
    │ try { ... } catch (error) {
    │   if (error instanceof ApiError) {
    │     toast.error(error.message)
    │   }
    │ }
    ▼
User sees error message
```

## Type Safety Flow

```
┌─────────────────────────────────────────────────────┐
│  backend/src/types/show.types.ts                    │
│                                                     │
│  export interface CreateShowRequest {              │
│    org_id: string                                  │
│    title: string                                   │
│    date: string                                    │
│  }                                                  │
└──────────────┬──────────────────────────────────────┘
               │
               │ Imported by
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│   Backend    │  │   Frontend   │
│   Service    │  │  API Client  │
│              │  │              │
│ createShow(  │  │ createShow(  │
│   request:   │  │   data:      │
│   Create     │  │   Create     │
│   ShowReq    │  │   ShowReq    │
│ )            │  │ )            │
└──────────────┘  └──────────────┘
      │                  │
      │                  │
      └────────┬─────────┘
               │
               ▼
        Full type safety
        end to end!
```

## Benefits Visualization

```
Before (Server Actions):
┌─────────────┐
│  Component  │
│      ↓      │
│   Import    │ ← Direct import
│      ↓      │   (coupling)
│   Action    │
│      ↓      │
│  Database   │
└─────────────┘
❌ Tight coupling
❌ Can't reuse for mobile
❌ No clear API contract


After (Backend API):
┌─────────────┐   ┌─────────────┐
│  Component  │   │   Mobile    │
│      ↓      │   │     App     │
│ API Client  │   │      ↓      │
│      ↓      │   │ HTTP Client │
└──────┬──────┘   └──────┬──────┘
       │                 │
       └────────┬────────┘
                ↓
         ┌──────────────┐
         │  Backend API │
         │      ↓       │
         │  Controller  │
         │      ↓       │
         │   Service    │
         │      ↓       │
         │  Database    │
         └──────────────┘
✅ Loose coupling
✅ Reusable for web + mobile
✅ Clear API contract
✅ Easy to test
✅ Scalable
```
