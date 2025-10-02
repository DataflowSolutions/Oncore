# Backend Restructure - Clean Architecture Guide

> **🎉 RESTRUCTURE COMPLETE!** All files created and documented.  
> **👉 Start here:** [QUICK_START.md](./QUICK_START.md) or [README_RESTRUCTURE.md](./README_RESTRUCTURE.md)

## Overview

This document outlines the new backend architecture that provides:

- ✅ Complete separation of frontend and backend
- ✅ Reusable backend for web and mobile apps
- ✅ Clean, modular, testable code structure
- ✅ Type-safe API communication

## 📚 Documentation Index

- **[README_RESTRUCTURE.md](./README_RESTRUCTURE.md)** - Main guide and overview
- **[QUICK_START.md](./QUICK_START.md)** - Get started in 5 minutes
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Step-by-step migration
- **[ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)** - Visual diagrams
- **[EXAMPLE_COMPONENT.tsx](./EXAMPLE_COMPONENT.tsx)** - Usage examples
- **[RESTRUCTURE_SUMMARY.md](./RESTRUCTURE_SUMMARY.md)** - Executive summary
- **[backend/README.md](./backend/README.md)** - Backend API docs

## New Folder Structure

```
oncore/
├── backend/                          # Backend API Server
│   ├── src/
│   │   ├── controllers/              # Request handlers (thin layer)
│   │   │   ├── shows.controller.ts
│   │   │   ├── venues.controller.ts
│   │   │   ├── team.controller.ts
│   │   │   ├── advancing.controller.ts
│   │   │   └── organizations.controller.ts
│   │   │
│   │   ├── services/                 # Business logic (core functionality)
│   │   │   ├── shows.service.ts
│   │   │   ├── venues.service.ts
│   │   │   ├── team.service.ts
│   │   │   ├── advancing.service.ts
│   │   │   └── organizations.service.ts
│   │   │
│   │   ├── routes/                   # API route definitions
│   │   │   ├── index.ts              # Main router
│   │   │   ├── shows.routes.ts
│   │   │   ├── venues.routes.ts
│   │   │   ├── team.routes.ts
│   │   │   ├── advancing.routes.ts
│   │   │   └── organizations.routes.ts
│   │   │
│   │   ├── middleware/               # Express/Next.js middleware
│   │   │   ├── auth.middleware.ts    # Authentication checks
│   │   │   ├── error.middleware.ts   # Error handling
│   │   │   ├── validation.middleware.ts
│   │   │   └── cors.middleware.ts
│   │   │
│   │   ├── utils/                    # Helper functions
│   │   │   ├── supabase.ts           # Supabase client
│   │   │   ├── response.ts           # API response helpers
│   │   │   ├── validation.ts         # Input validation
│   │   │   └── errors.ts             # Custom error classes
│   │   │
│   │   ├── types/                    # TypeScript types & interfaces
│   │   │   ├── database.types.ts     # Supabase generated types
│   │   │   ├── api.types.ts          # API request/response types
│   │   │   ├── show.types.ts
│   │   │   ├── venue.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── config/                   # Configuration
│   │   │   ├── env.ts                # Environment variables
│   │   │   └── constants.ts          # App constants
│   │   │
│   │   └── index.ts                  # API entry point (Next.js API catch-all)
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── client/                           # Frontend (Next.js)
│   ├── app/
│   │   ├── (app)/                    # App pages
│   │   ├── (auth)/                   # Auth pages
│   │   ├── (marketing)/              # Marketing pages
│   │   └── api/                      # ❌ REMOVED - Use backend instead
│   │
│   ├── components/                   # React components
│   │
│   ├── lib/
│   │   ├── api-client/               # NEW: Type-safe API client
│   │   │   ├── index.ts
│   │   │   ├── shows.ts
│   │   │   ├── venues.ts
│   │   │   ├── team.ts
│   │   │   └── types.ts              # Shared types from backend
│   │   │
│   │   ├── hooks/                    # React hooks for API calls
│   │   │   ├── use-shows.ts
│   │   │   ├── use-venues.ts
│   │   │   └── use-team.ts
│   │   │
│   │   ├── supabase/                 # Only for client-side Supabase auth
│   │   │   └── client.ts
│   │   │
│   │   └── utils.ts                  # Client-side utilities
│   │
│   ├── actions/                      # ❌ REMOVED - Use API client instead
│   ├── services/                     # ❌ REMOVED - Moved to backend
│   │
│   ├── package.json
│   └── tsconfig.json
│
└── mobile/                           # Future mobile app (Flutter/React Native)
    └── (connects to backend API)
```

## Architecture Layers

### 1. **Routes Layer** (HTTP Handling)

- Defines API endpoints
- Maps HTTP methods to controller functions
- Minimal logic, just routing

### 2. **Controllers Layer** (Request/Response)

- Handles HTTP requests
- Validates input
- Calls service methods
- Formats responses
- Handles errors

### 3. **Services Layer** (Business Logic)

- Contains all business logic
- Interacts with database
- Reusable across different controllers
- Platform-agnostic (works for web & mobile)

### 4. **Utils Layer** (Helpers)

- Database clients
- Validation functions
- Response formatters
- Error handlers

## Data Flow

```
Frontend (React Component)
    ↓
API Client (fetch/axios)
    ↓
Backend API Route (/api/shows)
    ↓
Controller (shows.controller.ts)
    ↓
Service (shows.service.ts)
    ↓
Database (Supabase)
    ↓
Service → Controller → API Response
    ↓
Frontend updates UI
```

## Key Principles

1. **No Direct Imports**: Frontend NEVER imports backend code
2. **API First**: All backend features exposed via REST/GraphQL endpoints
3. **Type Safety**: Shared types ensure type safety across frontend/backend
4. **Reusability**: Backend works for web, mobile, and future platforms
5. **Testability**: Each layer can be tested independently
6. **Separation of Concerns**: Routes → Controllers → Services → Database

## Example Implementation

See the example files:

- `backend/src/routes/shows.routes.ts`
- `backend/src/controllers/shows.controller.ts`
- `backend/src/services/shows.service.ts`
- `backend/src/types/show.types.ts`
- `client/lib/api-client/shows.ts`

## Migration Strategy

1. Create backend folder structure
2. Move services to backend/src/services
3. Create controllers for each service
4. Create routes for each controller
5. Update frontend to use API client instead of direct imports
6. Remove server actions from frontend
7. Test each endpoint
8. Deploy backend separately or as part of Next.js

## Benefits

✅ **Mobile Ready**: Same backend for web and mobile
✅ **Clean Code**: Clear separation of concerns
✅ **Type Safe**: End-to-end type safety
✅ **Testable**: Easy to unit test each layer
✅ **Scalable**: Can deploy backend separately later
✅ **Maintainable**: Clear structure, easy to find code
✅ **Reusable**: Services can be called from anywhere
