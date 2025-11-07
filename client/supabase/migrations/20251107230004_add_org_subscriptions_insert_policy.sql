-- Add INSERT policy for org_subscriptions
-- This ensures that organization creation can properly seed subscriptions

-- Drop any existing insert policies (just in case)
DROP POLICY IF EXISTS org_subscriptions_insert ON org_subscriptions;

-- Allow inserting subscriptions only for org owners
-- The WITH CHECK clause uses NEW.org_id to reference the row being inserted
CREATE POLICY org_subscriptions_insert ON org_subscriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members 
      WHERE org_members.org_id = org_subscriptions.org_id 
        AND org_members.user_id = auth.uid() 
        AND org_members.role = 'owner'
    )
  );

-- Note: SECURITY DEFINER functions (like app_create_organization_with_owner) 
-- bypass RLS entirely, so they can always insert regardless of this policy.
-- This policy is primarily for direct inserts or when calling from client code.
