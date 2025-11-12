-- Fix RLS policies to work with transaction pooler by inlining membership checks
-- The issue: Helper functions hit nested RLS even with SECURITY DEFINER
-- Solution: Inline the membership checks directly in policies, add service_role bypass

-- =====================================================
-- ADVANCING SESSIONS
-- =====================================================
DROP POLICY IF EXISTS adv_sessions_insert ON advancing_sessions;
DROP POLICY IF EXISTS adv_sessions_update ON advancing_sessions;
DROP POLICY IF EXISTS adv_sessions_delete ON advancing_sessions;

-- Service role bypass
DROP POLICY IF EXISTS advancing_sessions_service_role_all ON advancing_sessions;
CREATE POLICY advancing_sessions_service_role_all ON advancing_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Inline membership checks (no helper function)
CREATE POLICY adv_sessions_insert ON advancing_sessions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_members om
    JOIN org_subscriptions os ON os.org_id = om.org_id
    WHERE om.org_id = advancing_sessions.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner','admin','editor')
      AND os.status IN ('trialing','active','past_due')
      AND COALESCE(os.current_period_end, now() + INTERVAL '1 day') > now()
  )
);

CREATE POLICY adv_sessions_update ON advancing_sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    JOIN org_subscriptions os ON os.org_id = om.org_id
    WHERE om.org_id = advancing_sessions.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner','admin','editor')
      AND os.status IN ('trialing','active','past_due')
      AND COALESCE(os.current_period_end, now() + INTERVAL '1 day') > now()
  )
);

CREATE POLICY adv_sessions_delete ON advancing_sessions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    JOIN org_subscriptions os ON os.org_id = om.org_id
    WHERE om.org_id = advancing_sessions.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner','admin','editor')
      AND os.status IN ('trialing','active','past_due')
      AND COALESCE(os.current_period_end, now() + INTERVAL '1 day') > now()
  )
);

-- =====================================================
-- ADVANCING FIELDS  
-- =====================================================
DROP POLICY IF EXISTS advancing_fields_insert_unified ON advancing_fields;
DROP POLICY IF EXISTS advancing_fields_update_unified ON advancing_fields;
DROP POLICY IF EXISTS advancing_fields_delete_unified ON advancing_fields;

-- Service role bypass
DROP POLICY IF EXISTS advancing_fields_service_role_all ON advancing_fields;
CREATE POLICY advancing_fields_service_role_all ON advancing_fields
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Inline membership checks (no helper function)
CREATE POLICY advancing_fields_insert_unified ON advancing_fields 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_members om
    JOIN org_subscriptions os ON os.org_id = om.org_id
    WHERE om.org_id = advancing_fields.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner','admin','editor')
      AND os.status IN ('trialing','active','past_due')
      AND COALESCE(os.current_period_end, now() + INTERVAL '1 day') > now()
  )
);

CREATE POLICY advancing_fields_update_unified ON advancing_fields 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    JOIN org_subscriptions os ON os.org_id = om.org_id
    WHERE om.org_id = advancing_fields.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner','admin','editor')
      AND os.status IN ('trialing','active','past_due')
      AND COALESCE(os.current_period_end, now() + INTERVAL '1 day') > now()
  )
);

CREATE POLICY advancing_fields_delete_unified ON advancing_fields 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    JOIN org_subscriptions os ON os.org_id = om.org_id
    WHERE om.org_id = advancing_fields.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner','admin','editor')
      AND os.status IN ('trialing','active','past_due')
      AND COALESCE(os.current_period_end, now() + INTERVAL '1 day') > now()
  )
);
