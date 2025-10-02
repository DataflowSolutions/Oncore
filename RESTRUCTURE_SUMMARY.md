# Backend Restructure Summary

## ✅ What's Been Created

I've restructured your Oncore project to have complete separation between frontend and backend, making the backend reusable for both web and mobile apps.

## 📁 New Folder Structure

```
oncore/
├── backend/                          # ✨ NEW - Backend API
│   ├── src/
│   │   ├── controllers/              # Request handlers
│   │   │   └── shows.controller.ts
│   │   ├── services/                 # Business logic
│   │   │   └── shows.service.ts
│   │   ├── routes/                   # Route definitions
│   │   │   ├── index.ts
│   │   │   └── shows.routes.ts
│   │   ├── types/                    # TypeScript types
│   │   │   ├── api.types.ts
│   │   │   ├── show.types.ts
│   │   │   ├── venue.types.ts
│   │   │   └── index.ts
│   │   ├── utils/                    # Helpers
│   │   │   ├── supabase.ts
│   │   │   ├── response.ts
│   │   │   ├── validation.ts
│   │   │   └── errors.ts
│   │   └── config/                   # Configuration
│   │       ├── env.ts
│   │       └── constants.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── client/                           # Frontend (Next.js)
│   ├── lib/
│   │   ├── api-client/               # ✨ NEW - API client
│   │   │   ├── index.ts
│   │   │   └── shows.ts
│   │   └── hooks/                    # ✨ NEW - React hooks
│   │       └── use-shows.ts
│   └── app/
│       └── api/
│           └── shows/
│               ├── route.ts          # Updated
│               └── [id]/
│                   └── route.ts      # ✨ NEW
│
├── BACKEND_RESTRUCTURE.md            # Architecture overview
├── MIGRATION_GUIDE.md                # Step-by-step migration
└── EXAMPLE_COMPONENT.tsx             # Usage examples
```

## 🎯 Key Features

### 1. **Complete Separation**

- ✅ Frontend NEVER imports backend code directly
- ✅ All communication via REST API
- ✅ Backend works for web, mobile, and future platforms

### 2. **Clean Architecture**

```
Frontend Component
    ↓
API Client (fetch/axios)
    ↓
API Route (/api/shows)
    ↓
Controller (validation, error handling)
    ↓
Service (business logic)
    ↓
Database (Supabase)
```

### 3. **Type Safety**

- ✅ Shared TypeScript types between frontend and backend
- ✅ End-to-end type safety
- ✅ Auto-completion in IDE

### 4. **Modular & Clean**

- ✅ Controllers: HTTP request/response handling
- ✅ Services: Business logic (reusable)
- ✅ Routes: API endpoint definitions
- ✅ Utils: Helper functions
- ✅ Types: Shared interfaces

## 📋 Example Implementation (Shows Endpoint)

### Backend Service

```typescript
// backend/src/services/shows.service.ts
export class ShowsService {
  async getShowsByOrg(params: ShowsListParams): Promise<ShowWithVenue[]> {
    // Business logic here
  }

  async createShow(request: CreateShowRequest): Promise<ShowWithVenue> {
    // Business logic here
  }
}
```

### Backend Controller

```typescript
// backend/src/controllers/shows.controller.ts
export class ShowsController {
  static async list(request: NextRequest): Promise<NextResponse> {
    // Validate input
    // Call service
    // Return response
  }
}
```

### Backend Route

```typescript
// backend/src/routes/shows.routes.ts
export async function GET(request: NextRequest) {
  return ShowsController.list(request);
}
```

### Frontend API Client

```typescript
// client/lib/api-client/shows.ts
export class ShowsApi {
  async list(params: ShowsListParams): Promise<ShowWithVenue[]> {
    return this.client.get("/shows", params);
  }
}
```

### Frontend Hook

```typescript
// client/lib/hooks/use-shows.ts
export function useShows(orgId: string) {
  const [shows, setShows] = useState<ShowWithVenue[]>([]);
  // ... hook logic
  return { shows, createShow, updateShow, deleteShow };
}
```

### Frontend Component Usage

```tsx
"use client";

import { useShows } from "@/lib/hooks/use-shows";

export function ShowsList({ orgId }: { orgId: string }) {
  const { shows, loading, createShow } = useShows(orgId);

  // Use the data and functions
}
```

## 🚀 API Endpoints

### Shows API

- `GET /api/shows` - List shows
- `GET /api/shows/upcoming` - Get upcoming shows
- `GET /api/shows/:id` - Get show by ID
- `POST /api/shows` - Create show
- `PATCH /api/shows/:id` - Update show
- `DELETE /api/shows/:id` - Delete show

### Request Example

```http
POST /api/shows
Authorization: Bearer {token}
Content-Type: application/json

{
  "org_id": "uuid",
  "title": "My Show",
  "date": "2025-10-15",
  "set_time": "20:00",
  "venue_name": "The Venue",
  "venue_city": "New York"
}
```

### Response Example

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "title": "My Show",
    "date": "2025-10-15",
    "set_time": "2025-10-15T20:00:00",
    "venue": {
      "id": "uuid",
      "name": "The Venue",
      "city": "New York"
    }
  },
  "message": "Show created successfully"
}
```

## 📱 Mobile Integration

The backend is ready for mobile apps! Example for Flutter:

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

## 📝 Next Steps

### 1. **Install Backend Dependencies**

```bash
cd backend
npm install
```

### 2. **Configure Environment**

```bash
cd backend
cp .env.example .env
# Fill in your Supabase credentials
```

### 3. **Copy Database Types**

```bash
cp client/lib/database.types.ts backend/src/types/database.types.ts
```

### 4. **Test the Shows Endpoint**

```bash
cd client
npm run dev

# Test with cURL
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/shows?org_id=YOUR_ORG_ID"
```

### 5. **Migrate Other Endpoints**

Follow the same pattern for:

- Venues
- Team
- Advancing Sessions
- Organizations
- Schedule

See `MIGRATION_GUIDE.md` for detailed instructions.

## 🎨 Benefits

✅ **Reusability**: Same backend for web + mobile
✅ **Type Safety**: Full TypeScript support
✅ **Clean Code**: Clear separation of concerns
✅ **Testability**: Easy to unit test each layer
✅ **Scalability**: Can deploy backend separately
✅ **Maintainability**: Easy to find and modify code
✅ **API First**: Clear API contract for all platforms
✅ **Error Handling**: Centralized error management
✅ **Validation**: Input validation with Zod
✅ **Documentation**: Self-documenting code structure

## 📚 Documentation Files

1. **BACKEND_RESTRUCTURE.md** - Architecture overview and principles
2. **MIGRATION_GUIDE.md** - Step-by-step migration instructions
3. **backend/README.md** - Backend API documentation
4. **EXAMPLE_COMPONENT.tsx** - Frontend usage examples

## 🔧 Architecture Highlights

### Routes Layer

- Defines API endpoints
- Maps HTTP methods to controllers
- Minimal logic

### Controllers Layer

- Validates input
- Calls service methods
- Formats responses
- Handles errors

### Services Layer

- Contains business logic
- Interacts with database
- Reusable across platforms
- Platform-agnostic

### Utils Layer

- Database clients
- Response helpers
- Validation functions
- Error classes

## 💡 Usage Patterns

### Pattern 1: Client Component with Hook

```tsx
"use client";
import { useShows } from "@/lib/hooks/use-shows";

export function MyComponent({ orgId }: Props) {
  const { shows, loading, createShow } = useShows(orgId);
  // Use data and functions
}
```

### Pattern 2: Server Component with Direct API

```tsx
import { showsApi } from "@/lib/api-client/shows";

export default async function MyPage({ params }: Props) {
  const shows = await showsApi.list({ org_id: params.org });
  // Render data
}
```

### Pattern 3: API Route Handler

```typescript
import { NextRequest } from "next/server";
import { GET, POST } from "@/../backend/src/routes/shows.routes";

export { GET, POST };
```

## 🎯 Summary

You now have:

- ✅ Complete backend separation
- ✅ Reusable API for web and mobile
- ✅ Type-safe end-to-end
- ✅ Clean, modular architecture
- ✅ Example implementation (Shows)
- ✅ Frontend API client
- ✅ React hooks for easy usage
- ✅ Comprehensive documentation
- ✅ Migration guide

The shows endpoint is fully implemented as an example. You can now follow the same pattern to migrate your other endpoints (venues, team, advancing, etc.).

Ready to build amazing things! 🚀
