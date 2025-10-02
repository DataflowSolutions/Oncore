# Quick Start Guide - Backend Restructure

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Return to root
cd ..
```

### Step 2: Copy Database Types

```bash
# Copy your existing database types to the backend
cp client/lib/database.types.ts backend/src/types/database.types.ts
```

### Step 3: Configure Environment

✅ **Already Done!** The `.env` file has been created for you in the backend folder with your Supabase credentials.

To switch between local and production databases:

```bash
# Edit backend/.env
# Set PROD_DB=false for local Docker
# Set PROD_DB=true for production Supabase
```

Current setting: **Local Database** (`PROD_DB=false`)

See [backend/ENV_SETUP.md](./backend/ENV_SETUP.md) for details.

### Step 4: Update tsconfig (Client)

Add path mapping to `client/tsconfig.json`:

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

### Step 5: Test the API

```bash
# Start the development server
cd client
npm run dev
```

Test the shows endpoint:

```bash
# Get your auth token from Supabase (in browser console)
# supabase.auth.getSession()

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/shows?org_id=YOUR_ORG_ID"
```

## 📝 Create Your First Component

### Option 1: Client Component with Hook

```tsx
"use client";

import { useShows } from "@/lib/hooks/use-shows";

export default function ShowsPage({ params }: { params: { org: string } }) {
  const { shows, loading, error, createShow } = useShows(params.org);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Shows</h1>
      {shows.map((show) => (
        <div key={show.id}>{show.title}</div>
      ))}
    </div>
  );
}
```

### Option 2: Server Component with API Client

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
      <h1>Shows</h1>
      {shows.map((show) => (
        <div key={show.id}>{show.title}</div>
      ))}
    </div>
  );
}
```

## 🔨 Add a New Endpoint

Follow the pattern established for shows. Here's a quick template:

### 1. Create Types (`backend/src/types/resource.types.ts`)

```typescript
export interface Resource {
  id: string;
  // ... fields
}

export interface CreateResourceRequest {
  // ... fields
}

export interface UpdateResourceRequest {
  // ... fields
}
```

### 2. Create Service (`backend/src/services/resource.service.ts`)

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

export class ResourceService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async list() {
    const { data, error } = await this.supabase.from("resources").select("*");

    if (error) throw new Error(error.message);
    return data;
  }

  async create(data: CreateResourceRequest) {
    const { data: result, error } = await this.supabase
      .from("resources")
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return result;
  }
}
```

### 3. Create Controller (`backend/src/controllers/resource.controller.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { ResourceService } from "../services/resource.service";
import { createSupabaseClientWithAuth } from "../utils/supabase";
import { successResponse, errorResponse } from "../utils/response";

export class ResourceController {
  static async list(request: NextRequest) {
    try {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      const supabase = createSupabaseClientWithAuth(token!);

      const service = new ResourceService(supabase);
      const data = await service.list();

      return NextResponse.json(successResponse(data));
    } catch (error) {
      return NextResponse.json(errorResponse((error as Error).message, 500), {
        status: 500,
      });
    }
  }

  static async create(request: NextRequest) {
    try {
      const body = await request.json();
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      const supabase = createSupabaseClientWithAuth(token!);

      const service = new ResourceService(supabase);
      const data = await service.create(body);

      return NextResponse.json(successResponse(data), { status: 201 });
    } catch (error) {
      return NextResponse.json(errorResponse((error as Error).message, 500), {
        status: 500,
      });
    }
  }
}
```

### 4. Create Routes (`backend/src/routes/resource.routes.ts`)

```typescript
import { NextRequest } from "next/server";
import { ResourceController } from "../controllers/resource.controller";

export async function GET(request: NextRequest) {
  return ResourceController.list(request);
}

export async function POST(request: NextRequest) {
  return ResourceController.create(request);
}
```

### 5. Wire Up in Next.js (`client/app/api/resource/route.ts`)

```typescript
export { GET, POST } from "@/../backend/src/routes/resource.routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

### 6. Create Frontend API Client (`client/lib/api-client/resource.ts`)

```typescript
import { apiClient } from "./index";
import type { Resource, CreateResourceRequest } from "@/../backend/src/types";

export class ResourceApi {
  async list() {
    const response = await apiClient.get<{ data: Resource[] }>("/resource");
    return response.data;
  }

  async create(data: CreateResourceRequest) {
    const response = await apiClient.post<{ data: Resource }>(
      "/resource",
      data
    );
    return response.data;
  }
}

export const resourceApi = new ResourceApi();
```

### 7. Create Hook (Optional) (`client/lib/hooks/use-resource.ts`)

```typescript
"use client";

import { useState, useEffect } from "react";
import { resourceApi } from "../api-client/resource";

export function useResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resourceApi.list().then((data) => {
      setResources(data);
      setLoading(false);
    });
  }, []);

  return { resources, loading };
}
```

## 🧪 Testing Endpoints

### Using cURL

```bash
# List resources
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/resource"

# Create resource
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  "http://localhost:3000/api/resource"
```

### Using Postman

1. Create a new request
2. Set method (GET, POST, etc.)
3. Set URL: `http://localhost:3000/api/resource`
4. Add header: `Authorization: Bearer YOUR_TOKEN`
5. For POST/PATCH, add JSON body
6. Send request

### Using Browser DevTools

```javascript
// In browser console
const token = "YOUR_TOKEN";

fetch("/api/shows?org_id=YOUR_ORG_ID", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then((r) => r.json())
  .then(console.log);
```

## 📚 Next Steps

1. **Test the shows endpoint** - Make sure it works
2. **Migrate venues endpoint** - Follow the same pattern
3. **Migrate team endpoint** - Repeat the pattern
4. **Update all components** - Replace server actions with API calls
5. **Remove old code** - Clean up old server actions

## 🆘 Troubleshooting

### Issue: Module not found '@/../backend/src/types'

**Solution**: Make sure you updated `tsconfig.json` with the path mapping:

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

### Issue: 401 Unauthorized

**Solution**: Make sure you're passing the auth token correctly:

```typescript
const supabase = createClient();
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;

// Use token in requests
fetch("/api/shows", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Issue: CORS errors

**Solution**: The backend runs on the same domain as Next.js, so CORS shouldn't be an issue. If you deploy the backend separately, configure CORS in middleware.

## 💡 Pro Tips

1. **Use TypeScript** - The types will guide you
2. **Start small** - Migrate one endpoint at a time
3. **Test often** - Test each endpoint before moving on
4. **Follow the pattern** - The shows example is your template
5. **Keep it clean** - Services for logic, controllers for HTTP

## 📖 Documentation

- [BACKEND_RESTRUCTURE.md](./BACKEND_RESTRUCTURE.md) - Full architecture overview
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Detailed migration steps
- [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) - Visual diagrams
- [backend/README.md](./backend/README.md) - Backend API docs
- [EXAMPLE_COMPONENT.tsx](./EXAMPLE_COMPONENT.tsx) - Usage examples

## ✅ Checklist

- [ ] Install backend dependencies
- [ ] Copy database types
- [ ] Configure environment variables
- [ ] Update tsconfig.json
- [ ] Test shows endpoint with cURL
- [ ] Create a test component
- [ ] Verify everything works
- [ ] Start migrating other endpoints

You're all set! 🎉 Start with the shows endpoint and follow the pattern for other resources.
