-- Fix All Remaining Policies Querying org_members Without Aliases
-- These policies all use "FROM org_members" without an alias, which can cause
-- infinite recursion when org_members policies are evaluated

-- =====================================
-- 1. FIX advancing_fields
-- =====================================
DROP POLICY IF EXISTS adv_fields_select ON advancing_fields;

CREATE POLICY adv_fields_select ON advancing_fields
FOR SELECT
USING (
  org_id IN (
    SELECT om.org_id
    FROM org_members om
    WHERE om.user_id = auth.uid()
  )
);

-- =====================================
-- 2. FIX files
-- =====================================
DROP POLICY IF EXISTS files_select ON files;

CREATE POLICY files_select ON files
FOR SELECT
USING (
  org_id IN (
    SELECT om.org_id
    FROM org_members om
    WHERE om.user_id = auth.uid()
  )
);

-- =====================================
-- 3. FIX invitations (3 policies)
-- =====================================
DROP POLICY IF EXISTS org_editors_view_invitations ON invitations;
DROP POLICY IF EXISTS org_editors_update_invitations ON invitations;
DROP POLICY IF EXISTS org_editors_delete_invitations ON invitations;

CREATE POLICY org_editors_view_invitations ON invitations
FOR SELECT
USING (
  org_id IN (
    SELECT om.org_id
    FROM org_members om
    WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'editor')
  )
);

CREATE POLICY org_editors_update_invitations ON invitations
FOR UPDATE
USING (
  org_id IN (
    SELECT om.org_id
    FROM org_members om
    WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'editor')
  )
);

CREATE POLICY org_editors_delete_invitations ON invitations
FOR DELETE
USING (
  org_id IN (
    SELECT om.org_id
    FROM org_members om
    WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'editor')
  )
);

-- =====================================
-- 4. FIX org_subscriptions
-- =====================================
DROP POLICY IF EXISTS org_subscriptions_update ON org_subscriptions;

CREATE POLICY org_subscriptions_update ON org_subscriptions
FOR UPDATE
USING (
  org_id IN (
    SELECT om.org_id
    FROM org_members om
    WHERE om.user_id = auth.uid()
      AND om.role = 'owner'
  )
);

-- =====================================
-- 5. FIX parsed_contracts
-- =====================================
DROP POLICY IF EXISTS "Org members can manage parsed contracts" ON parsed_contracts;

CREATE POLICY "Org members can manage parsed contracts" ON parsed_contracts
FOR ALL
USING (
  org_id IN (
    SELECT om.org_id
    FROM org_members om
    WHERE om.user_id = auth.uid()
  )
);

-- =====================================
-- 6. FIX parsed_emails
-- =====================================
DROP POLICY IF EXISTS "Org members can manage parsed emails" ON parsed_emails;

CREATE POLICY "Org members can manage parsed emails" ON parsed_emails
FOR ALL
USING (
  org_id IN (
    SELECT om.org_id
    FROM org_members om
    WHERE om.user_id = auth.uid()
  )
);

-- =====================================
-- SUMMARY
-- =====================================
-- Fixed all remaining policies that queried org_members without table aliases.
-- Every policy now uses "FROM org_members om" with alias to prevent recursion.
-- 
-- Tables fixed:
-- - advancing_fields (1 policy)
-- - files (1 policy)
-- - invitations (3 policies)
-- - org_subscriptions (1 policy)
-- - parsed_contracts (1 policy)
-- - parsed_emails (1 policy)
-- Total: 8 policies rewritten
