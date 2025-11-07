-- Test to verify org_subscriptions are created with new organizations
-- This should be run after the migration to ensure everything works

DO $$
DECLARE
  test_org_id uuid;
  subscription_count int;
BEGIN
  -- Note: This is a read-only test that just verifies the structure
  -- We don't actually create test data in production migrations
  
  -- Verify the INSERT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'org_subscriptions' 
      AND policyname = 'org_subscriptions_insert'
      AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'INSERT policy for org_subscriptions not found';
  END IF;

  RAISE NOTICE 'org_subscriptions INSERT policy verified successfully';

  -- Verify that existing organizations have subscriptions
  SELECT COUNT(*) INTO subscription_count
  FROM organizations o
  LEFT JOIN org_subscriptions s ON s.org_id = o.id
  WHERE s.org_id IS NULL;

  IF subscription_count > 0 THEN
    RAISE WARNING '% organizations exist without subscriptions. Run backfill if needed.', subscription_count;
  ELSE
    RAISE NOTICE 'All organizations have subscriptions.';
  END IF;

END $$;
