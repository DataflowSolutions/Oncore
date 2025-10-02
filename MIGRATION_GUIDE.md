# Migration Guide - From Server Actions to Backend API

This guide helps you migrate from the current architecture (server actions + direct imports) to the new backend API architecture.

## Overview

**Before**: Frontend components import server actions directly

```tsx
import { getShowsByOrg } from "@/lib/actions/shows";
```

**After**: Frontend uses API client to call backend endpoints

```tsx
import { showsApi } from "@/lib/api-client/shows";
```

## Step-by-Step Migration

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 2: Copy Database Types

Copy your existing `database.types.ts` to the backend:

```bash
cp client/lib/database.types.ts backend/src/types/database.types.ts
```

### Step 3: Set Up Environment Variables

```bash
cd backend
cp .env.example .env
# Fill in your Supabase credentials
```

### Step 4: Update Frontend Component (Example)

#### Before (Using Server Actions):

```tsx
// client/app/(app)/[org]/shows/page.tsx
import { getShowsByOrg } from "@/lib/actions/shows";

export default async function ShowsPage({
  params,
}: {
  params: { org: string };
}) {
  const shows = await getShowsByOrg(params.org);

  return (
    <div>
      {shows.map((show) => (
        <div key={show.id}>{show.title}</div>
      ))}
    </div>
  );
}
```

#### After (Using API Client):

**Option 1: Client Component with Hook**

```tsx
"use client";

import { useShows } from "@/lib/hooks/use-shows";

export default function ShowsPage({ params }: { params: { org: string } }) {
  const { shows, loading, error } = useShows(params.org);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {shows.map((show) => (
        <div key={show.id}>{show.title}</div>
      ))}
    </div>
  );
}
```

**Option 2: Server Component with Direct API Call**

```tsx
import { showsApi } from "@/lib/api-client/shows";

export default async function ShowsPage({
  params,
}: {
  params: { org: string };
}) {
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

### Step 5: Update Forms and Mutations

#### Before (Using Server Actions):

```tsx
import { createShow } from "@/lib/actions/shows";

async function handleSubmit(formData: FormData) {
  "use server";
  await createShow(formData);
}
```

#### After (Using API Client):

```tsx
"use client";

import { showsApi } from "@/lib/api-client/shows";

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  const formData = new FormData(e.target as HTMLFormElement);

  await showsApi.create({
    org_id: orgId,
    title: formData.get("title") as string,
    date: formData.get("date") as string,
    // ... other fields
  });
}
```

Or use the hook:

```tsx
"use client";

import { useShows } from "@/lib/hooks/use-shows";

export function CreateShowForm({ orgId }: { orgId: string }) {
  const { createShow } = useShows(orgId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);

    await createShow({
      org_id: orgId,
      title: formData.get("title") as string,
      date: formData.get("date") as string,
    });
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Migration Checklist

- [ ] **Setup Backend**
  - [ ] Install backend dependencies (`npm install` in backend folder)
  - [ ] Copy database types to backend
  - [ ] Configure environment variables
- [ ] **Create API Endpoints**

  - [ ] Copy service logic from `lib/services` to `backend/src/services`
  - [ ] Create controllers for each service
  - [ ] Create route handlers
  - [ ] Test endpoints with Postman/curl

- [ ] **Update Frontend**

  - [ ] Replace server action imports with API client imports
  - [ ] Convert server components to client components (if needed)
  - [ ] Use hooks for data fetching
  - [ ] Update form submissions to use API client
  - [ ] Remove old server actions

- [ ] **Test & Cleanup**
  - [ ] Test all CRUD operations
  - [ ] Test error handling
  - [ ] Test authentication
  - [ ] Remove unused server actions
  - [ ] Remove unused service files from frontend

## Common Patterns

### Pattern 1: List Resources

**Before**:

```tsx
const shows = await getShowsByOrg(orgId);
```

**After**:

```tsx
const shows = await showsApi.list({ org_id: orgId });
// or
const { shows } = useShows(orgId);
```

### Pattern 2: Get Single Resource

**Before**:

```tsx
const show = await getShowById(showId);
```

**After**:

```tsx
const show = await showsApi.getById(showId, orgId);
// or
const { show } = useShow(showId, orgId);
```

### Pattern 3: Create Resource

**Before**:

```tsx
await createShow(formData);
```

**After**:

```tsx
await showsApi.create({
  org_id: orgId,
  title: 'My Show',
  date: '2025-10-15',
})
// or
const { createShow } = useShows(orgId)
await createShow({ ... })
```

### Pattern 4: Update Resource

**Before**:

```tsx
await updateShow(showId, updates);
```

**After**:

```tsx
await showsApi.update(showId, orgId, {
  title: 'Updated Title',
})
// or
const { updateShow } = useShows(orgId)
await updateShow(showId, { ... })
```

### Pattern 5: Delete Resource

**Before**:

```tsx
await deleteShow(showId);
```

**After**:

```tsx
await showsApi.delete(showId, orgId);
// or
const { deleteShow } = useShows(orgId);
await deleteShow(showId);
```

## Error Handling

The new architecture provides better error handling:

```tsx
try {
  const show = await showsApi.create(data);
  toast.success("Show created!");
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(`Error: ${error.message}`);
    console.error("Status:", error.statusCode);
    console.error("Details:", error.details);
  } else {
    toast.error("An unexpected error occurred");
  }
}
```

## Authentication

The API client automatically handles authentication by reading the token from Supabase:

```tsx
import { createClient } from "@/lib/supabase/client";

const apiClient = new ApiClient({
  getAuthToken: async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  },
});
```

## Testing the API

### Using cURL:

```bash
# List shows
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/shows?org_id=YOUR_ORG_ID"

# Create show
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"org_id":"YOUR_ORG_ID","title":"My Show","date":"2025-10-15"}' \
  "http://localhost:3000/api/shows"
```

### Using Postman:

1. Create a new collection
2. Set base URL: `http://localhost:3000/api`
3. Add Authorization header: `Bearer YOUR_TOKEN`
4. Create requests for each endpoint

## Benefits of New Architecture

✅ **Separation of Concerns**: Frontend and backend are completely separate
✅ **Reusability**: Same backend for web and mobile
✅ **Type Safety**: Full TypeScript support across layers
✅ **Testability**: Each layer can be tested independently
✅ **Scalability**: Backend can be deployed separately
✅ **Better Error Handling**: Centralized error handling
✅ **API Documentation**: Clear API structure for mobile developers

## Next Steps

1. Migrate one resource at a time (start with shows)
2. Test thoroughly before moving to the next resource
3. Update mobile app to use the same backend API
4. Consider deploying backend separately for better scalability

## Troubleshooting

### Issue: "Module not found: Can't resolve '@/../backend/src/types'"

**Solution**: Update your `tsconfig.json` to include the backend folder:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./client/*"],
      "@backend/*": ["./backend/src/*"]
    }
  }
}
```

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution**: Install dependencies in the backend folder:

```bash
cd backend
npm install
```

### Issue: CORS errors

**Solution**: Configure CORS in your middleware or Next.js config:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE"
  );

  return response;
}
```

## Support

For questions or issues:

1. Check the example implementation in `backend/src/`
2. Review the API documentation in `backend/src/routes/index.ts`
3. Test endpoints individually before integration
