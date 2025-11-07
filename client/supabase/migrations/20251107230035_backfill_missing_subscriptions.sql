-- Backfill subscriptions for any organizations that might be missing them
-- This ensures all existing organizations have a subscription record

DO $$
DECLARE
  org_record RECORD;
  inserted_count int := 0;
BEGIN
  -- Find and fix organizations without subscriptions
  FOR org_record IN 
    SELECT o.id, o.created_at
    FROM organizations o
    LEFT JOIN org_subscriptions s ON s.org_id = o.id
    WHERE s.org_id IS NULL
  LOOP
    -- Create a default trial subscription for organizations missing one
    INSERT INTO org_subscriptions (
      org_id, 
      plan_id, 
      status, 
      current_period_start,
      current_period_end
    ) VALUES (
      org_record.id,
      'solo_artist',  -- Default plan
      'trialing',     -- Start with trial
      org_record.created_at,
      org_record.created_at + interval '7 days'
    )
    ON CONFLICT (org_id) DO NOTHING;  -- Skip if somehow already exists
    
    inserted_count := inserted_count + 1;
  END LOOP;

  IF inserted_count > 0 THEN
    RAISE NOTICE 'Backfilled % subscription(s) for organizations missing them', inserted_count;
  ELSE
    RAISE NOTICE 'No organizations missing subscriptions - all good!';
  END IF;
END $$;
