# 🎯 Backend Restructure - Complete Guide

> **Transform your monolithic Next.js app into a clean, scalable architecture with a reusable backend for web and mobile.**

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [What's New](#-whats-new)
3. [Architecture Overview](#-architecture-overview)
4. [Documentation](#-documentation)
5. [Benefits](#-benefits)
6. [Next Steps](#-next-steps)

---

## 🚀 Quick Start

**Get started in 5 minutes!** Follow these steps:

1. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Copy database types**

   ```bash
   cp client/lib/database.types.ts backend/src/types/database.types.ts
   ```

3. **Configure environment**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Update tsconfig** (add to `client/tsconfig.json`)

   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./"],
         "@backend/*": ["../backend/src/*"]
       }
     }
   }
   ```

5. **Test the API**

   ```bash
   cd client
   npm run dev

   # Test the shows endpoint
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/shows?org_id=YOUR_ORG_ID"
   ```

📖 **Full guide:** [QUICK_START.md](./QUICK_START.md)

---

## ✨ What's New

### Before: Monolithic Architecture

```
Frontend components → Server actions → Database
```

- ❌ Tight coupling between frontend and backend
- ❌ Can't reuse logic for mobile apps
- ❌ Hard to test and maintain
- ❌ No clear API contract

### After: Clean Architecture

```
Frontend → API Client → Backend API → Services → Database
```

- ✅ Complete separation of concerns
- ✅ Reusable backend for web + mobile
- ✅ Clean, testable, maintainable code
- ✅ Clear REST API contract
- ✅ Type-safe end-to-end

---

## 🏗️ Architecture Overview

### New Folder Structure

```
oncore/
├── backend/                    # ✨ NEW - Backend API
│   ├── src/
│   │   ├── controllers/        # HTTP handlers
│   │   ├── services/           # Business logic
│   │   ├── routes/             # API routes
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Helpers
│   │   └── config/             # Configuration
│   └── package.json
│
├── client/                     # Frontend (Next.js)
│   ├── lib/
│   │   ├── api-client/         # ✨ NEW - API client
│   │   └── hooks/              # ✨ NEW - React hooks
│   └── app/
│       └── api/                # API route handlers
│
└── docs/
    ├── QUICK_START.md          # ✨ NEW - Get started fast
    ├── MIGRATION_GUIDE.md      # ✨ NEW - Migration steps
    ├── ARCHITECTURE_DIAGRAMS.md # ✨ NEW - Visual diagrams
    └── EXAMPLE_COMPONENT.tsx   # ✨ NEW - Usage examples
```

### Request Flow

```
React Component
    ↓
API Client (showsApi.list())
    ↓
HTTP Request (/api/shows)
    ↓
Controller (validation, auth)
    ↓
Service (business logic)
    ↓
Database (Supabase)
    ↓
Response (JSON)
    ↓
Component updates UI
```

### API Endpoints

**Shows API**

- `GET /api/shows` - List shows
- `GET /api/shows/:id` - Get show
- `POST /api/shows` - Create show
- `PATCH /api/shows/:id` - Update show
- `DELETE /api/shows/:id` - Delete show

**Same pattern for:**

- Venues (`/api/venues`)
- Team (`/api/team`)
- Advancing (`/api/advancing`)
- Organizations (`/api/organizations`)

---

## 📚 Documentation

### Essential Guides

| Document                                               | Description                    | When to Read             |
| ------------------------------------------------------ | ------------------------------ | ------------------------ |
| [QUICK_START.md](./QUICK_START.md)                     | Get started in 5 minutes       | **Start here!**          |
| [BACKEND_RESTRUCTURE.md](./BACKEND_RESTRUCTURE.md)     | Complete architecture overview | Understanding the design |
| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)             | Step-by-step migration         | Migrating your code      |
| [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) | Visual architecture diagrams   | Visual learners          |
| [EXAMPLE_COMPONENT.tsx](./EXAMPLE_COMPONENT.tsx)       | Real-world usage examples      | Writing components       |
| [backend/README.md](./backend/README.md)               | Backend API documentation      | API reference            |
| [RESTRUCTURE_SUMMARY.md](./RESTRUCTURE_SUMMARY.md)     | Executive summary              | Overview                 |

### Example Files Created

✅ **Backend** (Complete shows implementation)

- `backend/src/types/show.types.ts` - Type definitions
- `backend/src/services/shows.service.ts` - Business logic
- `backend/src/controllers/shows.controller.ts` - HTTP handlers
- `backend/src/routes/shows.routes.ts` - Route definitions
- `backend/src/utils/` - Helper functions
- `backend/src/config/` - Configuration

✅ **Frontend** (API client & hooks)

- `client/lib/api-client/index.ts` - Base API client
- `client/lib/api-client/shows.ts` - Shows API client
- `client/lib/hooks/use-shows.ts` - React hook
- `client/app/api/shows/route.ts` - API route handler
- `client/app/api/shows/[id]/route.ts` - Dynamic route handler

---

## 💡 Benefits

### For Web Development

- ✅ Clean separation of concerns
- ✅ Type-safe API communication
- ✅ Easy to test and maintain
- ✅ Reusable hooks and clients
- ✅ Better error handling

### For Mobile Development

- ✅ Same backend API for iOS/Android
- ✅ Clear API documentation
- ✅ Consistent data models
- ✅ No need to duplicate business logic

### For Team Collaboration

- ✅ Clear code structure
- ✅ Easy to onboard new developers
- ✅ Frontend/backend can work independently
- ✅ Reduced merge conflicts

### For Scaling

- ✅ Backend can be deployed separately
- ✅ Easy to add new endpoints
- ✅ Can switch to microservices later
- ✅ Performance optimization per layer

---

## 🎯 Next Steps

### Phase 1: Setup & Testing (Day 1)

- [ ] Install backend dependencies
- [ ] Copy database types
- [ ] Configure environment variables
- [ ] Test shows endpoint
- [ ] Create a test component

### Phase 2: Migration (Week 1)

- [ ] Migrate shows endpoints ✅ (Done!)
- [ ] Migrate venues endpoints
- [ ] Migrate team endpoints
- [ ] Migrate advancing endpoints
- [ ] Migrate organizations endpoints

### Phase 3: Frontend Updates (Week 2)

- [ ] Update all components to use API client
- [ ] Replace server actions with API calls
- [ ] Test all CRUD operations
- [ ] Update error handling
- [ ] Add loading states

### Phase 4: Cleanup (Week 3)

- [ ] Remove old server actions
- [ ] Remove unused service files
- [ ] Update documentation
- [ ] Code review and refactoring
- [ ] Performance testing

### Phase 5: Mobile Preparation (Week 4)

- [ ] Document all API endpoints
- [ ] Create API reference for mobile team
- [ ] Test authentication flow
- [ ] Prepare mobile SDK/examples
- [ ] Deploy backend (if separate)

---

## 📖 Example Usage

### Frontend: Client Component with Hook

```tsx
"use client";

import { useShows } from "@/lib/hooks/use-shows";

export function ShowsList({ orgId }: { orgId: string }) {
  const { shows, loading, error, createShow } = useShows(orgId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {shows.map((show) => (
        <div key={show.id}>{show.title}</div>
      ))}
      <button
        onClick={() =>
          createShow({
            /* data */
          })
        }
      >
        Add Show
      </button>
    </div>
  );
}
```

### Frontend: Server Component

```tsx
import { showsApi } from "@/lib/api-client/shows";

export default async function ShowsPage({ params }: Props) {
  const shows = await showsApi.list({ org_id: params.org });

  return (
    <div>
      {shows.map((show) => (
        <div key={show.id}>{show.title}</div>
      ))}
    </div>
  );
}
```

### Mobile: Flutter Example

```dart
class ShowsApi {
  Future<List<Show>> getShows(String orgId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/shows?org_id=$orgId'),
      headers: {'Authorization': 'Bearer $token'},
    );

    final data = jsonDecode(response.body);
    return (data['data'] as List)
        .map((item) => Show.fromJson(item))
        .toList();
  }
}
```

---

## 🆘 Troubleshooting

### Common Issues

**Issue:** Module not found `'@/../backend/src/types'`  
**Solution:** Update `tsconfig.json` with path mapping (see Quick Start)

**Issue:** 401 Unauthorized  
**Solution:** Pass auth token in Authorization header

**Issue:** CORS errors  
**Solution:** Backend runs on same domain; no CORS needed

### Getting Help

1. Check the documentation files
2. Review the example implementations
3. Test endpoints with cURL/Postman
4. Check the migration guide for patterns

---

## 📊 Progress Tracking

Use this checklist to track your migration progress:

### Backend Setup

- [x] Create backend folder structure
- [x] Set up types, utils, config
- [x] Implement shows endpoint (example)
- [ ] Implement venues endpoint
- [ ] Implement team endpoint
- [ ] Implement advancing endpoint
- [ ] Implement organizations endpoint

### Frontend Setup

- [x] Create API client
- [x] Create hooks
- [x] Wire up API routes
- [ ] Update all components
- [ ] Remove server actions
- [ ] Test all flows

### Testing

- [ ] Test all CRUD operations
- [ ] Test error handling
- [ ] Test authentication
- [ ] Performance testing
- [ ] Mobile API testing

---

## 🎉 Success Metrics

After completing this restructure, you should have:

- ✅ Zero direct imports from backend to frontend
- ✅ All backend logic in `backend/` folder
- ✅ All API calls through `api-client/`
- ✅ Type safety across all layers
- ✅ Working example for shows endpoint
- ✅ Clear path to add mobile apps
- ✅ Improved code organization
- ✅ Better testability
- ✅ Cleaner separation of concerns

---

## 🚀 You're Ready!

Everything is set up and documented. The shows endpoint is fully implemented as an example.

**Start here:** [QUICK_START.md](./QUICK_START.md)

Questions? Check the documentation files or review the example implementations.

**Happy coding!** 🎨
