# Oncore Hybrid Architecture Documentation

## Overview

Oncore uses a **hybrid architecture** that combines Next.js, Supabase, and Edge Functions to provide a scalable foundation for both web and mobile applications.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: CLIENT APPS                      │
│  Next.js Web App (Vercel) + Flutter Mobile App (iOS/Android)│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 LAYER 2: SUPABASE BACKEND                    │
│  - Authentication (Supabase Auth)                           │
│  - Database (Postgres with RLS)                             │
│  - Real-time (Supabase Realtime)                           │
│  - Storage (Supabase Storage)                              │
│  - RPC Functions (Complex operations)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 3: EDGE FUNCTIONS (Deno)                  │
│  - stripe-webhook: Payment processing                       │
│  - send-email: Notification emails                          │
│  - generate-advancing-pdf: PDF generation                   │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
client/
├── app/                          # Next.js app directory
│   ├── (app)/[org]/             # Organization routes (web)
│   ├── (auth)/                  # Authentication pages
│   ├── (marketing)/             # Public marketing pages
│   └── api/                     # Next.js API routes (future)
│
├── lib/
│   ├── actions/                 # Server Actions (Next.js only)
│   │   ├── shows.ts
│   │   ├── advancing.ts
│   │   └── team.ts
│   │
│   ├── services/                # Shared service layer (web + mobile)
│   │   ├── show-service.ts      # Platform-agnostic queries
│   │   ├── advancing-service.ts
│   │   └── organization-service.ts
│   │
│   └── supabase/                # Supabase clients
│       ├── client.ts            # Browser client
│       └── server.ts            # Server client
│
└── supabase/
    ├── functions/               # Edge Functions (Deno)
    │   ├── _shared/             # Shared utilities
    │   │   ├── supabase.ts
    │   │   └── responses.ts
    │   ├── stripe-webhook/
    │   ├── send-email/
    │   └── generate-advancing-pdf/
    │
    └── migrations/              # Database migrations
        └── 20250101000000_add_rpc_functions.sql
```

## Key Concepts

### 1. Server Actions (Next.js Only)

Server Actions are React Server Components features that only work in Next.js:

```typescript
// client/lib/actions/shows.ts
'use server'

export async function createShow(data: ShowFormData) {
  const supabase = await getSupabaseServer()
  return await supabase.from('shows').insert([data])
}
```

**Use Server Actions for:**
- Next.js web app operations
- Operations that need cookies/headers
- Quick prototyping

### 2. Service Layer (Platform-Agnostic)

Service classes contain reusable Supabase queries that work identically in Next.js and Flutter:

```typescript
// client/lib/services/show-service.ts
export class ShowService {
  constructor(private supabase: SupabaseClient) {}
  
  async getShowsByOrg(orgId: string) {
    return await this.supabase
      .from('shows')
      .select('*, venues(*)')
      .eq('org_id', orgId)
  }
}
```

**Next.js usage:**
```typescript
const supabase = await getSupabaseServer()
const service = new ShowService(supabase)
const shows = await service.getShowsByOrg(orgId)
```

**Flutter usage:**
```dart
final supabase = Supabase.instance.client;
// Implement same query in Dart
final shows = await supabase
  .from('shows')
  .select('*, venues(*)')
  .eq('org_id', orgId);
```

### 3. RPC Functions (Database-Level Logic)

For complex multi-step operations, use Postgres functions:

```sql
-- supabase/migrations/20250101000000_add_rpc_functions.sql
CREATE OR REPLACE FUNCTION create_advancing_session(
  p_show_id uuid,
  p_org_id uuid
) RETURNS json AS $$
BEGIN
  -- Generate access code
  -- Create session
  -- Create default hospitality/technical/production
  -- Log activity
  RETURN session_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Call from Next.js:**
```typescript
const { data } = await supabase.rpc('create_advancing_session', {
  p_show_id: showId,
  p_org_id: orgId
})
```

**Call from Flutter:**
```dart
final data = await supabase.rpc('create_advancing_session', params: {
  'p_show_id': showId,
  'p_org_id': orgId,
});
```

### 4. Edge Functions (External Integrations)

Edge Functions handle operations that need custom logic or external APIs:

**Stripe Webhook:**
```typescript
// supabase/functions/stripe-webhook/index.ts
serve(async (req) => {
  const event = stripe.webhooks.constructEvent(...)
  // Update database based on webhook
})
```

**Email Sending:**
```typescript
// supabase/functions/send-email/index.ts
serve(async (req) => {
  const { to, subject, type, data } = await req.json()
  // Send email via Resend
  // Log email sent
})
```

## Mobile App Integration (Flutter)

### Setup

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  await Supabase.initialize(
    url: 'https://tabcxfaqqkfbchbxgogl.supabase.co',
    anonKey: 'your_anon_key',
  );
  runApp(MyApp());
}
```

### Authentication

```dart
// Sign up
await supabase.auth.signUp(
  email: email,
  password: password,
);

// Sign in
await supabase.auth.signInWithPassword(
  email: email,
  password: password,
);

// Get current user
final user = supabase.auth.currentUser;
```

### Queries (Same as Web)

```dart
// Get shows
final shows = await supabase
  .from('shows')
  .select('*, venues(*)')
  .eq('org_id', orgId);

// Create show
final show = await supabase
  .from('shows')
  .insert({
    'title': title,
    'date': date,
    'org_id': orgId,
  })
  .select()
  .single();
```

### Real-time Subscriptions

```dart
final channel = supabase
  .channel('session:$sessionId')
  .onPostgresChanges(
    event: PostgresChangeEvent.all,
    schema: 'public',
    table: 'hospitality',
    filter: PostgresChangeFilter(
      type: PostgresChangeFilterType.eq,
      column: 'session_id',
      value: sessionId,
    ),
    callback: (payload) {
      print('Change received: ${payload.newRecord}');
    },
  )
  .subscribe();
```

### Call Edge Functions

```dart
import 'package:http/http.dart' as http;

// Send email
final response = await http.post(
  Uri.parse('https://tabcxfaqqkfbchbxgogl.supabase.co/functions/v1/send-email'),
  headers: {
    'Authorization': 'Bearer ${supabase.auth.currentSession?.accessToken}',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'to': 'venue@example.com',
    'subject': 'Advancing Session Shared',
    'type': 'advancing-shared',
    'data': {
      'showTitle': 'My Show',
      'accessLink': 'https://oncore.app/s/ABC123',
    },
  }),
);
```

## Deployment

### Edge Functions

```powershell
# Deploy all functions
cd client/supabase/functions
./deploy.ps1

# Deploy single function
supabase functions deploy stripe-webhook --no-verify-jwt
```

### Environment Variables

Set in Supabase Dashboard → Project Settings → Edge Functions:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

### Database Migrations

```powershell
# Apply migrations
supabase db push

# Create new migration
supabase migration new add_new_feature
```

## Best Practices

### 1. When to Use Each Layer

| Operation | Use |
|-----------|-----|
| Simple CRUD | Direct Supabase queries (Next.js Server Actions or Flutter) |
| Complex multi-step | Supabase RPC functions |
| External APIs | Edge Functions |
| Long-running tasks | Next.js API routes (future) |
| Background jobs | Separate worker service (future) |

### 2. Security

- **Always use RLS policies** for data access control
- **Never expose service role key** to clients
- **Validate input** in RPC functions and Edge Functions
- **Use environment variables** for secrets

### 3. Performance

- **Use RLS** instead of manual authorization (faster)
- **Batch operations** in RPC functions (atomic)
- **Cache frequently accessed data** with React Query/SWR
- **Use Supabase Realtime** for live updates

### 4. Type Safety

```typescript
// Generate types from database schema
supabase gen types typescript --project-id tabcxfaqqkfbchbxgogl > lib/database.types.ts

// Import in your code
import { Database } from '@/lib/database.types'
type Show = Database['public']['Tables']['shows']['Row']
```

## Troubleshooting

### Edge Function Errors

Check logs:
```powershell
supabase functions logs stripe-webhook --follow
```

### RLS Policy Issues

Test policies:
```sql
-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-id-here"}';
SELECT * FROM shows;
```

### Type Mismatches

Regenerate types after schema changes:
```powershell
supabase gen types typescript --local > lib/database.types.ts
```

## Future Enhancements

### Phase 1 (Completed) ✅
- [x] Edge Functions for Stripe, email, PDF
- [x] RPC functions for complex operations
- [x] Service layer for code sharing

### Phase 2 (Next 3-6 months)
- [ ] Background worker for digest emails
- [ ] Next.js API routes for heavy processing
- [ ] Advanced caching strategy
- [ ] Analytics integration

### Phase 3 (6-12 months)
- [ ] Mobile app beta release
- [ ] Push notifications
- [ ] Offline support
- [ ] Multi-region deployment

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Flutter Supabase SDK](https://supabase.com/docs/reference/dart/introduction)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
