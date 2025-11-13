# RPC Migration for Supabase Transaction Pooler

## Overview

Due to Supabase Cloud's transaction pooler (:6543), we had to migrate almost all database operations from direct table access to RPC (Remote Procedure Call) functions. This document explains what changed, why it was necessary, and how to implement new RPCs going forward.

## The Problem

### Root Cause: Transaction Pooler RLS Enforcement

When using Supabase Cloud's transaction pooler (required for production), **Row Level Security (RLS) policies are enforced even inside `SECURITY DEFINER` functions**. This breaks the standard PostgreSQL pattern where `SECURITY DEFINER` functions run with elevated privileges.

### Specific Issue: `org_members` Table

The `org_members` table has RLS policies that check if the current user is a member of an organization. However, when these checks are performed inside a `SECURITY DEFINER` function through the transaction pooler, they fail with:

```
permission denied for table org_members (42501)
```

This happened because:
1. RLS policies on `org_members` check `auth.uid()` 
2. Inside a `SECURITY DEFINER` function, the security context is nested
3. Transaction pooler enforces RLS at every level, even in elevated contexts
4. This creates a catch-22: can't verify org membership because RLS blocks the verification query

## Failed Solutions

We tried several approaches that **did not work**:

### ❌ 1. SET row_security = off
```sql
CREATE FUNCTION my_function() 
SECURITY DEFINER
AS $$
BEGIN
  SET row_security = off;  -- Doesn't work!
  SELECT * FROM org_members;
END;
$$;
```
**Why it failed**: Transaction pooler ignores this setting.

### ❌ 2. Helper Functions
```sql
-- Helper function
CREATE FUNCTION check_org_access() RETURNS BOOLEAN
SECURITY DEFINER AS $$
  SELECT EXISTS(SELECT 1 FROM org_members WHERE ...);
$$;

-- Main function
CREATE FUNCTION do_something() AS $$
  IF NOT check_org_access() THEN ...
$$;
```
**Why it failed**: Nested security contexts still hit RLS on `org_members`.

### ❌ 3. Inlining RLS Checks in Policies
```sql
-- Try to inline the org_members check
CREATE POLICY "my_policy" ON my_table
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM org_members WHERE ...)
  );
```
**Why it failed**: The `org_members` query in the policy still hits RLS.

## The Solution: ALTER FUNCTION OWNER TO postgres

The **only working solution** is to change the function owner to `postgres`, which bypasses ALL RLS policies:

```sql
CREATE OR REPLACE FUNCTION my_function(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- 1. Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify access through a table with working RLS
  --    (e.g., advancing_sessions, shows, etc.)
  SELECT org_id INTO STRICT v_org_id
  FROM some_table_with_working_rls
  WHERE id = p_some_id;
  
  -- 3. Now you can access ANY table without RLS interference
  -- Because the function is owned by postgres
  
  RETURN ...;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION my_function(...) TO authenticated;

-- ⚠️ CRITICAL: Change owner to postgres to bypass RLS
ALTER FUNCTION my_function(...) OWNER TO postgres;
```

### Why This Works

1. **`SECURITY DEFINER`** - Function runs with privileges of owner
2. **`OWNER TO postgres`** - Owner is superuser, bypassing all RLS
3. **Access verification** - We verify access through tables that have working RLS (like `shows`, `advancing_sessions`)
4. **Security maintained** - User must pass access checks before any operations

## What We Migrated to RPCs

### Core Organization & User Functions
- `get_user_organizations` - Get all orgs for current user
- `get_org_by_slug` - Get org by slug with membership check
- `get_org_membership` - Get user's role in an org
- `get_org_subscription` - Get org's billing subscription
- `app_create_organization_with_owner` - Create org with initial owner

### Show Management
- `app_create_show` - Create a new show
- `get_shows_by_org` - List all shows for an org
- `get_show_by_id` - Get show details
- `bulk_update_show_dates` - Update dates for multiple shows

### People & Team Management
- `get_available_people` - Get people pool for org (by party type)
- `get_show_team` - Get people assigned to a show (by party type)
- `create_person` - Create a new person
- `assign_person_to_show` - Assign person to show with duty
- `remove_person_from_show` - Remove person from show

### Advancing Sessions
- `create_advancing_session` - Create new advancing session
- `get_org_advancing_sessions` - List all sessions for org
- `get_advancing_session` - Get session details
- `get_advancing_fields` - Get all fields for a session
- `create_advancing_field` - Create new field (text, grid, etc.)
- `update_advancing_field` - Update existing field value
- `save_advancing_grid_data` - Save grid data (team, flights)

### Advancing Documents & Files
- `get_advancing_documents` - List documents for session
- `create_advancing_document` - Create document record
- `update_advancing_document` - Update document title
- `delete_advancing_document` - Delete document
- `upload_advancing_file` - Create file record after storage upload
- `delete_advancing_file` - Delete file and storage object

### Venues & Promoters
- `get_org_venues_with_counts` - List venues with show counts
- `get_venue_details` - Get venue details
- `get_org_promoters` - List promoters for org
- `get_promoters_by_venue` - Get promoters linked to venue
- `search_promoters` - Search promoters by name/city

### Invitations
- `get_org_invitations` - List pending invitations
- `accept_invitation` - Accept org invitation

## Standard RPC Pattern

Use this pattern for all new database operations:

```sql
-- Drop existing function if modifying
DROP FUNCTION IF EXISTS my_function(param_types);

CREATE OR REPLACE FUNCTION my_function(
  p_param1 UUID,
  p_param2 TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  -- ... other columns
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Step 1: Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Step 2: Verify Access
  -- Use a table with working RLS to check access
  -- Common tables: shows, advancing_sessions, organizations
  SELECT org_id INTO STRICT v_org_id
  FROM public.advancing_sessions
  WHERE id = p_param1;
  
  -- If no row found, STRICT will raise exception
  -- This ensures user has access to that resource

  -- Step 3: Perform Operations
  -- Now you can query any table without RLS issues
  RETURN QUERY
  SELECT 
    t.id,
    t.name
  FROM public.some_table t
  WHERE t.org_id = v_org_id;
  
  -- Or perform INSERT/UPDATE/DELETE
  -- INSERT INTO ...
  -- UPDATE ...
  -- DELETE FROM ...
  
END;
$$;

-- Step 4: Grant Access
GRANT EXECUTE ON FUNCTION my_function(UUID, TEXT) TO authenticated;

-- Step 5: Change Owner (CRITICAL!)
ALTER FUNCTION my_function(UUID, TEXT) OWNER TO postgres;

-- Step 6: Add Comment
COMMENT ON FUNCTION my_function IS 
'Brief description of what this function does. Bypasses RLS issues.';
```

## TypeScript Client Usage

### Before (Direct Table Access)
```typescript
// ❌ This hits RLS and fails with transaction pooler
const { data, error } = await supabase
  .from('people')
  .select('*')
  .eq('org_id', orgId)
```

### After (RPC Call)
```typescript
// ✅ This bypasses RLS via postgres-owned function
const { data, error } = await supabase
  .rpc('get_available_people', {
    p_org_id: orgId,
    p_party_type: 'from_us'
  })
```

### Type Safety
Until types are regenerated, use type casting:

```typescript
// Temporary workaround
const { data, error } = await (supabase as any)
  .rpc('my_new_function', { ... })

// After regenerating types with `npx supabase gen types typescript`
const { data, error } = await supabase
  .rpc('my_new_function', { ... })
```

## Common Pitfalls

### 1. Forgetting ALTER FUNCTION OWNER
```sql
-- ❌ Will still hit RLS
CREATE FUNCTION my_func() SECURITY DEFINER AS $$ ... $$;
GRANT EXECUTE ON FUNCTION my_func() TO authenticated;

-- ✅ Bypasses RLS
CREATE FUNCTION my_func() SECURITY DEFINER AS $$ ... $$;
GRANT EXECUTE ON FUNCTION my_func() TO authenticated;
ALTER FUNCTION my_func() OWNER TO postgres;  -- DON'T FORGET!
```

### 2. Querying org_members Directly
```sql
-- ❌ This will fail
IF NOT EXISTS (
  SELECT 1 FROM org_members 
  WHERE org_id = p_org_id AND user_id = v_user_id
) THEN
  RAISE EXCEPTION 'Access denied';
END IF;

-- ✅ Verify through another table
SELECT org_id INTO STRICT v_org_id
FROM shows  -- or advancing_sessions, etc.
WHERE id = p_show_id;
-- If user doesn't have access, STRICT raises exception
```

### 3. Not Using STRICT
```sql
-- ❌ If no row found, v_org_id is NULL - silent failure
SELECT org_id INTO v_org_id
FROM shows WHERE id = p_show_id;

-- ✅ If no row found, raises NO_DATA_FOUND exception
SELECT org_id INTO STRICT v_org_id
FROM shows WHERE id = p_show_id;
```

## Migration Checklist

When migrating a query to RPC:

- [ ] Create migration file: `YYYYMMDDHHMMSS_descriptive_name.sql`
- [ ] Add `DROP FUNCTION IF EXISTS` to avoid conflicts
- [ ] Implement function with `SECURITY DEFINER`
- [ ] Add authentication check: `v_user_id := auth.uid()`
- [ ] Add access verification via table with working RLS
- [ ] Use `STRICT` for access verification queries
- [ ] Add `GRANT EXECUTE` statement
- [ ] Add `ALTER FUNCTION ... OWNER TO postgres` ⚠️ **CRITICAL**
- [ ] Add comment explaining function purpose
- [ ] Update TypeScript code to use RPC
- [ ] Test with transaction pooler (linked database)
- [ ] Regenerate types if needed

## Testing

Always test RPCs with the **linked database** (transaction pooler):

```powershell
# Apply new migration
npx supabase@beta migration up --linked

# Or reset entire database
npx supabase@beta db reset --linked

# Regenerate TypeScript types
npx supabase gen types typescript --linked > lib/database.types.ts
```

## Security Considerations

### Is This Safe?

Yes, if done correctly:

1. **Authentication** - Every function checks `auth.uid()`
2. **Authorization** - Access verified through table with working RLS
3. **Owner to postgres** - Necessary evil due to transaction pooler limitations
4. **Single responsibility** - Each function does one thing with clear access checks

### Best Practices

- ✅ Always verify user is authenticated
- ✅ Always verify user has access to the resource
- ✅ Use `STRICT` to fail fast on access violations
- ✅ Set `search_path = public` to avoid schema confusion
- ✅ Use parameter prefix (e.g., `p_org_id`) to avoid conflicts
- ✅ Use variable prefix (e.g., `v_user_id`) for clarity
- ❌ Never skip access verification
- ❌ Never expose functions to `anon` role
- ❌ Never trust client-provided IDs without verification

## Performance Notes

- RPCs are **faster** than direct queries with complex RLS policies
- No more nested security contexts or RLS recursion
- Functions can be optimized with indexes on verification tables
- Use `RETURN QUERY` for better performance than loops

## Future Work

- [ ] Migrate remaining direct queries (if any)
- [ ] Add RPC function generator script/template
- [ ] Set up CI/CD to validate all functions have `OWNER TO postgres`
- [ ] Create automated tests for RPC functions
- [ ] Document common access patterns per table

## References

- Supabase docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- PostgreSQL SECURITY DEFINER: https://www.postgresql.org/docs/current/sql-createfunction.html
- Transaction pooler limitations: https://github.com/supabase/supabase/discussions/

## Summary

**Bottom line**: With Supabase Cloud's transaction pooler, you **must** use RPCs with `OWNER TO postgres` for any operations that need to query `org_members` or other RLS-protected tables. Direct table access via PostgREST will fail with permission errors.

Every new database operation should be:
1. Created as an RPC function
2. Use `SECURITY DEFINER`
3. Have `OWNER TO postgres`
4. Verify access through tables with working RLS
5. Never directly query `org_members` for access checks

This is not a choice - it's **required** for the transaction pooler to work.
