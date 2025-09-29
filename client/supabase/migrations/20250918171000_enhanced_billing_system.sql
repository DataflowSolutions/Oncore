-- Enhanced Billing System with Grace Periods and Admin Tools
-- Adds grace period handling, admin functions, and better subscription management

-- =====================================
-- 1. ENHANCED GRACE PERIOD HANDLING
-- =====================================
-- Update org_is_active to include configurable grace periods
CREATE OR REPLACE FUNCTION org_is_active_with_grace(p_org uuid, p_grace_days int DEFAULT 7)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_subscriptions s
    WHERE s.org_id = p_org
      AND (
        -- Active subscriptions
        s.status IN ('trialing', 'active') 
        OR (
          -- Past due with grace period
          s.status = 'past_due' 
          AND COALESCE(s.current_period_end, now()) + (p_grace_days || ' days')::interval > now()
        )
      )
  );
$$;

-- Update the main org_is_active to use 7-day grace period by default
CREATE OR REPLACE FUNCTION org_is_active(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT org_is_active_with_grace(p_org, 7);
$$;

-- =====================================
-- 2. SUBSCRIPTION STATUS HELPERS
-- =====================================
-- Get detailed subscription status including grace period info
CREATE OR REPLACE FUNCTION org_subscription_status(p_org uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'is_active', org_is_active(p_org),
    'status', s.status,
    'plan_id', s.plan_id,
    'current_period_end', s.current_period_end,
    'grace_period_ends', CASE 
      WHEN s.status = 'past_due' THEN s.current_period_end + interval '7 days'
      ELSE NULL
    END,
    'days_until_expiry', CASE
      WHEN s.status = 'past_due' THEN 
        EXTRACT(days FROM (s.current_period_end + interval '7 days') - now())::int
      WHEN s.status IN ('trialing', 'active') THEN
        EXTRACT(days FROM s.current_period_end - now())::int
      ELSE 0
    END,
    'requires_immediate_action', (
      s.status = 'past_due' 
      AND s.current_period_end + interval '7 days' <= now() + interval '2 days'
    )
  )
  FROM org_subscriptions s
  WHERE s.org_id = p_org;
$$;

-- =====================================
-- 3. AUTO-DOWNGRADE FUNCTIONS
-- =====================================
-- Function to downgrade expired orgs to crew_readonly
CREATE OR REPLACE FUNCTION auto_downgrade_expired_orgs()
RETURNS TABLE(org_id uuid, previous_plan text, action text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH expired_orgs AS (
    SELECT s.org_id, s.plan_id, s.status, s.current_period_end
    FROM org_subscriptions s
    WHERE s.status = 'past_due'
      AND s.current_period_end + interval '7 days' < now()
      AND s.plan_id != 'crew_readonly' -- Don't downgrade if already on lowest plan
  ),
  updated_subs AS (
    UPDATE org_subscriptions s
    SET 
      plan_id = 'crew_readonly',
      status = 'active', -- Make them active on the downgraded plan
      current_period_start = now(),
      current_period_end = now() + interval '30 days', -- Give them a month
      updated_at = now()
    FROM expired_orgs e
    WHERE s.org_id = e.org_id
    RETURNING s.org_id, e.plan_id as previous_plan
  )
  SELECT u.org_id, u.previous_plan, 'downgraded_to_crew_readonly'::text as action
  FROM updated_subs u;
END;
$$;

-- =====================================
-- 4. ADMIN FUNCTIONS
-- =====================================
-- Admin role check (for super admin operations)
CREATE OR REPLACE FUNCTION is_supabase_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth.jwt()->>'role' = 'supabase_admin' 
    OR auth.jwt()->>'email' IN (
      'admin@oncore.app', 
      'albin@dataflowsolutions.com' -- Add admin emails here
    );
$$;

-- Admin function to set feature overrides
CREATE OR REPLACE FUNCTION admin_set_feature_override(
  p_org_id uuid,
  p_key text,
  p_value jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only allow supabase admins
  IF NOT is_supabase_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  INSERT INTO org_feature_overrides (org_id, key, value)
  VALUES (p_org_id, p_key, p_value)
  ON CONFLICT (org_id, key) DO UPDATE SET
    value = p_value,
    created_at = now();

  -- Log the action
  PERFORM app_log_activity(
    p_org_id,
    'admin_feature_override',
    'org_feature_override',
    p_org_id,
    jsonb_build_object('key', p_key, 'value', p_value, 'admin_email', auth.jwt()->>'email')
  );
END;
$$;

-- Admin function to manually adjust subscriptions
CREATE OR REPLACE FUNCTION admin_update_subscription(
  p_org_id uuid,
  p_plan_id text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_extend_days int DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only allow supabase admins
  IF NOT is_supabase_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE org_subscriptions SET
    plan_id = COALESCE(p_plan_id, plan_id),
    status = COALESCE(p_status, status),
    current_period_end = CASE 
      WHEN p_extend_days IS NOT NULL THEN 
        COALESCE(current_period_end, now()) + (p_extend_days || ' days')::interval
      ELSE current_period_end
    END,
    updated_at = now()
  WHERE org_id = p_org_id;

  -- Log the action
  PERFORM app_log_activity(
    p_org_id,
    'admin_subscription_update',
    'org_subscription',
    p_org_id,
    jsonb_build_object(
      'plan_id', p_plan_id, 
      'status', p_status, 
      'extend_days', p_extend_days,
      'admin_email', auth.jwt()->>'email'
    )
  );
END;
$$;

-- =====================================
-- 5. ENHANCED LIMIT CHECKING
-- =====================================
-- Enhanced limit checking with detailed responses
CREATE OR REPLACE FUNCTION check_org_limits_detailed(
  p_org_id uuid,
  p_check_type text, -- 'members', 'collaborators', 'artists'
  p_additional_count int DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_entitlements jsonb;
  v_current_usage int;
  v_limit int;
  v_plan_name text;
  v_subscription_status jsonb;
BEGIN
  -- Get org entitlements and subscription info
  v_entitlements := org_entitlements(p_org_id);
  v_subscription_status := org_subscription_status(p_org_id);
  
  SELECT bp.name INTO v_plan_name 
  FROM org_subscriptions s
  JOIN billing_plans bp ON bp.id = s.plan_id
  WHERE s.org_id = p_org_id;
  
  -- Check the specific limit
  CASE p_check_type
    WHEN 'members' THEN
      SELECT members_used INTO v_current_usage FROM org_seat_usage WHERE org_id = p_org_id;
      v_limit := COALESCE((v_entitlements->>'max_members')::int, 1000000);
    WHEN 'collaborators' THEN
      SELECT collaborators_used INTO v_current_usage FROM org_seat_usage WHERE org_id = p_org_id;
      v_limit := COALESCE((v_entitlements->>'max_collaborators')::int, 1000000);
    WHEN 'artists' THEN
      SELECT artists_used INTO v_current_usage FROM org_seat_usage WHERE org_id = p_org_id;
      v_limit := COALESCE((v_entitlements->>'max_artists')::int, 1000000);
    ELSE
      RAISE EXCEPTION 'Invalid check_type: %', p_check_type;
  END CASE;
  
  RETURN jsonb_build_object(
    'allowed', (v_current_usage + p_additional_count) <= v_limit,
    'current_usage', v_current_usage,
    'limit', v_limit,
    'after_action', v_current_usage + p_additional_count,
    'remaining', v_limit - v_current_usage,
    'check_type', p_check_type,
    'plan_name', v_plan_name,
    'subscription_active', (v_subscription_status->>'is_active')::boolean,
    'requires_upgrade', (v_current_usage + p_additional_count) > v_limit
  );
END;
$$;

-- =====================================
-- 6. BILLING DASHBOARD HELPERS
-- =====================================
-- Get comprehensive billing info for dashboard
CREATE OR REPLACE FUNCTION org_billing_dashboard(p_org_id uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'subscription', (SELECT row_to_json(s.*) FROM org_subscriptions s WHERE s.org_id = p_org_id),
    'plan', (
      SELECT row_to_json(bp.*) 
      FROM org_subscriptions s 
      JOIN billing_plans bp ON bp.id = s.plan_id 
      WHERE s.org_id = p_org_id
    ),
    'usage', (SELECT row_to_json(u.*) FROM org_seat_usage u WHERE u.org_id = p_org_id),
    'status', org_subscription_status(p_org_id),
    'entitlements', org_entitlements(p_org_id),
    'overrides', (
      SELECT jsonb_object_agg(o.key, o.value)
      FROM org_feature_overrides o
      WHERE o.org_id = p_org_id
    )
  );
$$;

-- =====================================
-- 7. INVITATION WITH LIMIT CHECKING
-- =====================================
-- Enhanced invite function with better error messages
CREATE OR REPLACE FUNCTION app_invite_collaborator_enhanced(
  p_show_id uuid,
  p_email citext,
  p_role show_collab_role DEFAULT 'promoter_editor'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org uuid;
  v_limit_check jsonb;
  new_id uuid;
BEGIN
  -- Get org from show
  SELECT org_id INTO v_org FROM shows WHERE id = p_show_id;
  
  -- Check permissions and subscription status
  IF NOT is_org_editor(v_org) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_permissions',
      'message', 'You do not have permission to invite collaborators'
    );
  END IF;
  
  IF NOT org_is_active(v_org) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'subscription_inactive',
      'message', 'Your subscription is inactive. Please update your billing information.'
    );
  END IF;

  -- Check collaborator seat limit with detailed info
  v_limit_check := check_org_limits_detailed(v_org, 'collaborators', 1);
  
  IF NOT (v_limit_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_exceeded',
      'message', format(
        'Collaborator limit reached (%s of %s used). Upgrade your %s plan to invite more collaborators.',
        v_limit_check->>'current_usage',
        v_limit_check->>'limit',
        v_limit_check->>'plan_name'
      ),
      'limit_info', v_limit_check
    );
  END IF;

  -- Create the invite
  INSERT INTO show_collaborators (show_id, email, role, invited_by, org_id, status)
  VALUES (p_show_id, p_email, p_role, auth.uid(), v_org, 'invited')
  RETURNING id INTO new_id;

  -- Log activity
  PERFORM app_log_activity(
    v_org,
    'collaborator_invited',
    'show_collaborator',
    new_id,
    jsonb_build_object('email', p_email, 'role', p_role, 'show_id', p_show_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'collaborator_id', new_id,
    'message', format('Invited %s as %s', p_email, p_role),
    'remaining_invites', (v_limit_check->>'remaining')::int - 1
  );
END;
$$;

-- =====================================
-- 8. RLS POLICIES FOR ADMIN FUNCTIONS
-- =====================================
-- Allow admins to read all subscriptions (for support)
CREATE POLICY admin_org_subscriptions_select ON org_subscriptions FOR SELECT
  USING (is_supabase_admin());

CREATE POLICY admin_org_feature_overrides_all ON org_feature_overrides FOR ALL
  USING (is_supabase_admin());

-- =====================================
-- 9. SUBSCRIPTION EXPIRY WARNINGS
-- =====================================
-- View for orgs that need attention
CREATE OR REPLACE VIEW orgs_requiring_attention AS
SELECT 
  o.id,
  o.name,
  o.slug,
  s.status,
  s.plan_id,
  s.current_period_end,
  (org_subscription_status(o.id)->>'days_until_expiry')::int as days_until_expiry,
  (org_subscription_status(o.id)->>'requires_immediate_action')::boolean as requires_immediate_action,
  u.members_used,
  u.collaborators_used,
  u.artists_used
FROM organizations o
JOIN org_subscriptions s ON s.org_id = o.id
LEFT JOIN org_seat_usage u ON u.org_id = o.id
WHERE 
  s.status IN ('past_due', 'trialing')
  OR (s.status = 'active' AND s.current_period_end <= now() + interval '7 days')
ORDER BY 
  CASE 
    WHEN s.status = 'past_due' THEN 1
    WHEN s.status = 'trialing' THEN 2
    ELSE 3
  END,
  s.current_period_end ASC;

-- Enable RLS on the view
ALTER VIEW orgs_requiring_attention SET (security_invoker = true);

-- =====================================
-- 10. SCHEDULED DOWNGRADE LOGGING
-- =====================================
-- Create a log table for downgrade actions
CREATE TABLE IF NOT EXISTS billing_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  triggered_by text, -- 'auto_scheduler', 'admin', 'user'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_actions_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all billing action logs
CREATE POLICY admin_billing_actions_log_select ON billing_actions_log FOR SELECT
  USING (is_supabase_admin());

-- Org members can read their org's billing actions
CREATE POLICY org_billing_actions_log_select ON billing_actions_log FOR SELECT
  USING (is_org_member(org_id));