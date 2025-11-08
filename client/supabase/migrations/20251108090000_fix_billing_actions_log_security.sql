-- ============================================================================
-- Fix billing_actions_log View Security
-- ============================================================================
-- Purpose: Remove SECURITY DEFINER property from billing_actions_log view
-- Issue: View was flagged as having SECURITY DEFINER which enforces permissions
--        of the view creator rather than the querying user
-- Solution: Recreate view with security_invoker = true to enforce RLS properly

-- Drop the existing view
DROP VIEW IF EXISTS public.billing_actions_log CASCADE;

-- Recreate the view with security_invoker = true
CREATE VIEW public.billing_actions_log
WITH (security_invoker = true) AS
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

COMMENT ON VIEW public.billing_actions_log IS 'View of billing-category logs from activity_log. Provides backward compatibility with old billing_actions_log table structure. Uses security_invoker to respect RLS policies of the querying user.';

-- Grant access to the view
GRANT SELECT ON public.billing_actions_log TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================
-- The view will now:
-- 1. Use the permissions of the querying user (security_invoker = true)
-- 2. Respect RLS policies on activity_log table
-- 3. Only show billing logs that the current user has permission to see
-- ============================================================================
