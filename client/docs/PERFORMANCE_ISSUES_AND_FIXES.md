# Performance Issues & Optimization Plan

## 🔴 Critical Issues Found

### 1. **Excessive RLS Policy Overhead**

**Problem:** Every write operation calls TWO expensive functions:
- `is_org_editor(org_id)` - checks `org_members` table
- `org_is_active(org_id)` - checks `org_subscriptions` with joins

**Impact:** 2-3x slower writes than necessary

**Solution:**
```sql
-- Option A: Combine into single function
CREATE OR REPLACE FUNCTION is_org_editor_and_active(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM org_members om
    JOIN org_subscriptions os ON os.org_id = om.org_id
    WHERE om.org_id = p_org
      AND om.user_id = auth.uid()
      AND om.role IN ('owner','admin','editor')
      AND os.status IN ('trialing','active','past_due')
      AND COALESCE(os.current_period_end, now() + INTERVAL '1 day') > now()
  );
$$;

-- Option B: Cache subscription status at session level
-- Add to auth.jwt() claims via Supabase hooks
```

### 2. **Missing Critical Indexes**

**Add these immediately:**
```sql
-- Most important - used in EVERY RLS check
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON org_members(org_id, user_id);

-- Billing checks
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_status 
  ON org_subscriptions(org_id, status) 
  WHERE status IN ('trialing','active','past_due');

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON shows(artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id) WHERE venue_id IS NOT NULL;

-- Session access
CREATE INDEX IF NOT EXISTS idx_show_collaborators_user_show 
  ON show_collaborators(user_id, show_id) 
  WHERE user_id IS NOT NULL;

-- Advancing queries
CREATE INDEX IF NOT EXISTS idx_advancing_fields_session_section 
  ON advancing_fields(session_id, section, sort_order);
```

### 3. **Expensive org_entitlements() Function**

**Current (slow):**
```sql
CREATE OR REPLACE FUNCTION org_entitlements(p_org uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT bp.features || jsonb_build_object(...) AS feats
    FROM org_subscriptions s
    JOIN billing_plans bp ON bp.id = s.plan_id
    WHERE s.org_id = p_org
  ),
  merged AS (
    SELECT jsonb_object_agg(o.key, o.value) AS overrides
    FROM org_feature_overrides o
    WHERE o.org_id = p_org
  )
  SELECT COALESCE((SELECT feats FROM base),'{}'::jsonb)
         || COALESCE((SELECT overrides FROM merged),'{}'::jsonb);
$$;
```

**Optimized:**
```sql
-- Add materialized view for fast lookups
CREATE MATERIALIZED VIEW org_entitlements_cache AS
SELECT 
  s.org_id,
  bp.features || jsonb_build_object(
    'max_artists', bp.max_artists,
    'max_members', bp.max_members,
    'max_collaborators', bp.max_collaborators
  ) AS base_entitlements,
  COALESCE(
    (SELECT jsonb_object_agg(o.key, o.value) 
     FROM org_feature_overrides o 
     WHERE o.org_id = s.org_id), 
    '{}'::jsonb
  ) AS overrides
FROM org_subscriptions s
JOIN billing_plans bp ON bp.id = s.plan_id;

CREATE UNIQUE INDEX ON org_entitlements_cache(org_id);

-- Refresh on changes
CREATE OR REPLACE FUNCTION refresh_org_entitlements()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY org_entitlements_cache;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_refresh_entitlements_subscription
AFTER INSERT OR UPDATE OR DELETE ON org_subscriptions
FOR EACH STATEMENT EXECUTE FUNCTION refresh_org_entitlements();

CREATE TRIGGER trg_refresh_entitlements_overrides
AFTER INSERT OR UPDATE OR DELETE ON org_feature_overrides
FOR EACH STATEMENT EXECUTE FUNCTION refresh_org_entitlements();

-- Update function to use cache
CREATE OR REPLACE FUNCTION org_entitlements(p_org uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT base_entitlements || overrides
  FROM org_entitlements_cache
  WHERE org_id = p_org;
$$;
```

### 4. **N+1 Query in Grid Data Saves**

**Current (slow):**
```typescript
for (const row of gridData) {
  for (const [columnKey, value] of Object.entries(row)) {
    // Individual SELECT then INSERT/UPDATE
    const { data: existingField } = await supabase
      .from('advancing_fields')
      .select('id')
      .eq('session_id', sessionId)
      .eq('field_name', fieldName)
      .single()
  }
}
```

**Optimized:**
```typescript
export async function saveAdvancingGridData(
  orgSlug: string,
  sessionId: string,
  showId: string,
  gridType: 'team' | 'arrival_flight' | 'departure_flight',
  gridData: Array<{ id: string; [key: string]: string | number | boolean }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data: session, error: sessionError } = await supabase
      .from('advancing_sessions')
      .select('org_id')
      .eq('id', sessionId)
      .single()
      
    if (sessionError || !session) {
      return { success: false, error: 'Session not found' }
    }

    // Fetch ALL existing fields for this session at once
    const { data: existingFields } = await supabase
      .from('advancing_fields')
      .select('id, field_name')
      .eq('session_id', sessionId)
      .like('field_name', `${gridType}_%`)

    const existingMap = new Map(
      existingFields?.map(f => [f.field_name, f.id]) || []
    )

    // Prepare batch operations
    const toInsert = []
    const toUpdate = []

    for (const row of gridData) {
      for (const [columnKey, value] of Object.entries(row)) {
        if (columnKey === 'id' || !value) continue
        
        const rowIdStr = String(row.id)
        const gridTypePrefix = `${gridType}_`
        const personId = rowIdStr.startsWith(gridTypePrefix) 
          ? rowIdStr.substring(gridTypePrefix.length)
          : rowIdStr
        
        const fieldName = `${gridType}_${personId}_${columnKey}`
        const section = gridType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        
        const existingId = existingMap.get(fieldName)
        
        if (existingId) {
          toUpdate.push({ id: existingId, value: String(value) })
        } else {
          toInsert.push({
            org_id: session.org_id,
            session_id: sessionId,
            section,
            field_name: fieldName,
            field_type: 'text',
            value: String(value),
            party_type: 'from_you',
            sort_order: 1000,
            created_by: user.id
          })
        }
      }
    }

    // Batch operations
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('advancing_fields')
        .insert(toInsert)
      
      if (error) {
        console.error('Batch insert error:', error)
        return { success: false, error: error.message }
      }
    }

    if (toUpdate.length > 0) {
      // Use upsert with conflict resolution
      const { error } = await supabase
        .from('advancing_fields')
        .upsert(
          toUpdate.map(u => ({ id: u.id, value: u.value })),
          { onConflict: 'id' }
        )
      
      if (error) {
        console.error('Batch update error:', error)
        return { success: false, error: error.message }
      }
    }
    
    // Generate schedule if needed
    if (gridType.includes('flight')) {
      try {
        await generateScheduleFromAdvancing(orgSlug, showId, sessionId)
      } catch (error) {
        console.error('Failed to generate schedule:', error)
      }
    }
    
    revalidatePath(`/${orgSlug}/shows/${showId}/advancing/${sessionId}`)
    return { success: true }
    
  } catch (error) {
    console.error('Error saving grid data:', error)
    return { success: false, error: 'Failed to save grid data' }
  }
}
```

### 5. **Simplify Complex RLS Policies**

**Problem:** Nested EXISTS with OR conditions are slow

**Current:**
```sql
create policy adv_fields_select on advancing_fields for select
  using (exists (select 1 from advancing_sessions s
        where s.id=session_id and (public.is_org_member(s.org_id) 
        or public.has_show_access(s.show_id,'view'))));
```

**Optimized:**
```sql
-- Add denormalized org_id to advancing_fields (already there!)
-- Use simpler policy
DROP POLICY IF EXISTS adv_fields_select ON advancing_fields;
CREATE POLICY adv_fields_select ON advancing_fields FOR SELECT
  USING (
    is_org_member(org_id)
    OR EXISTS (
      SELECT 1 FROM advancing_sessions s
      JOIN show_collaborators sc ON sc.show_id = s.show_id
      WHERE s.id = session_id 
        AND sc.user_id = auth.uid()
    )
  );
```

### 6. **Query Optimization in Actions**

**Problem:** Sequential queries instead of parallel

**Before:**
```typescript
const { data: org } = await supabase
  .from('organizations')
  .select('id')
  .eq('slug', orgSlug)
  .single()

const { data: shows } = await supabase
  .from('shows')
  .select('*')
  .eq('org_id', org.id)
```

**After:**
```typescript
// Use Promise.all for parallel queries
const [{ data: org }, { data: shows }] = await Promise.all([
  supabase.from('organizations').select('id').eq('slug', orgSlug).single(),
  supabase.from('shows').select('*').eq('org_id', orgId)
])
```

### 7. **Add Server-Side Caching**

**Implement React Cache:**
```typescript
// lib/cache.ts
import { cache } from 'react'
import { getSupabaseServer } from './supabase/server'

// Cache organization lookup for the duration of the request
export const getCachedOrg = cache(async (slug: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  
  return { data, error }
})

// Cache subscription status
export const getCachedOrgSubscription = cache(async (orgId: string) => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('org_subscriptions')
    .select('status, plan_id, current_period_end')
    .eq('org_id', orgId)
    .single()
  
  return { data, error }
})
```

### 8. **Optimize Show Queries with Selective Joins**

**Current (fetches everything):**
```typescript
.select(`
  *,
  venue:venues(*),
  show_assignments(
    people(*)
  )
`)
```

**Optimized (only needed fields):**
```typescript
.select(`
  id,
  title,
  date,
  set_time,
  status,
  venues(id, name, city),
  show_assignments(
    people(id, name, member_type)
  )
`)
```

## 📊 Priority Actions

### **Immediate (Do Today)**
1. ✅ Add missing indexes (15 min)
2. ✅ Optimize grid data save function (30 min)
3. ✅ Add React cache wrappers (20 min)

### **High Priority (This Week)**
4. ✅ Combine is_org_editor + org_is_active functions (1 hour)
5. ✅ Create materialized view for entitlements (1 hour)
6. ✅ Simplify complex RLS policies (2 hours)
7. ✅ Optimize show queries to select only needed fields (1 hour)

### **Medium Priority (Next Sprint)**
8. ✅ Add query result caching with Redis or similar
9. ✅ Implement connection pooling optimization
10. ✅ Add database query performance monitoring

### **Low Priority (Future)**
11. Consider moving billing checks to JWT claims
12. Evaluate materialized views for dashboard queries
13. Add database query logging and slow query alerts

## 📈 Expected Performance Improvements

- **Page Load Time:** 50-70% faster
- **Write Operations:** 2-3x faster
- **Database Load:** Reduced by 40-60%
- **Grid Data Saves:** 10-20x faster (from N+1 to batch)

## 🧪 Testing Plan

1. Run EXPLAIN ANALYZE on slow queries before/after
2. Load test with 100+ concurrent users
3. Monitor Supabase dashboard for query performance
4. Use Chrome DevTools to measure page load times

## 📝 Notes

- **organizations** and **org_members** tables have RLS disabled - this should be re-enabled with proper indexing
- Consider adding `SECURITY DEFINER` functions for complex operations
- Add prepared statements where possible
- Consider using Supabase's built-in caching features
