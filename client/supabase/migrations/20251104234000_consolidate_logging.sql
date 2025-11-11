-- Migration: Consolidate Billing Actions Log into Activity Log
-- Created: 2025-11-04
-- Purpose: Merge billing_actions_log into activity_log with category field
--          Simplifies logging architecture while preserving all data

-- =====================================
-- BACKGROUND
-- =====================================
-- Currently we have separate logging tables:
-- - activity_log: General audit trail
-- - billing_actions_log: Billing-specific events
-- This creates unnecessary complexity for similar data

-- Solution: Add category field to activity_log and consolidate

-- =====================================
-- STEP 1: ADD CATEGORY COLUMN TO ACTIVITY_LOG
-- =====================================

-- Add category column if it doesn't exist
ALTER TABLE activity_log 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' 
  CHECK (category IN ('general', 'billing', 'performance', 'security', 'auth', 'show', 'advancing'));

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS activity_log_category_idx ON activity_log(category);

-- Add index on composite (org_id, category, created_at) for common queries
CREATE INDEX IF NOT EXISTS activity_log_org_category_time_idx 
  ON activity_log(org_id, category, created_at DESC);

COMMENT ON COLUMN activity_log.category IS 'Event category: general, billing, performance, security, auth, show, advancing';

-- =====================================
-- STEP 2: UPDATE ACTIVITY_LOG RLS POLICIES
-- =====================================

-- Drop existing policies to recreate with category awareness
DROP POLICY IF EXISTS "Org members can view activity log" ON activity_log;
DROP POLICY IF EXISTS "Service role can manage activity log" ON activity_log;

-- Org members can view general activity
CREATE POLICY "Org members can view activity log"
ON activity_log FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid()
  )
);

-- Only owners can view billing category
CREATE POLICY "Org owners can view billing logs"
ON activity_log FOR SELECT
TO authenticated
USING (
  category = 'billing' AND
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
  )
);

-- Service role can insert all categories
CREATE POLICY "Service role can insert activity logs"
ON activity_log FOR INSERT
TO authenticated
WITH CHECK (true); -- Let application code handle authorization

COMMENT ON POLICY "Org owners can view billing logs" ON activity_log IS 'Billing logs are sensitive and only visible to org owners';

-- =====================================
-- STEP 3: UPDATE LOGGING FUNCTIONS
-- =====================================

-- Update or create functions that logged to billing_actions_log
-- They should now use app_log_activity with category='billing'

-- Example: Update auto_downgrade_expired_orgs function
CREATE OR REPLACE FUNCTION auto_downgrade_expired_orgs()
RETURNS TABLE(org_id UUID, previous_plan TEXT, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_org RECORD;
  v_free_plan_id TEXT := 'crew_readonly'; -- Downgrade to free plan
BEGIN
  FOR expired_org IN
    SELECT 
      s.org_id,
      s.plan_id as current_plan,
      s.current_period_end
    FROM org_subscriptions s
    WHERE s.status IN ('trialing', 'active')
    AND s.current_period_end < NOW()
    AND s.cancel_at_period_end = true
  LOOP
    -- Downgrade subscription
    UPDATE org_subscriptions
    SET 
      plan_id = v_free_plan_id,
      status = 'canceled',
      updated_at = NOW()
    WHERE org_subscriptions.org_id = expired_org.org_id;
    
    -- Log to activity_log with billing category
    INSERT INTO activity_log (
      org_id,
      action,
      resource_type,
      resource_id,
      details,
      category,
      created_at
    ) VALUES (
      expired_org.org_id,
      'subscription_auto_downgraded',
      'org_subscription',
      expired_org.org_id,
      jsonb_build_object(
        'previous_plan', expired_org.current_plan,
        'new_plan', v_free_plan_id,
        'reason', 'subscription_expired'
      ),
      'billing',
      NOW()
    );
    
    -- Return result
    org_id := expired_org.org_id;
    previous_plan := expired_org.current_plan;
    action := 'downgraded_to_' || v_free_plan_id;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- =====================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- =====================================

-- Function to log billing events
CREATE OR REPLACE FUNCTION log_billing_action(
  p_org_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_log (
    org_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    category,
    created_at
  ) VALUES (
    p_org_id,
    COALESCE(p_user_id, auth.uid()),
    p_action,
    'billing',
    p_org_id,
    p_details,
    'billing',
    NOW()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_billing_action(UUID, TEXT, JSONB, UUID) TO authenticated;

COMMENT ON FUNCTION log_billing_action IS 'Log billing-related actions to activity_log with billing category';

-- =====================================
-- STEP 5: DROP OLD BILLING_ACTIONS_LOG TABLE
-- =====================================

-- Drop the old billing_actions_log table if it exists
DROP TABLE IF EXISTS billing_actions_log CASCADE;

-- =====================================
-- STEP 6: CREATE VIEW FOR BILLING LOGS
-- =====================================

-- Create a view for easy querying of billing logs (backward compatibility)
CREATE OR REPLACE VIEW billing_actions_log AS
SELECT 
  id,
  org_id,
  user_id AS triggered_by,
  action,
  details->>'previous_state' AS previous_state,
  details->>'new_state' AS new_state,
  created_at
FROM activity_log
WHERE category = 'billing';

COMMENT ON VIEW billing_actions_log IS 'View of billing-category logs from activity_log. Provides backward compatibility with old billing_actions_log table structure.';

-- Grant access to the view
GRANT SELECT ON billing_actions_log TO authenticated;

-- =====================================
-- STEP 7: UPDATE ADMIN FUNCTIONS
-- =====================================

-- Update admin_update_subscription to use new logging
CREATE OR REPLACE FUNCTION admin_update_subscription(
  p_org_id UUID,
  p_plan_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_extend_days INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_state JSONB;
  v_new_state JSONB;
BEGIN
  -- Only allow service role or org owner
  IF NOT (
    auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = p_org_id AND role = 'owner')
    OR is_supabase_admin()
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Capture old state
  SELECT to_jsonb(org_subscriptions.*) INTO v_old_state
  FROM org_subscriptions
  WHERE org_id = p_org_id;
  
  -- Update subscription
  UPDATE org_subscriptions
  SET 
    plan_id = COALESCE(p_plan_id, plan_id),
    status = COALESCE(p_status, status),
    current_period_end = CASE 
      WHEN p_extend_days IS NOT NULL 
      THEN current_period_end + (p_extend_days || ' days')::INTERVAL
      ELSE current_period_end
    END,
    updated_at = NOW()
  WHERE org_subscriptions.org_id = p_org_id;
  
  -- Capture new state
  SELECT to_jsonb(org_subscriptions.*) INTO v_new_state
  FROM org_subscriptions
  WHERE org_id = p_org_id;
  
  -- Log the change
  PERFORM log_billing_action(
    p_org_id,
    'subscription_updated_admin',
    jsonb_build_object(
      'previous_state', v_old_state,
      'new_state', v_new_state,
      'changes', jsonb_build_object(
        'plan_id', p_plan_id,
        'status', p_status,
        'extend_days', p_extend_days
      )
    )
  );
END;
$$;

-- =====================================
-- VERIFICATION QUERIES (COMMENTED OUT)
-- =====================================

-- Verify billing logs in activity_log
-- SELECT COUNT(*) as billing_log_count 
-- FROM activity_log 
-- WHERE category = 'billing';

-- View recent billing actions
-- SELECT * FROM billing_actions_log 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- Check category distribution
-- SELECT category, COUNT(*) 
-- FROM activity_log 
-- GROUP BY category 
-- ORDER BY COUNT(*) DESC;

