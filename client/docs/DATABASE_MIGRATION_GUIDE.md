# Database Migration Guide

## Overview

This guide documents the database consolidation migrations created on November 4, 2025. These migrations address redundancies and improve the database architecture.

---

## ✅ Migration Files Created

### 1. **20251104230000_consolidate_partners_promoters.sql**
**Purpose:** Merge `partners` and `promoters` tables into unified `contacts` table

**Changes:**
- Creates new `contacts` table with type field (promoter, agent, manager, vendor, other)
- Migrates all data from `promoters` → `contacts` (type='promoter')
- Migrates all data from `partners` → `contacts` (type inferred from role field)
- Renames `partner_commissions` → `contact_commissions`
- Renames `venue_promoters` → `venue_contacts`
- Updates all foreign keys and RLS policies
- Drops old `partners` and `promoters` tables

**Impact:**
- **BREAKING:** All code referencing partners/promoters must be updated
- See "Application Code Changes" section below

---

### 2. **20251104231000_simplify_show_collaborators.sql**
**Purpose:** Remove duplicate invitation system from `show_collaborators`

**Changes:**
- Removes columns: `invite_token`, `invited_by`, `accepted_at`, `status`
- Adds `updated_at` column
- Creates new function: `app_add_show_collaborator()`
- Drops old invitation functions
- Updates RLS policies
- Enforces constraint: collaborators must be org members first

**New Flow:**
1. User invited to org via `invitations` table
2. User accepts → added to `org_members` and `people`
3. Grant show access → add to `show_collaborators`

**Impact:**
- **BREAKING:** Show invite functions removed
- Use `invitations` system instead

---

### 3. **20251104232000_sync_people_org_members.sql**
**Purpose:** Clarify and enforce relationship between `people` and `org_members`

**Changes:**
- Adds constraint: people with `user_id` must be in `org_members`
- Creates trigger: `sync_person_to_org_members()` - auto-syncs when user_id set
- Creates reverse trigger: `link_org_member_to_person()` - links by email
- Creates helper: `can_person_get_user_access()` function
- Updates RLS policies

**Impact:**
- Non-breaking: Existing data fixed automatically
- Clarifies semantics of people vs org_members

---

### 4. **20251104233000_drop_org_seats.sql**
**Purpose:** Remove unused `org_seats` table

**Changes:**
- Drops `org_seats` table (never populated)
- Recreates optimized `org_seat_usage` VIEW
- Updates `check_org_limits()` function
- Updates `check_available_seats()` function

**Impact:**
- Non-breaking: Table was unused
- All seat checking uses VIEW

---

### 5. **20251104234000_consolidate_logging.sql**
**Purpose:** Merge `billing_actions_log` into `activity_log`

**Changes:**
- Adds `category` column to `activity_log`
- Migrates all `billing_actions_log` data
- Drops `billing_actions_log` table
- Creates `billing_actions_log` VIEW for backward compatibility
- Creates `log_billing_action()` helper function
- Updates billing functions to use new logging

**Impact:**
- Semi-breaking: Direct inserts to `billing_actions_log` will fail
- VIEW provides backward compatibility for reads

---

## 📋 Application Code Changes Required

### High Priority (Required for migrations to work)

#### 1. Update TypeScript Types

**File:** `lib/database.types.ts`

```bash
# Regenerate types from Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
```

#### 2. Update Promoters Actions

**File:** `lib/actions/promoters.ts` → Rename to `lib/actions/contacts.ts`

**Changes:**
```typescript
// OLD
from('promoters')
from('venue_promoters')

// NEW
from('contacts').eq('type', 'promoter')
from('venue_contacts')
```

**Functions to update:**
- `getPromotersByOrg()` → `getContactsByOrg(type?: string)`
- `getPromotersByVenue()` → `getContactsByVenue()`
- `createPromoter()` → `createContact()`
- `updatePromoter()` → `updateContact()`
- `deletePromoter()` → `deleteContact()`

**Example:**
```typescript
// OLD
export async function getPromotersByOrg(orgId: string) {
  const { data } = await supabase
    .from('promoters')
    .select('*')
    .eq('org_id', orgId)
  return { data }
}

// NEW
export async function getContactsByOrg(orgId: string, type?: string) {
  let query = supabase
    .from('contacts')
    .select('*')
    .eq('org_id', orgId)
  
  if (type) {
    query = query.eq('type', type)
  }
  
  const { data } = await query
  return { data }
}

// Helper for backward compatibility
export async function getPromotersByOrg(orgId: string) {
  return getContactsByOrg(orgId, 'promoter')
}
```

#### 3. Update UI Components

**Files to update:**
- `components/promoters/*` → Rename to `components/contacts/*` (or keep as promoters)
- Any component importing from `lib/actions/promoters.ts`

**Search and replace:**
```bash
# Find all references
grep -r "promoters\|partners" app/ components/ lib/
```

**Component changes:**
```tsx
// Update imports
import { getPromotersByOrg } from '@/lib/actions/contacts'

// Update table names in queries
.from('contacts').eq('type', 'promoter')

// Update prop types to use new database types
type ContactProps = {
  contact: Database['public']['Tables']['contacts']['Row']
}
```

#### 4. Update Show Collaborator Logic

**Remove old invite functions:**
- `app_invite_collaborator()`
- `app_send_show_invite()`
- `app_accept_show_invite()`

**Use new flow:**
```typescript
// 1. Invite user to org (creates invitation)
await inviteUserToOrg(orgId, email, personId)

// 2. User accepts invitation (handled by accept_invitation function)
// This adds them to org_members and links to people

// 3. Grant show access
await supabase.rpc('app_add_show_collaborator', {
  p_show_id: showId,
  p_user_id: userId,
  p_role: 'promoter_viewer'
})
```

#### 5. Update Billing Logging

**Replace direct inserts:**
```typescript
// OLD
await supabase.from('billing_actions_log').insert({
  org_id: orgId,
  action: 'plan_changed',
  previous_state: oldPlan,
  new_state: newPlan
})

// NEW
await supabase.rpc('log_billing_action', {
  p_org_id: orgId,
  p_action: 'plan_changed',
  p_details: {
    previous_state: oldPlan,
    new_state: newPlan
  }
})

// OR use activity_log directly
await supabase.from('activity_log').insert({
  org_id: orgId,
  action: 'plan_changed',
  resource_type: 'billing',
  category: 'billing',
  details: { previous_state: oldPlan, new_state: newPlan }
})
```

---

## 🧪 Testing Checklist

### Before Running Migrations

- [ ] Backup production database
- [ ] Test migrations in local/dev environment first
- [ ] Verify no code directly references dropped tables

### After Running Migrations

#### Database Integrity
```sql
-- Verify contacts migration
SELECT type, COUNT(*) FROM contacts GROUP BY type;

-- Verify no orphaned people
SELECT COUNT(*) FROM people p
WHERE p.user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM org_members om
  WHERE om.org_id = p.org_id AND om.user_id = p.user_id
);

-- Verify seat usage view works
SELECT * FROM org_seat_usage LIMIT 5;

-- Verify billing logs migrated
SELECT category, COUNT(*) FROM activity_log GROUP BY category;
```

#### Application Testing
- [ ] Can create/edit/delete contacts (formerly promoters)
- [ ] Venue-contact relationships work
- [ ] Contact commissions display correctly
- [ ] Show collaborator invites work (via invitations table)
- [ ] Billing dashboard shows logs correctly
- [ ] Seat counting displays correctly

### Performance Testing
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM contacts WHERE org_id = 'test-org-id';
EXPLAIN ANALYZE SELECT * FROM org_seat_usage WHERE org_id = 'test-org-id';
```

---

## 🚀 Deployment Steps

### Step 1: Pre-Migration Preparation

```bash
# 1. Backup database
pg_dump DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Run migrations in dev/staging first
supabase db push --include-all

# 3. Verify migrations applied successfully
supabase db remote commit
```

### Step 2: Update Application Code

```bash
# 1. Create feature branch
git checkout -b database-consolidation

# 2. Update database types
npx supabase gen types typescript --linked > lib/database.types.ts

# 3. Update application code (see "Application Code Changes" section)

# 4. Test locally
npm run dev

# 5. Run tests
npm test
```

### Step 3: Deploy

```bash
# 1. Commit changes
git add .
git commit -m "Database consolidation: merge partners/promoters, simplify collaborators"

# 2. Deploy to staging
git push origin database-consolidation
# ... deploy to staging environment

# 3. Test in staging thoroughly

# 4. Deploy to production (during low-traffic window)
git merge main
git push origin main

# 5. Run migrations in production
supabase db push --linked
```

### Step 4: Post-Migration Cleanup

After 1-2 weeks of successful operation:

```sql
-- Drop backup tables
DROP TABLE IF EXISTS _show_collaborators_invite_backup;
DROP TABLE IF EXISTS _org_seats_backup;
DROP TABLE IF EXISTS _billing_actions_log_backup;
```

---

## 🔄 Rollback Plan

If issues occur, migrations can be rolled back:

### Immediate Rollback (before code deploy)

```sql
-- Restore from backup
psql DATABASE_URL < backup_YYYYMMDD.sql
```

### Partial Rollback (after code deploy)

Each migration has commented rollback steps. See backup tables:
- `_show_collaborators_invite_backup`
- `_org_seats_backup`  
- `_billing_actions_log_backup`

To rollback a specific migration:
```sql
-- Example: Rollback contacts consolidation
-- 1. Recreate partners from contacts
CREATE TABLE partners AS 
SELECT * FROM contacts WHERE type IN ('agent', 'manager', 'vendor');

-- 2. Recreate promoters from contacts
CREATE TABLE promoters AS
SELECT * FROM contacts WHERE type = 'promoter';

-- 3. Rename tables back
ALTER TABLE contact_commissions RENAME TO partner_commissions;
ALTER TABLE venue_contacts RENAME TO venue_promoters;

-- 4. Drop contacts table
DROP TABLE contacts;

-- 5. Restore foreign keys and policies
-- (See original migration files for exact syntax)
```

---

## 📊 Expected Results

### Database Changes
- **Tables removed:** 6 (partners, promoters, org_seats, billing_actions_log, + 2 junction tables)
- **Tables added:** 1 (contacts)
- **Tables renamed:** 2 (contact_commissions, venue_contacts)
- **Net reduction:** 5 tables (33 → 28 tables)

### Performance Impact
- **Positive:** Fewer tables to query, simpler joins
- **Neutral:** Views replace tables (same performance)
- **Minimal:** No impact on read performance

### Code Impact
- **High:** Promoters-related code needs updates
- **Medium:** Show collaboration invite code needs refactor
- **Low:** Billing logging (backward-compatible view exists)

---

## 🆘 Troubleshooting

### Issue: Migration fails on contacts table creation

**Cause:** Partners or promoters table has conflicting IDs

**Solution:**
```sql
-- Check for ID conflicts
SELECT id FROM partners 
INTERSECT 
SELECT id FROM promoters;

-- If conflicts exist, regenerate IDs
UPDATE partners SET id = gen_random_uuid() WHERE id IN (...);
```

### Issue: show_collaborators constraint violation

**Cause:** Collaborators exist who aren't org members

**Solution:**
```sql
-- Add missing org members
INSERT INTO org_members (org_id, user_id, role)
SELECT DISTINCT s.org_id, sc.user_id, 'viewer'
FROM show_collaborators sc
JOIN shows s ON s.id = sc.show_id
WHERE sc.user_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Issue: TypeScript errors after migration

**Cause:** database.types.ts out of date

**Solution:**
```bash
# Regenerate types
npx supabase gen types typescript --linked > lib/database.types.ts

# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

---

## 📞 Support

If you encounter issues:

1. Check migration SQL files for comments and verification queries
2. Review backup tables before dropping them
3. Test in dev/staging before production
4. Keep database backup accessible for 30 days

---

## ✨ Benefits After Migration

1. **Cleaner Data Model**
   - Single source of truth for external contacts
   - Clear separation of concerns

2. **Easier Development**
   - Fewer tables to understand
   - Simpler queries
   - Less code duplication

3. **Better Performance**
   - Fewer joins needed
   - Optimized views
   - Better indexed

4. **Improved Maintainability**
   - Consistent naming
   - Clearer relationships
   - Less confusion for new developers

---

## Next Steps

After completing this migration:

1. [ ] Monitor application for errors
2. [ ] Verify all features work correctly
3. [ ] Update API documentation
4. [ ] Update developer onboarding docs
5. [ ] Consider materializing frequently-queried views
6. [ ] Plan for partitioning activity_log by date (already set up)

