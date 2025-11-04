# Database Architecture Analysis & Optimization Recommendations

## Executive Summary

After analyzing the complete database schema, I've identified **significant redundancies and opportunities for optimization**. The database has 33 tables with overlapping concerns, particularly around partner/promoter management and invitation systems. This document provides a comprehensive analysis and actionable recommendations.

---

## Current Database Structure

### Core Tables (10)
1. **organizations** - Multi-tenant container
2. **org_members** - Organization membership
3. **artists** - Artists managed by org
4. **venues** - Venue directory
5. **shows** - Core show entity
6. **people** - Internal team/crew members
7. **show_assignments** - People assigned to shows
8. **schedule_items** - Calendar events
9. **files** - File registry (storage bucket refs)
10. **invitations** - User invitation system

### Advancing System (5 tables)
11. **advancing_sessions** - Advancing communication sessions
12. **advancing_fields** - Dynamic fields per session
13. **advancing_comments** - Field-level comments
14. **advancing_documents** - Document containers
15. **show_collaborators** - External show access

### Billing System (4 tables)
16. **billing_plans** - Plan catalog (static)
17. **org_subscriptions** - Active subscriptions
18. **org_seats** - Seat usage tracking
19. **org_feature_overrides** - Custom entitlements

### Partner/Promoter System (4 tables) ⚠️ **REDUNDANT**
20. **partners** - Partner contacts with commissions
21. **partner_commissions** - Commission tracking
22. **promoters** - Promoter contacts
23. **venue_promoters** - Promoter-venue relationships

### AI/Parsing System (2 tables)
24. **parsed_emails** - AI-parsed email content
25. **parsed_contracts** - AI-parsed contracts

### Logging & Analytics (3 tables)
26. **activity_log** - Audit trail (partitioned by month)
27. **billing_actions_log** - Billing event history
28. **query_performance_log** - Performance monitoring

### Supporting Tables (2)
29. **waitlist** - Pre-launch signups
30. **org_entitlements_cache** - Materialized view of entitlements
31. **org_seat_usage** - View of seat counts
32. **shows_list_view** - Optimized show list

---

## 🔴 Major Issues Identified

### 1. **Partners vs. Promoters Redundancy**

**Problem:** Two separate systems for essentially the same entity type:

- **`partners`** table: Has commission tracking, focuses on financial relationships
- **`promoters`** table: Has venue relationships, focuses on regional management
- **Result:** Confusion about where to store external contacts

**Why this happened:** 
- `partners` was created first (Oct 5) for commission tracking
- `promoters` was added later (Oct 16) for venue management
- No consolidation was done

**Impact:**
- Data fragmentation: Same person could be both partner and promoter
- Duplicate contact information
- Confusing API/UI decisions
- More complex queries

### 2. **Overlapping Invitation Systems**

**Problem:** Two invitation mechanisms:

- **`invitations`** table: For inviting people to organizations (links person_id → user_id)
- **`show_collaborators`** table: Has its own `invite_token` and `status` for show-level access

**Impact:**
- Two different invitation flows to maintain
- Inconsistent user experience
- More complex authorization logic

### 3. **People vs. Org Members Confusion**

**Problem:** Unclear relationship between:

- **`people`**: Has optional `user_id` field
- **`org_members`**: Organization membership table
- **Behavior:** A person can exist without a user account, or with a user account but not be an org member

**Impact:**
- Authorization complexity
- Confusing data model
- When should someone be in `people` vs `org_members`?

### 4. **Show Collaborators Complexity**

**Problem:** `show_collaborators` table tries to do too much:

- External collaborator access (promoters)
- Invitation system (duplicate of `invitations`)
- Role-based permissions (`show_collab_role`)
- Tracks both invited and accepted users

**Impact:**
- Complex RLS policies
- Duplicate invitation logic
- Hard to understand who has access to what

### 5. **Excessive Logging Tables**

**Problem:** Three separate logging mechanisms:

- `activity_log` (general audit trail)
- `billing_actions_log` (billing-specific)
- `query_performance_log` (performance)

**Impact:**
- While separation of concerns is good, this feels over-engineered for current scale
- Consider: Do you actually use all three? Are billing logs that different from general activity logs?

---

## ✅ Good Design Decisions

1. **Multi-tenancy via organizations** - Clean org_id scoping
2. **RLS everywhere** - Proper security model
3. **Advancing system** - Well-structured for complex data entry
4. **Billing/subscription system** - Properly modeled with plans and entitlements
5. **File registry pattern** - Separates file metadata from storage
6. **Materialized views** - Good for performance (org_seat_usage, shows_list_view)

---

## 🎯 Recommended Database Redesign

### Phase 1: Consolidate Partners & Promoters

#### Option A: Single "Contacts" Table (Recommended)

```sql
-- Replace both partners and promoters with unified contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  type TEXT NOT NULL CHECK (type IN ('promoter', 'agent', 'manager', 'vendor', 'other')),
  
  -- Basic info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  
  -- Location (for promoters)
  city TEXT,
  country TEXT,
  
  -- Financial (for partners who earn commissions)
  commission_rate NUMERIC(5,2),
  
  -- Status
  status TEXT DEFAULT 'active',
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Keep commission tracking, link to contacts
ALTER TABLE partner_commissions 
  RENAME TO contact_commissions;
  
ALTER TABLE contact_commissions
  RENAME COLUMN partner_id TO contact_id;

-- Update venue relationships
ALTER TABLE venue_promoters
  RENAME TO venue_contacts;
  
ALTER TABLE venue_contacts
  RENAME COLUMN promoter_id TO contact_id;
```

**Benefits:**
- Single source of truth for external contacts
- Flexible type system (can add new types easily)
- Clearer data model
- Easier to search across all contacts
- Same person can be multiple types (add `contact_types` junction if needed)

#### Migration Strategy:

```sql
-- 1. Create contacts table
-- 2. Migrate promoters → contacts (type='promoter')
INSERT INTO contacts (id, org_id, type, name, email, phone, company, city, country, notes, status, created_at, created_by)
SELECT id, org_id, 'promoter', name, email, phone, company, city, country, notes, status, created_at, created_by
FROM promoters;

-- 3. Migrate partners → contacts (type='agent/manager/vendor')
INSERT INTO contacts (id, org_id, type, name, email, phone, company, commission_rate, notes, status, created_at)
SELECT id, org_id, 
  CASE 
    WHEN role ILIKE '%agent%' THEN 'agent'
    WHEN role ILIKE '%manager%' THEN 'manager'
    ELSE 'vendor'
  END,
  name, email, phone, company, commission_rate, notes, status, created_at
FROM partners;

-- 4. Drop old tables
DROP TABLE promoters CASCADE;
DROP TABLE partners CASCADE;
```

---

### Phase 2: Simplify Invitation System

**Recommendation:** Keep `invitations` table, remove invite logic from `show_collaborators`

```sql
-- Remove invitation fields from show_collaborators
ALTER TABLE show_collaborators 
  DROP COLUMN invite_token,
  DROP COLUMN invited_by,
  DROP COLUMN accepted_at,
  DROP COLUMN status;

-- Make show_collaborators a simple access control table
-- Users must be invited to org first (via invitations table)
-- Then granted show access via show_collaborators

-- Add constraint: user_id must be in org_members
ALTER TABLE show_collaborators
  ADD CONSTRAINT show_collaborators_must_be_org_member
  CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN shows s ON s.org_id = om.org_id
      WHERE om.user_id = show_collaborators.user_id
      AND s.id = show_collaborators.show_id
    )
  );
```

**Flow:**
1. Invite user to org → creates `invitations` record
2. User accepts → added to `org_members` and `people`
3. Grant show access → add to `show_collaborators`

**Benefits:**
- Single invitation system
- Clearer separation: org membership vs. show access
- Simpler code

---

### Phase 3: Clarify People vs. Org Members

**Recommendation:** Make the relationship explicit

**Current confusion:**
- `people` can have `user_id = null` (not invited yet)
- `people` can have `user_id` but not be in `org_members` (orphaned)

**Proposed rule:**
```sql
-- Rule: If person has user_id, they MUST be in org_members
ALTER TABLE people
  ADD CONSTRAINT people_with_users_must_be_members
  CHECK (
    user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = people.org_id
      AND org_members.user_id = people.user_id
    )
  );

-- Trigger to auto-sync when person gets a user_id
CREATE OR REPLACE FUNCTION sync_person_to_org_members()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND OLD.user_id IS NULL THEN
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (NEW.org_id, NEW.user_id, 'viewer')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_person_to_org_members
AFTER UPDATE ON people
FOR EACH ROW
EXECUTE FUNCTION sync_person_to_org_members();
```

**Semantic clarification:**
- **`people`**: Roster of humans associated with org (crew, team members)
  - Can exist without user accounts (for contact info, schedules, assignments)
- **`org_members`**: Authenticated users with platform access
  - Must have user_id (they're logged-in users)
- **Relationship**: `people.user_id → org_members.user_id` (optional, but if set, must exist)

---

### Phase 4: Simplify Logging

**Recommendation:** Consolidate logging tables

```sql
-- Option A: Keep activity_log as primary, add tags
ALTER TABLE activity_log
  ADD COLUMN category TEXT DEFAULT 'general' 
    CHECK (category IN ('general', 'billing', 'performance', 'security'));

-- Migrate billing_actions_log → activity_log
INSERT INTO activity_log (
  org_id, user_id, action, resource_type, resource_id, details, created_at, category
)
SELECT 
  org_id, triggered_by, action, 'billing', org_id, 
  jsonb_build_object('previous_state', previous_state, 'new_state', new_state),
  created_at, 'billing'
FROM billing_actions_log;

-- Drop billing_actions_log
DROP TABLE billing_actions_log;

-- Keep query_performance_log separate (different use case)
```

**Alternative:** Keep all three if you genuinely need them for different retention/query patterns

---

### Phase 5: Review Seat Counting

**Issue:** `org_seats` table seems unused

```sql
-- Current query uses a VIEW (org_seat_usage), not the table
SELECT * FROM org_seat_usage; -- This works

-- But org_seats table exists and is never populated?
SELECT * FROM org_seats; -- Empty?
```

**Recommendation:**
- If `org_seats` is unused, drop it
- The `org_seat_usage` VIEW is sufficient for read-only seat counts
- If you need to cache seat counts, use a materialized view instead:

```sql
DROP TABLE org_seats;

CREATE MATERIALIZED VIEW org_seat_usage_cache AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  COUNT(DISTINCT om.user_id) AS members_used,
  COUNT(DISTINCT sc.user_id) AS collaborators_used,
  COUNT(DISTINCT a.id) AS artists_used
FROM organizations o
LEFT JOIN org_members om ON om.org_id = o.id
LEFT JOIN shows s ON s.org_id = o.id
LEFT JOIN show_collaborators sc ON sc.show_id = s.id AND sc.user_id IS NOT NULL
LEFT JOIN artists a ON a.org_id = o.id
GROUP BY o.id, o.name;

-- Refresh periodically
CREATE INDEX ON org_seat_usage_cache (org_id);
```

---

## 📊 Proposed Final Schema (23 tables, down from 33)

### Core (10 tables) - NO CHANGE
1. organizations
2. org_members
3. artists
4. venues
5. shows
6. people
7. show_assignments
8. schedule_items
9. files
10. invitations

### Advancing (5 tables) - NO CHANGE
11. advancing_sessions
12. advancing_fields
13. advancing_comments
14. advancing_documents
15. show_collaborators (simplified)

### Billing (3 tables) - REDUCED FROM 4
16. billing_plans
17. org_subscriptions
18. org_feature_overrides
~~19. org_seats~~ (dropped, use view)

### Contacts (3 tables) - CONSOLIDATED FROM 4
19. **contacts** (replaces partners + promoters)
20. **contact_commissions** (replaces partner_commissions)
21. **venue_contacts** (replaces venue_promoters)

### AI/Parsing (2 tables) - NO CHANGE
22. parsed_emails
23. parsed_contracts

### Logging (1 table) - CONSOLIDATED FROM 3
24. **activity_log** (absorbs billing_actions_log)
~~25. billing_actions_log~~ (merged)
26. query_performance_log (keep separate)

### Supporting (2)
27. waitlist
28. org_entitlements_cache (view)
29. org_seat_usage (view)
30. shows_list_view (view)

**Total: 26 tables + 4 views (down from 33 tables)**

---

## 🚀 Migration Priority

### High Priority (Do Soon)
1. ✅ **Consolidate partners/promoters** → Single `contacts` table
   - Impact: Medium effort, high value
   - Risk: Low (just data migration)
   - Benefit: Clearer data model, easier queries

2. ✅ **Simplify show_collaborators** → Remove invitation logic
   - Impact: Medium effort, medium value
   - Risk: Medium (changes auth flow)
   - Benefit: Single source of truth for invitations

### Medium Priority (Do Later)
3. ⚠️ **Clarify people/org_members relationship** → Add constraints
   - Impact: Low effort, medium value
   - Risk: Low (just clarification)
   - Benefit: Less confusion

4. ⚠️ **Drop org_seats table** → Use view/materialized view
   - Impact: Low effort, low value
   - Risk: Very low
   - Benefit: Less clutter

### Low Priority (Optional)
5. 💡 **Consolidate logging tables** → Merge billing_actions_log
   - Impact: Medium effort, low value
   - Risk: Low
   - Benefit: Simpler schema (but maybe not needed?)

---

## 🤔 Questions to Answer

1. **Do you use both partners and promoters?**
   - If yes, are they actually different concepts?
   - If no, remove one

2. **Do you need billing_actions_log separate from activity_log?**
   - Is billing critical enough to warrant separate auditing?
   - Do you query billing logs differently?

3. **What's the difference between a show_collaborator and an org_member?**
   - Current: collaborators can be invited without being org members
   - Proposed: collaborators must be org members first

4. **Do you use org_seats table?**
   - I don't see any code writing to it
   - Seat counts come from the VIEW, not the table

5. **What's the long-term plan for parsed_emails and parsed_contracts?**
   - Are these features live?
   - Do they get used, or was this experimental?

---

## 💰 Performance Considerations

### Current Performance (Good)
- ✅ Indexes on all foreign keys
- ✅ Indexes on common query paths (org_id, date, email)
- ✅ Materialized views for seat counting
- ✅ RLS policies properly indexed

### Recommendations
1. **Monitor query_performance_log** - Actually use it to find slow queries
2. **Partition activity_log** - Already set up, just need to create monthly partitions
3. **Index advancing_fields by (session_id, party_type, section)** - Common query pattern
4. **Consider caching org_entitlements** - Materialize if called frequently

---

## 🔒 Security Observations

### Good
- ✅ RLS enabled on all tables
- ✅ Functions use SECURITY DEFINER with explicit checks
- ✅ Audit logging for sensitive operations

### Concerns
1. ⚠️ Some functions have `SET search_path = public` - good
2. ⚠️ Anonymous access properly revoked in recent migration
3. ⚠️ RLS policies could be simplified with partner/promoter consolidation

---

## 📝 Conclusion

Your database is **well-architected overall**, but has **accumulated some cruft** from iterative development. The main issues are:

1. **Partner/Promoter duplication** (fix this first)
2. **Invitation system overlap** (clean this up)
3. **Unused tables** (org_seats, possibly others)

**Estimated effort to clean up:**
- Partner/Promoter consolidation: 4-6 hours
- Invitation simplification: 2-3 hours
- Minor cleanups: 1-2 hours
- **Total: 1-2 days of focused work**

**Benefits:**
- Simpler codebase
- Faster onboarding for new developers
- Less confusion
- Easier to maintain

**Recommendation:** Do this cleanup **before** adding major new features. The technical debt is manageable now but will compound.

---

## Next Steps

1. Review this document with your team
2. Answer the questions in the "Questions to Answer" section
3. Prioritize which consolidations to do
4. Create migration scripts
5. Test in staging
6. Deploy during low-traffic window

Would you like me to:
- Generate the migration scripts?
- Create a detailed step-by-step migration guide?
- Analyze specific tables in more detail?
