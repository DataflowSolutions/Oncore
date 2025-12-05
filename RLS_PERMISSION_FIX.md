# Production RLS Permission Error - Mobile App

## Error
```
PostgrestException(message: {"code":"42501",...,"message":"permission denied for table shows"}, code: 403)
```

## Root Cause

The mobile app is trying to access the `shows` table, but the RLS policy denies access because:

```sql
-- RLS Policy on shows table
create policy shows_rw on shows for all 
  using (is_org_member(org_id)) 
  with check (is_org_member(org_id));

-- The is_org_member function requires:
select exists (
  select 1
  from org_members om
  where om.org_id = p_org
    and om.user_id = auth.uid()
    and om.status = 'active'  -- ← User must be ACTIVE
);
```

**The problem:** The authenticated user is either:
1. **Not a member** of the organization they're trying to access
2. **Not an active member** (status is not 'active')

## Diagnosis

### Check 1: Verify User is a Member
Run this in Supabase SQL Editor (make sure you're logged in as the test user):

```sql
-- Who am I?
SELECT auth.uid();

-- Are you a member of org 1006a009-7b23-4384-af24-4c58ac8a4ddf?
SELECT * FROM org_members 
WHERE user_id = auth.uid() 
  AND org_id = '1006a009-7b23-4384-af24-4c58ac8a4ddf'::uuid;

-- What orgs am I a member of?
SELECT om.org_id, o.name, om.role, om.status 
FROM org_members om
JOIN organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid();
```

### Check 2: Test RLS Policy Directly
```sql
-- Can this org pass the RLS check?
SELECT is_org_member('1006a009-7b23-4384-af24-4c58ac8a4ddf'::uuid);
```

Expected: `true` if user is an active member, `false` if not.

### Check 3: Verify Shows Exist
```sql
-- Do shows exist in this org? (using service role)
SELECT id, title, date FROM shows 
WHERE org_id = '1006a009-7b23-4384-af24-4c58ac8a4ddf'::uuid
LIMIT 5;
```

## Solution

### Option 1: Add User as Active Member (Recommended for Development)

In Supabase SQL Editor (with service role access):

```sql
-- Get current user's ID
SELECT auth.uid();

-- Add user as active member with 'editor' role
INSERT INTO org_members (org_id, user_id, role, status)
VALUES (
  '1006a009-7b23-4384-af24-4c58ac8a4ddf'::uuid,
  auth.uid(),
  'editor',
  'active'
)
ON CONFLICT (org_id, user_id) 
DO UPDATE SET status = 'active', role = 'editor';
```

Then test in the mobile app - it should now work!

### Option 2: Create a Test Org with Proper Membership (For Fresh Start)

```sql
-- Create a new org
INSERT INTO organizations (name, slug)
VALUES ('Test Org', 'test-org-' || gen_random_uuid()::text)
RETURNING id;

-- Note the returned ID, then:
INSERT INTO org_members (org_id, user_id, role, status)
VALUES (
  '<the-id-from-above>',
  auth.uid(),
  'owner',
  'active'
);
```

Then the user should see this org in the mobile app home screen.

### Option 3: Check Migration for Seeded Data

The database might have seeded test data. Check:
1. **Do test users exist?** Look in `auth.users` via Supabase dashboard
2. **Do test orgs exist?** Query `organizations` table
3. **Are they linked?** Check `org_members` table

## Mobile App Flow

1. User logs in → auth state updates
2. App calls `get_user_organizations()` RPC
   - Returns all orgs where user is a member (any status)
3. User taps an org → navigates to `/org/{orgId}/shows`
4. App tries to fetch shows via `showsByOrgProvider`
   - Calls `get_shows_by_org` RPC
   - **This fails** if user's status is not 'active'

## Why the Error Happens

The RPC functions like `get_shows_by_org` query the shows table, which has RLS enabled. The RLS policy checks `is_org_member()`, which requires `status = 'active'`.

```
User logged in ✓
  ↓
User is member ✓
  ↓
User status = 'active'? ❌ ERROR: "permission denied for table shows"
```

## For Production

In production with real users:
- Users sign up
- An organization owner invites them via email
- They accept the invitation → status becomes 'active'
- They can now access all org data

**Make sure your invitation/signup flow properly sets `status = 'active'` in org_members!**

## Quick Fix for Development

```bash
# 1. Open Supabase dashboard
# 2. Go to SQL Editor
# 3. Run this (replace UUIDs with real ones):

INSERT INTO org_members (org_id, user_id, role, status) 
VALUES ('1006a009-7b23-4384-af24-4c58ac8a4ddf'::uuid, auth.uid(), 'editor', 'active')
ON CONFLICT (org_id, user_id) DO UPDATE SET status = 'active';

# 4. Restart mobile app
# 5. Should work now!
```

---

**Last Updated:** December 4, 2025
