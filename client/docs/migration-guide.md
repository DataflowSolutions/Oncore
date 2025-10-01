# Migration Guide: Server Actions → Service Layer

This guide shows how to gradually migrate your existing Server Actions to use the new service layer for better mobile compatibility.

## Why Migrate?

**Current Problem:**
```typescript
// lib/actions/shows.ts - Only works in Next.js
'use server'
export async function createShow(data: ShowFormData) {
  const supabase = await getSupabaseServer()
  return await supabase.from('shows').insert([data])
}
```

**Flutter can't call this!** Server Actions are React Server Components magic.

**Solution:**
```typescript
// lib/services/show-service.ts - Works everywhere
export class ShowService {
  async createShow(data: ShowFormData) {
    return await this.supabase.from('shows').insert([data])
  }
}
```

**Both Next.js AND Flutter can use this!**

---

## Migration Strategy

### Phase 1: Keep Server Actions (Current)
✅ No changes needed for MVP
✅ Keep shipping features
✅ Service layer exists alongside Server Actions

### Phase 2: Gradual Migration (When starting mobile)
✅ New features use service layer
✅ Migrate Server Actions incrementally
✅ Both coexist during transition

### Phase 3: Complete (Mobile launch)
✅ All logic in service layer or RPC functions
✅ Server Actions remain as thin wrappers
✅ Code fully shared

---

## Example Migrations

### Example 1: Simple CRUD Operation

**Before (Server Action only):**
```typescript
// lib/actions/shows.ts
'use server'

export async function getShowsByOrg(orgId: string) {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('org_id', orgId)
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}
```

**After (Service layer + thin wrapper):**
```typescript
// lib/services/show-service.ts
import { SupabaseClient } from '@supabase/supabase-js'

export class ShowService {
  constructor(private supabase: SupabaseClient) {}

  async getShowsByOrg(orgId: string) {
    const { data, error } = await this.supabase
      .from('shows')
      .select('*, venues(*)')
      .eq('org_id', orgId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data
  }
}
```

```typescript
// lib/actions/shows.ts (keep for Next.js convenience)
'use server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ShowService } from '@/lib/services/show-service'

export async function getShowsByOrg(orgId: string) {
  const supabase = await getSupabaseServer()
  const service = new ShowService(supabase)
  return await service.getShowsByOrg(orgId)
}
```

**Flutter usage (new!):**
```dart
final supabase = Supabase.instance.client;
final shows = await supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('org_id', orgId)
    .order('date', ascending: false);
```

---

### Example 2: Complex Multi-Step Operation

**Before (Server Action with multiple steps):**
```typescript
// lib/actions/advancing.ts
'use server'

export async function createAdvancingSession(showId: string, orgId: string) {
  const supabase = await getSupabaseServer()
  
  // Generate access code
  const accessCode = generateAccessCode()
  
  // Create session
  const { data: session } = await supabase
    .from('advancing_sessions')
    .insert([{ show_id: showId, org_id: orgId, access_code: accessCode }])
    .select()
    .single()
  
  // Create default hospitality
  await supabase
    .from('hospitality')
    .insert([{ session_id: session.id }])
  
  // Create default technical
  await supabase
    .from('technical')
    .insert([{ session_id: session.id }])
  
  return session
}
```

**After (RPC function + service wrapper):**

```sql
-- supabase/migrations/20250101000000_add_rpc_functions.sql
CREATE OR REPLACE FUNCTION create_advancing_session(
  p_show_id uuid,
  p_org_id uuid
) RETURNS json AS $$
DECLARE
  v_session_id uuid;
  v_access_code text;
BEGIN
  -- Generate unique access code
  v_access_code := upper(substring(md5(random()::text) from 1 for 8));
  
  -- Create session
  INSERT INTO advancing_sessions (show_id, org_id, access_code, created_by)
  VALUES (p_show_id, p_org_id, v_access_code, auth.uid())
  RETURNING id INTO v_session_id;
  
  -- Create defaults
  INSERT INTO hospitality (session_id, created_by)
  VALUES (v_session_id, auth.uid());
  
  INSERT INTO technical (session_id, created_by)
  VALUES (v_session_id, auth.uid());
  
  -- Return session data
  RETURN (SELECT row_to_json(t) FROM (
    SELECT * FROM advancing_sessions WHERE id = v_session_id
  ) t);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// lib/services/advancing-service.ts
export class AdvancingService {
  constructor(private supabase: SupabaseClient) {}

  async createSession(showId: string, orgId: string) {
    const { data, error } = await this.supabase
      .rpc('create_advancing_session', {
        p_show_id: showId,
        p_org_id: orgId,
      })
    
    if (error) throw error
    return data
  }
}
```

```typescript
// lib/actions/advancing.ts (thin wrapper)
'use server'
export async function createAdvancingSession(showId: string, orgId: string) {
  const supabase = await getSupabaseServer()
  const service = new AdvancingService(supabase)
  return await service.createSession(showId, orgId)
}
```

**Flutter usage:**
```dart
final session = await supabase.rpc('create_advancing_session', params: {
  'p_show_id': showId,
  'p_org_id': orgId,
});
```

**Benefits:**
- ✅ Logic runs in one database transaction (faster + safer)
- ✅ Works identically on web and mobile
- ✅ Can't have partial failures (atomic)

---

### Example 3: External API Call

**Before (Server Action calling Stripe):**
```typescript
// lib/actions/stripe.ts
'use server'

export async function createCheckoutSession(planName: string) {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: PRICE_IDS[planName], quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
  })
  
  return session
}
```

**After (Keep as Server Action, add Edge Function for webhook):**

Keep the Server Action for checkout (only called from web):
```typescript
// lib/actions/stripe.ts - Unchanged
'use server'
export async function createCheckoutSession(planName: string) {
  // Same as before
}
```

Add Edge Function for webhook (called by Stripe, updates database):
```typescript
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'stripe'

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
  const event = stripe.webhooks.constructEvent(...)
  
  if (event.type === 'checkout.session.completed') {
    const supabase = getSupabaseClient()
    await supabase.from('subscriptions').insert({...})
  }
  
  return new Response('OK')
})
```

**Mobile usage:**
- Mobile app doesn't create Stripe sessions directly
- Mobile uses in-app purchases (Apple/Google)
- Or redirects to web for payment
- Webhook updates database for both web and mobile

---

## When to Use Each Approach

### Use Direct Supabase Queries (Simple CRUD)
```typescript
// ✅ Reading data
getShowsByOrg()
getShowById()

// ✅ Simple creates/updates
createShow()
updateShow()
deleteShow()
```

### Use RPC Functions (Complex Operations)
```sql
-- ✅ Multi-step operations
create_advancing_session()

-- ✅ Operations needing validation
submit_hospitality()

-- ✅ Operations spanning multiple tables
bulk_update_show_dates()
```

### Use Edge Functions (External Integrations)
```typescript
// ✅ Webhooks from external services
stripe-webhook

// ✅ Sending emails
send-email

// ✅ Generating files
generate-pdf
```

### Keep as Server Actions (Next.js Only)
```typescript
// ✅ Operations using cookies/headers
'use server'
export async function loginUser() {
  const supabase = await getSupabaseServer() // Uses cookies
  // ...
}

// ✅ Quick prototyping
'use server'
export async function quickFeature() {
  // Can refactor later
}
```

---

## Step-by-Step Migration Process

### Step 1: Identify Server Action to Migrate
```typescript
// lib/actions/shows.ts
export async function createShow(data: ShowFormData) {
  const supabase = await getSupabaseServer()
  return await supabase.from('shows').insert([data])
}
```

### Step 2: Decide Migration Path

**Is it simple CRUD?** → Service layer
**Is it complex multi-step?** → RPC function
**Does it call external APIs?** → Edge function

### Step 3: Implement New Layer

**For CRUD (Service Layer):**
```typescript
// lib/services/show-service.ts
export class ShowService {
  constructor(private supabase: SupabaseClient) {}
  
  async createShow(data: ShowFormData) {
    const { data: show, error } = await this.supabase
      .from('shows')
      .insert([data])
      .select()
      .single()
    
    if (error) throw error
    return show
  }
}
```

**For Complex (RPC Function):**
```sql
CREATE OR REPLACE FUNCTION create_show_with_defaults(
  p_title text,
  p_date date,
  p_org_id uuid
) RETURNS json AS $$
  -- Multi-step logic here
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 4: Update Server Action to Use New Layer

```typescript
// lib/actions/shows.ts
'use server'
import { ShowService } from '@/lib/services/show-service'

export async function createShow(data: ShowFormData) {
  const supabase = await getSupabaseServer()
  const service = new ShowService(supabase)
  return await service.createShow(data)
}
```

### Step 5: Document for Mobile Team

```dart
// docs/mobile-api-reference.md
// Add Flutter usage example:
final show = await supabase
    .from('shows')
    .insert({'title': title, 'date': date, 'org_id': orgId})
    .select()
    .single();
```

### Step 6: Test Both Platforms

**Web (Next.js):**
```typescript
import { createShow } from '@/lib/actions/shows'
await createShow(formData) // Still works!
```

**Mobile (Flutter):**
```dart
// New capability!
final show = await supabase.from('shows').insert({...});
```

---

## Migration Checklist

When migrating a Server Action:

- [ ] Identify if it's CRUD, complex, or external API
- [ ] Choose service layer, RPC, or Edge Function
- [ ] Implement new layer
- [ ] Update Server Action to be thin wrapper
- [ ] Test in Next.js (ensure no breakage)
- [ ] Document Flutter usage
- [ ] Add to mobile API reference
- [ ] Test RLS policies work for both web/mobile

---

## Common Patterns

### Pattern 1: CRUD with Authorization

**Before:**
```typescript
'use server'
export async function updateShow(showId: string, data: ShowFormData) {
  const supabase = await getSupabaseServer()
  
  // Manual auth check
  const { data: { user } } = await supabase.auth.getUser()
  const member = await supabase
    .from('org_members')
    .select()
    .eq('user_id', user.id)
    .eq('org_id', data.orgId)
    .single()
  
  if (!member) throw new Error('Unauthorized')
  
  return await supabase.from('shows').update(data).eq('id', showId)
}
```

**After (RLS does authorization):**
```typescript
// Just remove manual check - RLS handles it!
export class ShowService {
  async updateShow(showId: string, data: ShowFormData) {
    const { data: show, error } = await this.supabase
      .from('shows')
      .update(data)
      .eq('id', showId)
      .select()
      .single()
    
    if (error) throw error // RLS will reject if unauthorized
    return show
  }
}
```

### Pattern 2: Batch Operations

**Before (N+1 queries):**
```typescript
'use server'
export async function deleteShows(showIds: string[]) {
  const supabase = await getSupabaseServer()
  
  for (const id of showIds) {
    await supabase.from('shows').delete().eq('id', id)
  }
}
```

**After (Single query):**
```typescript
export class ShowService {
  async deleteShows(showIds: string[]) {
    const { error } = await this.supabase
      .from('shows')
      .delete()
      .in('id', showIds)
    
    if (error) throw error
  }
}
```

### Pattern 3: Related Data

**Before (Multiple queries):**
```typescript
'use server'
export async function getShowWithDetails(showId: string) {
  const supabase = await getSupabaseServer()
  
  const show = await supabase.from('shows').select().eq('id', showId).single()
  const venue = await supabase.from('venues').select().eq('id', show.venue_id).single()
  const sessions = await supabase.from('advancing_sessions').select().eq('show_id', showId)
  
  return { ...show, venue, sessions }
}
```

**After (Single query with joins):**
```typescript
export class ShowService {
  async getShowWithDetails(showId: string) {
    const { data, error } = await this.supabase
      .from('shows')
      .select(`
        *,
        venues (*),
        advancing_sessions (*)
      `)
      .eq('id', showId)
      .single()
    
    if (error) throw error
    return data
  }
}
```

---

## Testing Migration

Create test to verify both paths work:

```typescript
// __tests__/services/show-service.test.ts
import { ShowService } from '@/lib/services/show-service'
import { createShow } from '@/lib/actions/shows'

describe('Show creation', () => {
  it('works via service layer', async () => {
    const service = new ShowService(supabase)
    const show = await service.createShow(testData)
    expect(show).toBeDefined()
  })

  it('works via Server Action', async () => {
    const show = await createShow(testData)
    expect(show).toBeDefined()
  })
})
```

---

## Summary

**You don't need to migrate everything now!**

1. ✅ **Keep Server Actions** for MVP (they work great)
2. ✅ **Use service layer** for new features (mobile-ready)
3. ✅ **Migrate gradually** as you need mobile access
4. ✅ **Both coexist** during transition

**The key:** Your architecture now supports both web-only (Server Actions) and cross-platform (service layer/RPC) code, giving you flexibility to migrate at your own pace.

---

**Next: Ship your web MVP, then start mobile when ready!** 🚀
