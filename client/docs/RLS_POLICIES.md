# RLS Policy Documentation & Testing Guide

## Overview

This document provides comprehensive documentation of all Row Level Security (RLS) policies in the Oncore database, organized by role and table. It also includes automated testing procedures to verify policies remain correct after changes.

## Quick Reference

**All 17 critical tables have RLS enabled ✅**

### Roles

- **owner** - Full control of organization
- **admin** - Manage organization (can't delete org)
- **editor** - Create and modify content
- **viewer** - Read-only access to org data
- **non_member** - No access to org (except as show collaborator)
- **anon** - Unauthenticated users (very limited access)

## Access Matrix by Table

### Organizations

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| owner | ✅ | ❌ | ✅ | ✅ | Can delete org |
| admin | ✅ | ❌ | ✅ | ❌ | Cannot delete org |
| editor | ✅ | ❌ | ✅ | ❌ | Can update org settings |
| viewer | ✅ | ❌ | ❌ | ❌ | Read-only |
| non_member | ❌ | ❌ | ❌ | ❌ | No access |

**Key Policies:**
- `org_select` - Members can view their org
- `org_update` - Members can update their org
- `org_delete` - Only owners can delete

### Org Members

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| owner | ✅ | ✅ | ✅ | ✅ | Full member management |
| admin | ✅ | ✅ | ✅ | ✅ | Full member management |
| editor | ✅ | ❌ | ❌ | ❌ | Can view members |
| viewer | ✅ | ❌ | ❌ | ❌ | Can view members |
| non_member | ❌ | ❌ | ❌ | ❌ | No access |

**Key Policies:**
- `org_members_select` - View own membership
- `org_members_update` - Owners/admins can modify roles
- `org_members_delete` - Owners/admins can remove members

### Shows

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| owner | ✅ | ✅ | ✅ | ✅ | Full access |
| admin | ✅ | ✅ | ✅ | ✅ | Full access |
| editor | ✅ | ✅ | ✅ | ✅ | Full access |
| viewer | ✅ | ❌ | ❌ | ❌ | Read-only |
| collaborator | ✅ | ❌ | ✅ | ❌ | Can edit assigned shows |

**Key Policies:**
- `shows_select` - Members + collaborators can view
- `shows_insert` - Editors+ can create
- `shows_update` - Editors+ can modify
- `shows_delete` - Editors+ can delete

**Special Case:** Show collaborators (external users) can view and edit shows they're assigned to, even if not org members.

### Venues, Artists, People, Contacts

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| owner | ✅ | ✅ | ✅ | ✅ | Full access |
| admin | ✅ | ✅ | ✅ | ✅ | Full access |
| editor | ✅ | ✅ | ✅ | ✅ | Full access |
| viewer | ✅ | ❌ | ❌ | ❌ | Read-only |
| non_member | ❌ | ❌ | ❌ | ❌ | No access |

**Pattern:** These tables follow the standard org-scoped pattern - editors and above have full access, viewers are read-only.

### Advancing System (Sessions, Fields, Documents, Comments)

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| owner | ✅ | ✅ | ✅ | ✅ | Full access |
| admin | ✅ | ✅ | ✅ | ✅ | Full access |
| editor | ✅ | ✅ | ✅ | ✅ | Full access |
| viewer | ✅ | ❌ | ❌ | ❌ | Read-only |
| collaborator | ✅ | ✅ | ✅ | ❌ | Can edit assigned show's advancing |

**Special Case:** Show collaborators can view and edit advancing data for shows they're assigned to.

### Activity Log

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| all members | ✅ | ❌ | ❌ | ❌ | Read-only audit trail |
| owner (billing) | ✅ | ❌ | ❌ | ❌ | Can view billing category logs |
| service_role | ✅ | ✅ | ❌ | ❌ | System can insert logs |

**Key Policies:**
- `activity_log_select` - Members can view org logs
- `Org owners can view billing logs` - Additional access for billing logs
- `Service role can insert activity logs` - System logging only

### Billing & Subscriptions

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| all members | ✅ | ❌ | ❌ | ❌ | Can view subscription status |
| owner | ✅ | ❌ | ✅ | ❌ | Can modify subscription |
| admin (supabase) | ✅ | ✅ | ✅ | ✅ | Platform admin access |

**Tables:**
- `billing_plans` - Public read (anon users can see plans)
- `org_subscriptions` - Members can view, owners can update
- `org_feature_overrides` - Admin-only access

### Invitations

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| owner | ✅ | ✅ | ✅ | ✅ | Can manage invitations |
| admin | ✅ | ✅ | ✅ | ✅ | Can manage invitations |
| editor | ✅ | ✅ | ✅ | ✅ | Can manage invitations |
| viewer | ❌ | ❌ | ❌ | ❌ | Cannot manage invitations |

## Helper Functions

The following helper functions are used in policies:

### `is_org_member(org_id uuid)`
Returns `true` if the current user is a member of the organization.

```sql
SELECT is_org_member('org-uuid-here');
```

### `is_org_editor_and_active(org_id uuid)`
Returns `true` if user is editor/admin/owner AND org subscription is active.

```sql
SELECT is_org_editor_and_active('org-uuid-here');
```

### `has_show_access(show_id uuid, access_type text)`
Returns `true` if user can view or edit the show (via org membership or collaboration).

```sql
SELECT has_show_access('show-uuid-here', 'view');
SELECT has_show_access('show-uuid-here', 'edit');
```

### `org_is_active(org_id uuid)`
Returns `true` if the organization has an active subscription.

```sql
SELECT org_is_active('org-uuid-here');
```

## Automated Testing

### Run All RLS Tests

```sql
SELECT run_rls_tests();
```

Returns:
```json
{
  "status": "PASS",
  "test_run_at": "2025-11-08T00:00:00Z",
  "rls_enabled_check": {
    "total_tables": 17,
    "rls_enabled_count": 17,
    "all_protected": true,
    "missing_rls": []
  },
  "policy_coverage": {...}
}
```

### Verify RLS Enabled on All Tables

```sql
SELECT verify_rls_enabled_on_all_tables();
```

### View Expected Access for a Role

```sql
-- See what an editor should be able to do
SELECT * FROM get_expected_access('editor');

-- See what access is expected for shows table
SELECT * FROM get_expected_access('editor', 'shows');
```

### View All Policies on a Table

```sql
SELECT * FROM get_table_policies('shows');
SELECT * FROM get_table_policies('org_members');
```

### Generate Coverage Report

```sql
SELECT generate_rls_coverage_report();
```

Shows which tables have which types of policies (SELECT, INSERT, UPDATE, DELETE).

## Testing Checklist

Run these checks after modifying policies:

- [ ] `SELECT run_rls_tests()` - Verify all tests pass
- [ ] `SELECT verify_rls_enabled_on_all_tables()` - Confirm all tables protected
- [ ] Check `all_protected` is `true`
- [ ] Review any tables in `missing_rls` array
- [ ] Verify helper functions still work
- [ ] Test with real users in different roles
- [ ] Check show collaborator access works
- [ ] Verify billing access restrictions

## Common Policy Patterns

### Org-Scoped Resource Pattern

Most tables follow this pattern:

```sql
-- SELECT: org members can view
CREATE POLICY table_select ON table_name FOR SELECT
USING (is_org_member(org_id));

-- INSERT: editors+ can create (billing check)
CREATE POLICY table_insert ON table_name FOR INSERT
WITH CHECK (is_org_editor_and_active(org_id));

-- UPDATE: editors+ can modify
CREATE POLICY table_update ON table_name FOR UPDATE
USING (is_org_editor_and_active(org_id));

-- DELETE: editors+ can delete
CREATE POLICY table_delete ON table_name FOR DELETE
USING (is_org_editor_and_active(org_id));
```

### Show Collaborator Pattern

Tables related to shows also allow collaborator access:

```sql
CREATE POLICY shows_select ON shows FOR SELECT
USING (is_org_member(org_id) OR has_show_access(id, 'view'));
```

## Security Considerations

### ✅ Protections in Place

1. **All critical tables have RLS enabled**
2. **No anon access to org data** (except public billing plans)
3. **Billing enforcement** via `is_org_editor_and_active()`
4. **Service role isolation** - Special policies for system operations
5. **Audit trail** - Activity log is insert-only for most users
6. **Invitation-only membership** - Can't self-join organizations

### ⚠️ Important Notes

1. **Show Collaborators** - External users can access specific shows
   - This is intentional for vendor/promoter collaboration
   - Access is limited to assigned shows only

2. **Public Billing Plans** - Anonymous users can view plans
   - This is intentional for marketing/signup pages
   - No sensitive data in billing_plans table

3. **Service Role** - Has elevated privileges
   - Used for system operations (archival, maintenance)
   - Never exposed to client code
   - Only used in server-side functions

## Adding New Tables

When adding a new table, follow these steps:

1. **Enable RLS:**
   ```sql
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   ```

2. **Add policies following the org-scoped pattern** (see above)

3. **Add to expected access matrix:**
   ```sql
   INSERT INTO rls_expected_access (table_name, role, can_select, can_insert, can_update, can_delete)
   VALUES ('new_table', 'editor', true, true, true, true);
   ```

4. **Run tests:**
   ```sql
   SELECT run_rls_tests();
   ```

5. **Update this documentation**

## Troubleshooting

### Policy Not Working

1. Check if RLS is enabled:
   ```sql
   SELECT check_rls_enabled('table_name');
   ```

2. View all policies on table:
   ```sql
   SELECT * FROM get_table_policies('table_name');
   ```

3. Test helper function:
   ```sql
   SELECT is_org_member('org-id');
   SELECT org_is_active('org-id');
   ```

### User Can't Access Expected Data

1. Verify user is in org_members:
   ```sql
   SELECT * FROM org_members WHERE user_id = auth.uid();
   ```

2. Check subscription status:
   ```sql
   SELECT * FROM org_subscriptions WHERE org_id = 'org-id';
   ```

3. Review activity log for policy violations:
   ```sql
   SELECT * FROM activity_log 
   WHERE user_id = auth.uid() 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## Maintenance

### Regular Checks

Run monthly or after significant policy changes:

```sql
-- Full test suite
SELECT run_rls_tests();

-- Coverage report
SELECT generate_rls_coverage_report();

-- Verify expected access hasn't changed
SELECT * FROM rls_expected_access ORDER BY table_name, role;
```

### After Schema Changes

1. Run RLS tests
2. Update expected_access table if needed
3. Update this documentation
4. Test with real users in staging

## Reference

- **Migration:** `20251107232802_add_rls_policy_tests.sql`
- **Test Functions:** `run_rls_tests()`, `verify_rls_enabled_on_all_tables()`
- **Documentation Table:** `rls_expected_access`
- **Policy Export:** `supabase/rls_policies_current.txt`

---

**Last Updated:** November 8, 2025
**Status:** ✅ All 17 critical tables protected
